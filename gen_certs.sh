#!/bin/bash

set -euo pipefail

# Directory structure
cert_dir="./certs"
ca_dir="$cert_dir/ca"
services=(emqx aggregator frontend mongodb mongo-healthcheck)

deamon_cert_dir="./deamon/certs"
frontend_cert_dir="./frontend/certs"

# Old certs cleaning
rm -rf "$cert_dir"
rm -rf "$deamon_cert_dir"
rm -rf "$frontend_cert_dir"

# Create directories
mkdir -p "$cert_dir"
mkdir -p "$ca_dir"
mkdir -p "$deamon_cert_dir"
mkdir -p "$frontend_cert_dir"
for service in "${services[@]}"; do
    mkdir -p "$cert_dir/$service"
done

# Ensure group 'certgroup' exists
if ! getent group certgroup > /dev/null; then
    echo "Creating group 'certgroup' with GID 1020..."
    sudo groupadd -g 1020 certgroup
else
    echo "Group 'certgroup' already exists."
fi

# --- Helper Functions ---
generate_root_ca() {
    echo "🔧 Generating Root CA (offline protect key)..."
    openssl genpkey -algorithm RSA -out "$ca_dir/ca-root.key" -pkeyopt rsa_keygen_bits:4096
    chmod 600 "$ca_dir/ca-root.key"

    openssl req -x509 -new -nodes -key "$ca_dir/ca-root.key" -days 3650 \
        -subj "/CN=IoTrace-CA/" -out "$ca_dir/ca-root.crt" \
        -extensions v3_ca -config openssl-ca.cnf

    echo "✅ Root CA created."
}

generate_intermediate_ca() {
    echo "🔧 Generating Intermediate CA..."
    openssl genpkey -algorithm RSA -out "$ca_dir/ca-int.key" -pkeyopt rsa_keygen_bits:4096
    chmod 600 "$ca_dir/ca-int.key"

    # Create a config file for SAN
    cat > "$ca_dir/openssl-int.cnf" <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[dn]
CN = IoTrace-IntermediateCA

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1

[v3_intermediate_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, cRLSign, keyCertSign
extendedKeyUsage = serverAuth, clientAuth
EOF

    openssl req -new -key "$ca_dir/ca-int.key" \
        -out "$ca_dir/ca-int.csr" -config "$ca_dir/openssl-int.cnf"

    openssl x509 -req -in "$ca_dir/ca-int.csr" \
        -CA "$ca_dir/ca-root.crt" -CAkey "$ca_dir/ca-root.key" -CAcreateserial \
        -out "$ca_dir/ca-int.crt" -days 1825 \
        -extensions v3_intermediate_ca -extfile "$ca_dir/openssl-int.cnf"

    # Build CA chain: intermediate + root
    cat "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$ca_dir/ca-chain.crt"
    chmod 644 "$ca_dir/ca-chain.crt"
    echo "✅ Intermediate CA created and chain built."
}

generate_cert_for_service() {
    local service="$1"
    local domain="$2"
    local dir="$cert_dir/$service"

    echo "🔧 Generating certificate for $service ($domain)..."
    openssl genpkey -algorithm RSA -out "$dir/$service.key" -pkeyopt rsa_keygen_bits:2048
    chmod 600 "$dir/$service.key"

    # Determine usage
    local ext_section="server_cert"
    if [[ "$service" =~ (mongo-healthcheck) ]]; then
        ext_section="client_cert"
    fi

    # Create a config file for SAN
    cat > "$dir/openssl-pki.cnf" <<EOF
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
IP.1 = 127.0.0.1

[server_cert]
basicConstraints = CA:FALSE
subjectAltName = @alt_names
extendedKeyUsage = serverAuth, clientAuth
keyUsage = digitalSignature, keyEncipherment

[client_cert]
basicConstraints = CA:FALSE
subjectAltName = @alt_names
extendedKeyUsage = clientAuth
keyUsage = digitalSignature, keyEncipherment
EOF

    # Create CSR
    openssl req -new -key "$dir/$service.key" \
        -config "$dir/openssl-pki.cnf" \
        -out "$dir/$service.csr"

    # Sign with intermediate CA
    openssl x509 -req -in "$dir/$service.csr" \
        -CA "$ca_dir/ca-int.crt" -CAkey "$ca_dir/ca-int.key" -CAcreateserial \
        -out "$dir/$service.crt" -days 365 \
        -extensions $ext_section -extfile "$dir/openssl-pki.cnf"
    chmod 644 "$dir/$service.crt"

    # Create service bundle
    case "$service" in
        emqx)
            cat "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/cacert.pem"
            cp "$dir/$service.crt" "$dir/cert.pem"
            cp "$dir/$service.crt" "$dir/client-cert.pem"
            cp "$dir/$service.key" "$dir/client-key.pem"
            cp "$dir/$service.key" "$dir/key.pem"
            chmod 644 "$dir/cacert.pem" "$dir/cert.pem" "$dir/client-cert.pem" "$dir/client-key.pem" "$dir/key.pem"
            echo "✅ EMQX"
            ;;
        aggregator)
            cp "$dir/$service.key" "$dir/privkey.pem"
            cat "$dir/$service.crt" "$ca_dir/ca-int.crt" > "$dir/fullchain.pem"
            cat "$dir/$service.crt" "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/$service-fullchain.crt"
            cp "$ca_dir/ca-chain.crt" "$dir/ca.crt"
            cat "$dir/$service.key" "$dir/$service.crt" "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/${service}-mongo-client.pem"
            chmod 640 "$dir/privkey.pem" "$dir/fullchain.pem" "$dir/$service-fullchain.crt" "$dir/$service.crt" "$dir/$service.key" "$dir/$service-mongo-client.pem"
            chmod 644 "$dir/ca.crt"
            sudo chgrp certgroup "$dir/privkey.pem" "$dir/fullchain.pem" "$dir/ca.crt" "$dir/$service-fullchain.crt" "$dir/$service.crt" "$dir/$service.key" "$dir/$service-mongo-client.pem"
            echo "✅ Aggregator"
            ;;
        frontend)
            cp "$dir/$service.key" "$dir/privkey.pem"
            cat "$dir/$service.crt" "$ca_dir/ca-int.crt" > "$dir/fullchain.pem"
            cat "$dir/$service.crt" "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/$service-fullchain.crt"
            cp "$ca_dir/ca-chain.crt" "$dir/ca.crt"
            cp "$ca_dir/ca-root.crt" "$frontend_cert_dir/ca-root.crt"
            chmod 640 "$dir/privkey.pem" "$dir/fullchain.pem" "$dir/$service-fullchain.crt" "$dir/$service.crt" "$dir/$service.key"
            chmod 644 "$dir/ca.crt" "$frontend_cert_dir/ca-root.crt"
            echo "✅ Frontend"
            ;;
        mongodb)
            cat "$dir/mongodb.key" "$dir/mongodb.crt" "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/mongodb.pem"
            cp "$ca_dir/ca-chain.crt" "$dir/ca.crt"
            echo "✅ MongoDB"
            ;;
        mongo-healthcheck)
            cat "$dir/mongo-healthcheck.key" "$dir/mongo-healthcheck.crt" > "$dir/mongo-healthcheck.pem"
            cp "$ca_dir/ca-chain.crt" "$dir/ca.crt"
            echo "✅ Mongo Healthcheck"
            ;;
    esac

    echo "✅ Certificate for $service generated."
}

generate_cert_for_deamon() {
    local count="$1"

    # For loop
    for (( i=1; i<=count; i++ )); do
        generate_single_deamon_cert "$i"
    done
}

generate_single_deamon_cert() {
    local n="$1"
    local device_id="sbom-tracelet-$n"
    local dir="$deamon_cert_dir/$device_id"
    mkdir -p "$dir"
    echo "🔧 Generating certificate for deamon device $device_id..."

    # Generate private key
    openssl genpkey -algorithm RSA -out "$dir/device-key.pem" -pkeyopt rsa_keygen_bits:2048
    chmod 600 "$dir/device-key.pem"
    local eku="clientAuth"

    # Create a config file for SAN
    cat > "$dir/openssl.cnf" <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn
[dn]
CN = $device_id
[req_ext]
subjectAltName = @alt_names
[alt_names]
DNS.1 = $device_id
[ext]
basicConstraints = CA:FALSE
subjectAltName = @alt_names
extendedKeyUsage = $eku
keyUsage = digitalSignature, keyEncipherment
EOF

    # Generate CSR
    echo "🔧 Generating Certificate Signing Request (CSR)..."
    openssl req -new -key "$dir/device-key.pem" -out "$dir/device.csr" -config "$dir/openssl.cnf"

    # Sign with intermediate CA
    echo "🔧 Signing CSR with Intermediate CA..."
    openssl x509 -req -in "$dir/device.csr" \
        -CA "$ca_dir/ca-int.crt" -CAkey "$ca_dir/ca-int.key" -CAcreateserial \
        -out "$dir/device-cert.pem" -days 365 \
        -extensions ext -extfile "$dir/openssl.cnf"

    # Create device bundle
    cat "$dir/device-key.pem" "$dir/device-cert.pem" "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/device.pem"
    chmod 644 "$dir/device.pem"

    # Create fullchain bundle
    cat "$dir/device-cert.pem" "$ca_dir/ca-int.crt" "$ca_dir/ca-root.crt" > "$dir/device-fullchain.crt"
    chmod 644 "$dir/device-fullchain.crt"

    # Copy CA chain
    cp "$ca_dir/ca-chain.crt" "$dir/ca.crt"
    echo "✅ Device certificate for $device_id generated."
}

# --- Main Execution ---
echo "🔐 Starting certificate generation..."
generate_root_ca
generate_intermediate_ca
generate_cert_for_service "emqx" "emqx"
generate_cert_for_service "aggregator" "aggregator"
generate_cert_for_service "frontend" "frontend"
generate_cert_for_service "mongodb" "mongo"
generate_cert_for_service "mongo-healthcheck" "mongo.healthcheck"

generate_cert_for_deamon 5

echo "🎉 All certificates generated in $cert_dir/"
