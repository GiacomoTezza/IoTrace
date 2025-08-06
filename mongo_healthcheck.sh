#!/bin/bash

USER=$(cat /run/secrets/mongo_root_user)
PASS=$(cat /run/secrets/mongo_root_pass)

# sleep 5

mongosh --host mongo \
    --username "$USER" \
    --password "$PASS" \
    --authenticationDatabase admin \
    --tls \
    --tlsCAFile /certs/ca.crt \
    --tlsCertificateKeyFile /mongo-healthcheck.pem \
    --eval "db.adminCommand('ping')" \
    --quiet
