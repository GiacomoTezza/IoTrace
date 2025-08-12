import time
from tracelet.sbom.generator import get_sbom
from tracelet.crypto.signer import sign_sbom
from tracelet.mqtt.client import publish_signed_sbom

def run(interval):
    while True:
        sbom = get_sbom()
        signed = sign_sbom(sbom)
        publish_signed_sbom(signed)
        print(f"\n[✓] SBOM published successfully at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[*] Waiting for {interval} seconds before the next publication...\n")
        time.sleep(interval)
