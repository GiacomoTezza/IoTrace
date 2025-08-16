import json, ssl, time, logging
import paho.mqtt.client as mqtt

from pathlib import Path
from cryptography import x509
from cryptography.hazmat.backends import default_backend

logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


MQTT_HOST = "emqx"
MQTT_PORT = 8883
MQTT_TOPIC = "/device/sbom/"

TLS_CA_CERT = "certs/ca.crt"
TLS_CLIENT_CERT = "certs/device-fullchain.crt"
TLS_CLIENT_KEY = "certs/device-key.pem"


def extract_cn(cert_path):
    with open(cert_path, "rb") as f:
        cert = x509.load_pem_x509_certificate(f.read(), default_backend())
    return cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value


def publish_signed_sbom(data, qos=1):
    client_id = extract_cn(TLS_CLIENT_CERT)
    print(f"[*] Connecting to MQTT broker as client ID: {client_id}")
    client = mqtt.Client(client_id=client_id, clean_session=True)
    client.username_pw_set(username=client_id, password=None)

    def on_connect(c, userdata, flags, rc):
        print("[mqtt] on_connect rc=", rc, "flags=", flags)

    def on_disconnect(c, userdata, rc):
        print("[mqtt] on_disconnect rc=", rc)

    def on_publish(c, userdata, mid):
        print("[mqtt] on_publish mid=", mid)
    
    def on_log(client, userdata, level, buf):
        print("[mqtt log]", level, buf)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish = on_publish
    client.on_log = on_log

    client.tls_set(
        ca_certs=TLS_CA_CERT,
        certfile=TLS_CLIENT_CERT,
        keyfile=TLS_CLIENT_KEY,
        tls_version=ssl.PROTOCOL_TLS_CLIENT,
        cert_reqs=ssl.CERT_REQUIRED
    )

    client.tls_insecure_set(False)  # Ensure server certificate is verified

    client.loop_start()  # Start the loop to process network events
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    except Exception as e:
        print(f"[✗] Failed to connect to MQTT broker: {e}")
        client.loop_stop()
        return False

    time.sleep(1)  # Allow time for connection to establish
    print(f"[✓] Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")

    topic = MQTT_TOPIC + client_id
    payload = json.dumps(data)
    print(f"[*] Publishing to topic '{topic}' (len={len(payload)} bytes), qos={qos}")

    info = client.publish(topic, payload, qos=qos)
    if info.rc != mqtt.MQTT_ERR_SUCCESS:
        print(f"[✗] Failed to publish (rc): {info.rc}")
        client.disconnect()
        client.loop_stop()
        return False
    print("[mqtt] publish() returned rc, mid:", info.rc, info.mid)

    ok = info.wait_for_publish()
    if not ok:
        print("[✗] Publish timed out.")
        client.disconnect()
        client.loop_stop()
        return False
    print("[mqtt] wait_for_publish result:", ok)


    print("[✓] Data published successfully.")
    client.disconnect()
    client.loop_stop()
    print("[✓] Disconnected from MQTT broker.")
    return True
