import time
from tracelet.sbom.generator import get_sbom
from tracelet.crypto.signer import sign_sbom
from tracelet.mqtt.client import publish_signed_sbom

def run():
    sbom = get_sbom()
    signed = sign_sbom(sbom)
    publish_signed_sbom(signed)
