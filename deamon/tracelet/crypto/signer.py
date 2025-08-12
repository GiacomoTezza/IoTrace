from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
import json
import base64

CERT_PATH = "certs/device-cert.pem"
KEY_PATH = "certs/device-key.pem"

def sign_sbom(sbom_dict):
    sbom_bytes = json.dumps(sbom_dict, sort_keys=True).encode("utf-8")
    with open(KEY_PATH, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )

    signature = private_key.sign(
        sbom_bytes,
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    print("[✓] SBOM signed successfully.")

    return {
        "sbom": sbom_dict,
        "signature": base64.b64encode(signature).decode(),
        "cert": open(CERT_PATH).read()
    }
