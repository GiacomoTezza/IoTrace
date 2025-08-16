import json, base64, uuid, time, hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

CERT_PATH = "certs/device-cert.pem"
KEY_PATH = "certs/device-key.pem"


def canonicalize_json(obj):
    # Deterministic canonicalization matching Node stable-stringify({space:''})
    return json.dumps(obj, separators=(',', ':'), sort_keys=True, ensure_ascii=False).encode('utf-8')


def sign_sbom(sbom_dict): # sbom_dict is the SBOM JSON object (json.loads() output)
    # Add replay/freshness metadata
    meta = {
        "issued_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),  # ISO8601 UTC
        "nonce": str(uuid.uuid4())
    }

    # Attach metadata inside sbom metadata field (agreed location)
    sbom = dict(sbom_dict)  # shallow copy
    sbom_metadata = sbom.get("metadata", {})
    sbom_metadata.update(meta)
    sbom["metadata"] = sbom_metadata

    # canonicalize the SBOM (important - same canonicalization on aggregator verifier)
    sbom_bytes = canonicalize_json(sbom)

    # Load the private key from the PEM file
    with open(KEY_PATH, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
    # Use the same algorithm we will verify on server:
    # PKCS#1 v1.5 with SHA-256
    signature = private_key.sign(
        sbom_bytes,
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    # compute hash for storage / quick equality checks
    sbom_hash = hashlib.sha256(sbom_bytes).hexdigest()

    print("[✓] SBOM signed successfully.")

    return {
        "sbom": sbom_dict,
        "signature": base64.b64encode(signature).decode('ascii'),
        "cert": open(CERT_PATH, "rt").read(),
        "sig_alg": "RSASSA-PKCS1-v1_5-SHA256",
        "canonicalization": "json:sort_keys,separators=(',',':'),utf8",
        "ts": meta["issued_at"],
        "nonce": meta["nonce"],
        "sbom_sha256": sbom_hash
    }
