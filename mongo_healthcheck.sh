#!/bin/bash

USER=$(cat /run/secrets/mongo_root_user)
PASS=$(cat /run/secrets/mongo_root_pass)

# sleep 5

mongosh --host localhost \
      --username "$USER" \
      --password "$PASS" \
      --authenticationDatabase admin \
      --eval "db.adminCommand('ping')" \
      --quiet
