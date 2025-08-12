import os
import json

SBOM_DIR = "sample_sboms"

def get_sbom():
    # For PoC, just load a file from a directory
    path = os.path.join(SBOM_DIR, "bom.1.2.json")
    with open(path, "r") as f:
        return json.load(f)
