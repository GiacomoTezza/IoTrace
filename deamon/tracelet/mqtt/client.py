import json
import ssl
import paho.mqtt.client as mqtt

from pathlib import Path
from cryptography import x509
from cryptography.hazmat.backends import default_backend


MQTT_HOST = "emqx"
MQTT_PORT = 8883
MQTT_TOPIC = "device/sbom/"

TLS_CA_CERT = "certs/ca.crt"
TLS_CLIENT_CERT = "certs/device-fullchain.crt"
TLS_CLIENT_KEY = "certs/device-key.pem"


def extract_cn(cert_path):
    with open(cert_path, "rb") as f:
        cert = x509.load_pem_x509_certificate(f.read(), default_backend())
    return cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value


def publish_signed_sbom(data):
    client_id = extract_cn(TLS_CLIENT_CERT)
    print(f"[*] Connecting to MQTT broker as client ID: {client_id}")
    client = mqtt.Client(client_id=client_id)

    client.tls_set(
        ca_certs=TLS_CA_CERT,
        certfile=TLS_CLIENT_CERT,
        keyfile=TLS_CLIENT_KEY,
        tls_version=ssl.PROTOCOL_TLSv1_2,
        cert_reqs=ssl.CERT_REQUIRED
    )

    client.tls_insecure_set(False)  # Ensure server certificate is verified

    client.connect(MQTT_HOST, MQTT_PORT)
    print(f"[✓] Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
    payload = json.dumps(data)
    print(f"[*] Publishing data to topic {MQTT_TOPIC + client_id}: {data['sbom']['metadata']}")
    client.publish(MQTT_TOPIC + client_id, payload)
    print("[✓] Data published successfully.")
    client.disconnect()
    print("[✓] Disconnected from MQTT broker.")
