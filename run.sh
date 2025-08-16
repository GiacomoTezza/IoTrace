#!/bin/bash

docker compose down
rm -rf certs deamon/certs
./gen_certs.sh
docker rm -f sbom-tracelet-1 2>/dev/null || true
docker rm -f sbom-tracelet-2 2>/dev/null || true
docker rm -f sbom-tracelet-3 2>/dev/null || true
docker rm -f sbom-emqx 2>/dev/null || true
docker compose up -d --force-recreate --build
