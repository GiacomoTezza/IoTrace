#!/bin/bash

cert_dir="./certs"
if [ ! -d "$cert_dir" ]; then
  mkdir -p "$cert_dir"
fi

# Clean old certs
rm -f "$cert_dir"/*.key "$cert_dir"/*.crt "$cert_dir"/*.csr "$cert_dir"/*.srl

# 1) Create private key for your CA
openssl genpkey -algorithm RSA -out "$cert_dir/ca.key" -pkeyopt rsa_keygen_bits:4096

# 2) Create a self-signed CA cert
openssl req -x509 -new -nodes -key "$cert_dir/ca.key" -days 3650 \
  -subj "/CN=LocalDev-CA" -out "$cert_dir/ca.crt"

# 3) Generate server key and CSR
openssl genpkey -algorithm RSA -out "$cert_dir/server.key" -pkeyopt rsa_keygen_bits:2048
openssl req -new -key "$cert_dir/server.key" \
  -subj "/CN=emqx.local" -out "$cert_dir/server.csr"

# 4) Sign server CSR with your CA
openssl x509 -req -in "$cert_dir/server.csr" -CA "$cert_dir/ca.crt" -CAkey "$cert_dir/ca.key" \
  -CAcreateserial -out "$cert_dir/server.crt" -days 365
