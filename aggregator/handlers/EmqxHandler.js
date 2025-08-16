const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const crypto = require('crypto');
const forge = require('node-forge');
const stringify = require('json-stable-stringify');

const Sbom = require('../db/sbom').SbomMessage;
const Device = require('../db/device').Device;
const Nonce = require('../db/nonce').Nonce;



// --- Config ---
const brokerUrl = process.env.MQTT_URL || 'mqtts://emqx:8883';
const certDir = process.env.CERT_DIR || '/app/certs';
const CA_BUNDLE_PATH = process.env.TRUSTED_CA_DIR || path.join(certDir, 'ca.crt'); // root+intermediate
const TOPIC = process.env.MQTT_SUSBSCRIBE_TOPIC || '/device/sbom/#';
const CLIENT_ID = process.env.MQTT_USERNAME || 'aggregator';
const ALLOWED_SKEW_SEC = parseInt(process.env.SBOM_ALLOWED_SKEW_SEC || '300', 10); // 5 min
const REQUIRE_CN_MATCH_TOPIC = (process.env.REQUIRE_CN_MATCH_TOPIC || 'true') === 'true';



// --- Helpers ---
function pemSplitAll(pem) {
    const regex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
    return (pem.match(regex) || []);
}

function loadCABundle() {
    const pem = fs.readFileSync(CA_BUNDLE_PATH, 'utf8');
    const certs = pemSplitAll(pem).map(p => forge.pki.certificateFromPem(p));
    if (!certs.length) throw new Error(`No certs found in CA bundle ${CA_BUNDLE_PATH}`);
    return forge.pki.createCaStore(certs);
}

const CA_STORE = loadCABundle();

/**
 * Parse a PEM string that may contain one cert (leaf) or multiple (leaf + intermediates).
 * Returns:
 *  { chainPems: [pemStr,...], chainForge: [forgeCert,...], leafPem: pemStr, leafForge }
 */
function parseCertChain(pemCombined) {
    const pems = pemSplitAll(pemCombined);
    if (!pems.length) throw new Error('No PEM certificates found in cert field');
    const chainForge = pems.map(p => forge.pki.certificateFromPem(p));
    const leafForge = chainForge[0];
    const leafPem = pems[0];
    // compute SHA256 fingerprint of leaf DER
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(leafForge)).getBytes();
    const fp = crypto.createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');
    const subjectCN = (leafForge.subject.getField('CN') || {}).value || null;
    const issuerCN = (leafForge.issuer.getField('CN') || {}).value || null;
    const serial = leafForge.serialNumber;
    return { chainPems: pems, chainForge, leafForge, leafPem, subjectCN, issuerCN, serialNumber: serial, fingerprint256: fp };
}

/**
 * Verify a certificate chain (leaf-first array of forge certs) against the CA store.
 * Returns { ok: true } or { ok: false, reason: '...' }
 */
function verifyChain(chainForge) {
    try {
        forge.pki.verifyCertificateChain(CA_STORE, chainForge, function(vfd, depth, chain) {
            // vfd === true if OK; otherwise vfd is an object describing failure
            if (vfd === true) return true;
            throw new Error('chain verify callback failure: ' + JSON.stringify(vfd));
        });

        // Check validity dates for the leaf explicitly
        const leaf = chainForge[0];
        const now = new Date();
        if (now < leaf.validity.notBefore) return { ok: false, reason: 'leaf not yet valid' };
        if (now > leaf.validity.notAfter) return { ok: false, reason: 'leaf expired' };

        return { ok: true };
    } catch (e) {
        return { ok: false, reason: e.message || String(e) };
    }
}

const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// Mirrors Python json.dumps(..., sort_keys=True, separators=(',', ':'))
const canonicalize = (obj) => stringify(obj, { space: '' });

async function rememberNonce(deviceId, nonce, ts) {
    try {
        await Nonce.create({ deviceId, nonce, ts });
        return { ok: true };
    } catch (e) {
        if (e && e.code === 11000) return { ok: false, reason: 'replay (nonce already used)' };
        return { ok: false, reason: e.message || String(e) };
    }
}



// --- MQTT Client Setup ---
const client = mqtt.connect(brokerUrl, {
    key: fs.readFileSync(path.join(certDir, 'aggregator.key')),              // private key
    cert: fs.readFileSync(path.join(certDir, 'aggregator-fullchain.crt')),  // leaf + intermediate(s)
    ca: fs.readFileSync(path.join(certDir, 'ca.crt')),                      // CA bundle (must include IoTrace root)
    rejectUnauthorized: true,
    clientId: CLIENT_ID,
    username: CLIENT_ID,
    password: process.env.MQTT_PASSWORD,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 4 * 1000,
});


// client.on('message', (topic, message) => {
//     // Handle incoming messages
//     console.log(`Received message on topic ${topic}:`);
//
//     // Perform all the necessary security checks and validation. It is a JSON formatted as:
//     // {
//     //     "sbom": sbom_dict,
//     //     "signature": base64.b64encode(signature).decode(),
//     //     "cert": open(CERT_PATH).read()
//     // }
//     //
//     // Where sbom is a CycloneDX SBOM, signature is the signature of the SBOM, and cert is the certificate used to sign the SBOM.
//
//     try {
//         const data = JSON.parse(message.toString());
//
//         if (!data.sbom || !data.signature || !data.cert) {
//             console.error('Invalid message format.');
//             return;
//         }
//
//         let sbom = data.sbom;
//         let signature = data.signature;
//         let cert = data.cert;
//
//     });

client.on('connect', () => {
    console.log('[EMQX] Connected. Subscribing to', TOPIC);
    client.subscribe(TOPIC, { qos: 1 }, (err, granted) => {
        if (err) console.error('[EMQX] Subscribe error:', err);
        else console.log('[EMQX] Subscribed:', granted);
    });
});

client.on('message', async (topic, payload, packet) => {
    console.log(`[EMQX] Msg on ${topic} (${payload?.length} bytes)`);

    let parsed;
    try {
        parsed = JSON.parse(payload.toString('utf8'));
    } catch (e) {
        console.error('[SBOM] Invalid JSON:', e.message);
        return;
    }

    const { sbom, signature, cert, ts, timestamp, nonce, sbom_sha256 } = parsed;
    const tsValue = ts || timestamp;
    if (!sbom || !signature || !cert || !tsValue || !nonce || !sbom_sha256) {
        console.error('[SBOM] Missing required fields {sbom, signature, cert, ts/timestamp, nonce, sbom_sha256}');
        return;
    }

    // Derive deviceId from topic: /device/sbom/<deviceId>
    const parts = topic.split('/').filter(Boolean);
    const deviceIdFromTopic = parts[parts.length - 1];

    // Canonicalize and build the signing string
    let sbomJson;
    try {
        sbomJson = canonicalize(sbom); // string
    } catch (e) {
        console.error('[SBOM] canonicalization error:', e.message);
        await persist(false, 'canonicalization', { topic, sbom, packet });
        return;
    }
    const canonicalBuf = Buffer.from(sbomJson, 'utf8');
    const computedSbomHash = sha256Hex(canonicalBuf);

    // Parse signer certificate
    let signerInfo;
    try {
        signerInfo = parseCertChain(cert);
    } catch (e) {
        console.error('[SBOM] Cert parse error:', e.message);
        await persist(false, 'invalid cert', {
            topic, deviceId: deviceIdFromTopic, tsValue, nonce, sbom, sbomJson, computedSbomHash,
            signatureB64: signature, packet
        });
        return;
    }

    // Enforce CN matches topic deviceId
    if (REQUIRE_CN_MATCH_TOPIC && signerInfo.subjectCN && deviceIdFromTopic && signerInfo.subjectCN !== deviceIdFromTopic) {
        const reason = `CN mismatch: cert CN '${signerInfo.subjectCN}' != topic deviceId '${deviceIdFromTopic}'`;
        console.error('[SBOM]', reason);
        await persist(false, reason, {
            topic, deviceId: deviceIdFromTopic, tsValue, nonce, sbom, sbomJson, computedSbomHash,
            signatureB64: signature, packet, signerInfo
        });
        return;
    }

    // Verify certificate chain (leaf + intermediates)
    const chainVerifyResult = verifyChain(signerInfo.chainForge);
    if (!chainVerifyResult.ok) {
        console.error('[SBOM] Certificate chain verification failed:', chainVerifyResult.reason);
        await persist(false, 'chain', { topic, deviceId: deviceIdFromTopic, signerInfo, chainVerifyResult });
        return;
    }

    // Timestamp skew check
    let tsDate;
    try {
        tsDate = new Date(typeof tsValue === 'number' ? tsValue : tsValue);
        if (isNaN(tsDate.getTime())) throw new Error('invalid timestamp');
    } catch (e) {
        console.error('[SBOM] invalid timestamp format:', e.message);
        await persist(false, 'timestamp', { topic, deviceId: deviceIdFromTopic, tsValue });
        return;
    }
    const skewOk = Math.abs((Date.now() - tsDate.getTime()) / 1000) <= ALLOWED_SKEW_SEC;

    // Replay (nonce) check - store unique nonce per device
    const replay = await rememberNonce(signerInfo.subjectCN || deviceIdFromTopic, String(nonce), tsDate);

    // Signature verification (the signer signs the canonicalized SBOM bytes)
    let sigOk = false;
    try {
        const sigBuf = Buffer.from(signature, 'base64');

        // Use leaf PEM as public key
        const leafPem = signerInfo.leafPem;

        // Verify using PKCS#1 v1.5 + SHA256 (matches Python signer)
        sigOk = crypto.verify('sha256', canonicalBuf, { key: leafPem, padding: crypto.constants.RSA_PKCS1_PADDING }, sigBuf);

        // NOTE: if signature fails, log computed hash and optionally sbom_sha256 sent by signer
        if (!sigOk) {
            console.warn('[SBOM] signature mismatch. computed sbom SHA256:', computedSbomHash, ' signers sbom_sha256:', sbom_sha256 || 'none');
        }
    } catch (e) {
        console.error('[SBOM] Signature verification error:', e.message);
        sigOk = false;
    }

    const allOk = chainVerifyResult.ok && sigOk && skewOk && replay.ok;

    // Persist result and metadata
    await persist(allOk,
        (!chainVerifyResult.ok && 'chain') || (!sigOk && 'signature') || (!skewOk && 'skew') || (!replay.ok && 'replay') || null,
        {
            topic,
            deviceId: deviceIdFromTopic,
            tsDate,
            tsValue,
            nonce,
            sbom,
            sbomJson,
            sbomHash: computedSbomHash,
            sizeBytes: Buffer.byteLength(sbomJson, 'utf8'),
            signatureB64: signature,
            signatureAlg: 'RSASSA-PKCS1-v1_5-SHA256',
            signerInfo,
            chain: chainVerifyResult,
            sigOk,
            skewOk,
            replay,
            packet
        }
    );

    if (allOk) {
        console.log(`[SBOM] ✅ Verified & saved for device ${deviceIdFromTopic} (CN=${signerInfo.subjectCN})`);
    } else {
        console.warn(`[SBOM] ❌ Verification failed (${topic})`);
        console.log(`  - Chain OK: ${chainVerifyResult.ok} (${chainVerifyResult.reason || 'none'})`);
        console.log(`  - Signature OK: ${sigOk}`);
        console.log(`  - Timestamp skew OK: ${skewOk}`);
        console.log(`  - Replay OK: ${replay.ok} (${replay.reason || 'none'})`);
        console.log(`  - Reason: ${!chainVerifyResult.ok ? chainVerifyResult.reason : !sigOk ? 'invalid signature' : !skewOk ? 'timestamp skew' : !replay.ok ? replay.reason : 'unknown'}`);
    }
});


async function persist(ok, reason, ctx) {
    try {
        const {
            topic, deviceId, tsDate, tsValue, nonce, sbom, sbomJson, sbomHash, sizeBytes,
            signatureB64, signatureAlg, signerInfo, chain, sigOk, skewOk, replay, packet
        } = ctx;

        // Upsert device last seen
        const deviceIdEff = signerInfo?.subjectCN || deviceId;
        if (deviceIdEff) {
            await Device.findOneAndUpdate(
                { deviceId: deviceIdEff },
                {
                    $set: {
                        lastSeen: new Date(),
                        lastSeenTopic: topic,
                        lastCertFingerprint256: signerInfo?.fingerprint256,
                    }
                },
                { upsert: true, new: true }
            );
        }

        await Sbom.create({
            topic,
            deviceId: deviceIdEff || deviceId,
            receivedAt: new Date(),
            ts: tsDate || new Date(tsValue),
            nonce: String(nonce),

            sbom,
            sbomHash: sbomHash || sha256Hex(Buffer.from(sbomJson || '', 'utf8')),
            sizeBytes: sizeBytes || Buffer.byteLength(sbomJson || '', 'utf8'),

            signatureB64,
            signatureAlg,

            signerCertPem: signerInfo ? signerInfo.chainPems.join('\n') : undefined,
            signer: signerInfo ? {
                subject: signerInfo.leafForge.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(','),
                subjectCN: signerInfo.subjectCN,
                issuer: signerInfo.issuerCN,
                serialNumber: signerInfo.serialNumber,
                notBefore: signerInfo.leafForge.validity.notBefore,
                notAfter: signerInfo.leafForge.validity.notAfter,
                fingerprint256: signerInfo.fingerprint256,
            } : undefined,

            verification: {
                chainOk: !!(chain && chain.ok),
                signatureOk: !!sigOk,
                timestampSkewOk: !!skewOk,
                replayOk: !!(replay && replay.ok),
                reason: ok ? undefined : (reason || (chain && !chain.ok && chain.reason) || (replay && !replay.ok && replay.reason) || 'unknown'),
            },

            emqx: {
                qos: packet?.qos,
                retain: packet?.retain,
                mid: packet?.messageId,
            }
        });
    } catch (e) {
        console.error('[SBOM] Persist error:', e);
    }
}


client.on('error', (err) => {
    console.error('[EMQX] Client error:', err);
});

client.on('close', () => {
    console.log('[EMQX] Disconnected');
});

client.on('reconnect', () => {
    console.log('[EMQX] Reconnecting…');
});

module.exports = client;

