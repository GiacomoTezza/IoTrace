#!/bin/bash

set -euo pipefail

# Directory structure
cert_dir="./certs"
ca_dir="$cert_dir/ca"
services=(emqx aggregator mongodb)

# Create directories
mkdir -p "$ca_dir"
for service in "${services[@]}"; do
    mkdir -p "$cert_dir/$service"
done

# Check the group 'certgroup' exists, if not create it with GID 1020
if ! getent group certgroup > /dev/null; then
    echo "Creating group 'certgroup' with GID 1020..."
    sudo groupadd -g 1020 certgroup
else
    echo "Group 'certgroup' already exists."
fi

# --- Helper Functions ---

generate_ca() {
    echo "🔧 Generating CA..."

    openssl genpkey -algorithm RSA -out "$ca_dir/ca.key" -pkeyopt rsa_keygen_bits:4096
    chmod 600 "$ca_dir/ca.key"

    openssl req -x509 -new -nodes -key "$ca_dir/ca.key" -days 3650 \
        -subj "/CN=LocalDev-CA" -out "$ca_dir/ca.crt" \
        -extensions v3_ca -config openssl-ca.cnf

    echo "✅ CA certificate created."
}

generate_cert_for_service() {
    local service="$1"
    local domain="$2"
    local dir="$cert_dir/$service"

    echo "🔧 Generating certificate for $service ($domain)..."

    mkdir -p "$dir"
    openssl genpkey -algorithm RSA -out "$dir/$service.key" -pkeyopt rsa_keygen_bits:2048
    chmod 600 "$dir/$service.key"

    # Choose appropriate extendedKeyUsage
    local eku="serverAuth"
    if [[ "$service" == "aggregator" || "$service" == "mongo-healthcheck" ]]; then
        eku="clientAuth"
    fi

    # Create a config file for SAN
    cat > "$dir/openssl.cnf" <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[dn]
CN = $domain

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $domain
DNS.2 = localhost

[ext]
subjectAltName = @alt_names
extendedKeyUsage = $eku
keyUsage = digitalSignature, keyEncipherment
EOF

    # Generate CSR
    openssl req -new -key "$dir/$service.key" \
        -out "$dir/$service.csr" -config "$dir/openssl.cnf"

    # Sign the CSR with the CA
    openssl x509 -req -in "$dir/$service.csr" \
        -CA "$ca_dir/ca.crt" -CAkey "$ca_dir/ca.key" -CAcreateserial \
        -out "$dir/$service.crt" -days 365 -extensions ext -extfile "$dir/openssl.cnf"

    if [[ "$service" == "aggregator" ]]; then
        cp "$ca_dir/ca.crt" "$dir/ca.crt"
        mv "$dir/${service}.key" "$dir/privkey.pem"
        cat "$dir/${service}.crt" "$ca_dir/ca.crt" > "$dir/fullchain.pem"
        chmod 640 "$dir/privkey.pem"
        chmod 644 "$dir/fullchain.pem"
        chmod 644 "$dir/ca.crt"
        sudo chgrp certgroup "$dir/privkey.pem" "$dir/fullchain.pem" "$dir/ca.crt"
        echo "✅ Aggregator: Created privkey.pem and fullchain.pem"
    fi

    if [[ "$service" == "mongodb" ]]; then
        cat "$dir/mongodb.key" "$dir/mongodb.crt" > "$dir/mongodb.pem"
        cp "$ca_dir/ca.crt" "$dir/ca.crt"
        echo "✅ MongoDB: Created combined PEM (mongodb.pem)"
    fi

    if [[ "$service" == "mongo-healthcheck" ]]; then
        cat "$dir/mongo-healthcheck.key" "$dir/mongo-healthcheck.crt" > "$dir/mongo-healthcheck.pem"
        cp "$ca_dir/ca.crt" "$dir/ca.crt"
        echo "✅ Mongo Healthcheck: Created mongo-healthcheck.pem"
    fi


    echo "✅ Certificate for $service generated."
}

# --- Main Execution ---

echo "🔐 Starting certificate generation..."

# Generate the root CA
generate_ca

# Generate certs for services
generate_cert_for_service "emqx" "emqx.local"
generate_cert_for_service "aggregator" "aggregator.local"
generate_cert_for_service "mongodb" "mongo"
generate_cert_for_service "mongo-healthcheck" "mongo"

echo "🎉 All certificates generated in $cert_dir/"

