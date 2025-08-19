const mongoose = require('mongoose');
const crypto = require('crypto');
const stableStringify = require('json-stable-stringify');
const diffLib = require('deep-diff').diff;
const deepEqual = require('fast-deep-equal');

const { SbomMessage } = require('../db/sbom');
const { Device } = require('../db/device');
const NotFoundException = require('../exceptions/NotFoundException');

/**
 * Compute sha256 hex of canonical sbom JSON.
 * We assume the producer used the agreed canonicalization. If canonical bytes are provided use them.
 */
function computeSbomHash(sbomObj, canonicalStr) {
    if (canonicalStr) {
        return crypto.createHash('sha256').update(Buffer.from(canonicalStr, 'utf8')).digest('hex');
    }
    // fallback: stable stringify (must match device canonicalization)
    const bytes = Buffer.from(stableStringify(sbomObj, { space: '' }), 'utf8');
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

/**
 * Generic saveReceived: persists validated SBOM and updates Device state.
 * sbomPayload: object produced by EmqxHandler.persist ctx. It must contain at least:
 *  - deviceId (string)
 *  - topic (string)
 *  - sbom (object)                 // the actual SBOM JSON
 *  - signatureB64 (string)
 *  - signerInfo (optional object)  // the result of parseCertChain
 *  - verification (optional object) // { chainOk, signatureOk, timestampSkewOk, replayOk, reason }
 *  - tsDate / tsValue / nonce
 *  - sbomJson (canonical string) optional — if provided we use it for hash/size
 *  - sbomHash, sizeBytes optional
 *  - emqx meta (packet) optional
 *  - ok boolean optional - top-level result (but we compute verified from verification if present)
 */
async function saveReceived(sbomPayload) {
    // const session = await mongoose.startSession();
    let insertedDoc;
    try {
        // await session.withTransaction(async () => {
        // Basic normalization / defensive defaults
        const payload = Object.assign({}, sbomPayload);

        // Resolve effective device id (prefer signer CN if present)
        const deviceIdEff = (payload.signerInfo && payload.signerInfo.subjectCN) || payload.deviceId || null;
        if (!deviceIdEff) throw new Error('saveReceived: deviceId not provided');

        // build verification summary: prefer explicit payload.verification, otherwise build from flags
        let verification = payload.verification;
        if (!verification) {
            verification = {
                chainOk: !!payload.chainOk,
                signatureOk: !!payload.sigOk,
                timestampSkewOk: !!payload.skewOk,
                replayOk: !!(payload.replay && payload.replay.ok),
                reason: payload.reason || undefined
            };
        }

        // top-level verified boolean: all relevant checks must be true
        const verified = !!(verification.chainOk && verification.signatureOk && verification.timestampSkewOk && verification.replayOk);

        // compute sbomHash and sizeBytes if not provided
        const canonicalStr = payload.sbomJson || undefined;
        if (!payload.sbomHash) {
            payload.sbomHash = computeSbomHash(payload.sbom, canonicalStr);
        }
        if (!payload.sizeBytes) {
            // if canonicalStr exists, use its byte length; else stringify
            payload.sizeBytes = Buffer.byteLength(canonicalStr || JSON.stringify(payload.sbom || {}), 'utf8');
        }

        // Prepare doc to insert
        const docToInsert = {
            topic: payload.topic,
            deviceId: deviceIdEff,
            receivedAt: payload.receivedAt || new Date(),
            ts: payload.tsDate || (payload.tsValue ? new Date(payload.tsValue) : new Date()),
            nonce: String(payload.nonce || ''),

            sbom: payload.sbom,
            sbomHash: payload.sbomHash,
            sizeBytes: payload.sizeBytes,

            signatureB64: payload.signatureB64,
            signatureAlg: payload.signatureAlg || payload.signatureAlg || 'RSASSA-PKCS1-v1_5-SHA256',

            signerCertPem: payload.signerInfo ? (payload.signerInfo.chainPems ? payload.signerInfo.chainPems.join('\n') : payload.signerCertPem) : payload.signerCertPem,
            signer: payload.signerInfo ? {
                subject: payload.signerInfo.leafForge ? payload.signerInfo.leafForge.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(',') : undefined,
                subjectCN: payload.signerInfo ? payload.signerInfo.subjectCN : undefined,
                issuer: payload.signerInfo ? payload.signerInfo.issuerCN : undefined,
                serialNumber: payload.signerInfo ? payload.signerInfo.serialNumber : undefined,
                notBefore: payload.signerInfo && payload.signerInfo.leafForge ? payload.signerInfo.leafForge.validity.notBefore : undefined,
                notAfter: payload.signerInfo && payload.signerInfo.leafForge ? payload.signerInfo.leafForge.validity.notAfter : undefined,
                fingerprint256: payload.signerInfo ? payload.signerInfo.fingerprint256 : undefined
            } : undefined,

            verification: verification,
            verified: verified,

            emqx: {
                qos: payload.packet?.qos,
                retain: payload.packet?.retain,
                mid: payload.packet?.messageId
            }
        };

        // Insert SBOM history doc
        // const inserted = await SbomMessage.create([docToInsert], { session });
        const inserted = await SbomMessage.create(docToInsert);
        insertedDoc = inserted;

        // Upsert Device doc with current pointer and summary
        await Device.findOneAndUpdate(
            { deviceId: deviceIdEff },
            {
                $set: {
                    currentSbomId: insertedDoc._id,
                    isCurrentValid: verified,
                    lastSeen: new Date(),
                    lastSeenTopic: payload.topic,
                    lastCertFingerprint256: payload.signerInfo ? payload.signerInfo.fingerprint256 : undefined
                }
            },
            // { upsert: true, new: true, session }
            { upsert: true, new: true }
        );
        // });

        return insertedDoc;
    } catch (err) {
        console.error('[SbomHandler] saveReceived failed:', err);
        throw err;
    } finally {
        // session.endSession();
    }
}

/**
 * Get current SBOM for device
 */
async function getCurrent(deviceId) {
    const dev = await Device.findOne({ _id: deviceId }).lean();
    if (!dev || !dev.currentSbomId) throw new NotFoundException(`No current SBOM for device ${deviceId}`);
    const sbom = await SbomMessage.findById(dev.currentSbomId).lean();
    if (!sbom) throw new NotFoundException(`SBOM ${dev.currentSbomId} not found`);
    // short history
    const history = await SbomMessage.find({ deviceId: dev.deviceId }).sort({ receivedAt: -1 }).select('_id receivedAt verified').lean();
    return { sbom, history };
}

async function getById(sbomId) {
    const sbom = await SbomMessage.findById(sbomId).lean();
    if (!sbom) throw new NotFoundException(`SBOM ${sbomId} not found`);
    return sbom;
}

/**
 * Compare copied from previous implementation (CycloneDX-aware)
 */
async function compare(a, b) {
    // a and b can be ids or raw sbom objects
    async function resolve(v) {
        if (!v) return null;
        if (typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v)) {
            const doc = await SbomMessage.findById(v).lean();
            if (!doc) throw new NotFoundException(`SBOM ${v} not found`);
            return doc.sbom;
        } else if (v && v._id) {
            return v.sbom;
        } else {
            return v;
        }
    }
    const sa = await resolve(a);
    const sb = await resolve(b);
    if (!sa || !sb) throw new Error('Both sboms required');

    if (Array.isArray(sa.components) && Array.isArray(sb.components)) {
        const mapComp = (arr) => {
            const m = new Map();
            for (const c of arr) {
                const key = (c.name || c.purl || c.bomRef || JSON.stringify(c)).toString();
                m.set(key, c);
            }
            return m;
        };
        const ma = mapComp(sa.components);
        const mb = mapComp(sb.components);

        const added = [], removed = [], modified = [];

        for (const [k, compB] of mb.entries()) {
            if (!ma.has(k)) added.push(compB);
            else if (!deepEqual(ma.get(k), compB)) modified.push({ before: ma.get(k), after: compB });
        }
        for (const [k, compA] of ma.entries()) if (!mb.has(k)) removed.push(compA);

        return { kind: 'components', added, removed, modified };
    }

    return { kind: 'json-diff', diff: diffLib(sa, sb) || [] };
}

module.exports = {
    saveReceived,
    getCurrent,
    getById,
    compare
};
