import os
import json

SBOM_DIR = "sample_sboms"

def get_sbom(filename="bom.1.2.json"):
    # For PoC, just load a file from a directory
    path = os.path.join(SBOM_DIR, filename)
    with open(path, "r") as f:
        return json.load(f)
