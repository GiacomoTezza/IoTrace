import time
from random import randint
from tracelet.sbom.generator import get_sbom
from tracelet.crypto.signer import sign_sbom
from tracelet.mqtt.client import publish_signed_sbom

def routine(filename):
        sbom = get_sbom(filename)
        signed = sign_sbom(sbom)
        publish_signed_sbom(signed)
        print(f"\n[✓] SBOM published successfully at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        interval = randint(30, 60 * 2)
        print(f"[*] Waiting for {interval} seconds before the next publication...\n")
        time.sleep(interval)

def run():
    versions = ["bom.1.2.json", "bom.1.3.json", "bom.1.4.json"]
    for version in versions:
        routine(version)
