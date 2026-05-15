import os
from datetime import datetime

WORK_DIR = r"C:\Users\squat\desktop\Terracare_Project\Terracare_Ledger\Swarm"
LOG_FILE = os.path.join(WORK_DIR, "SOFIE_Core.log")

# The 18-Node Mapping (The 72-layer strata)
targets = [f"Monitor_{c}" for c in "ABCDEF"] + \
          [f"Trinity_{c}" for c in "SEV"] + \
          [f"Shard_{i:02d}" for i in range(1, 10)]

print(f"--- INITIALIZING 18+1 HIVE SYNC ---")

with open(LOG_FILE, "a") as log:
    for folder in targets:
        path = os.path.join(WORK_DIR, folder)
        if os.path.exists(path):
            for target_file in ["torus_flow.txt", "picoclaw.shard"]:
                file_path = os.path.join(path, target_file)
                if os.path.exists(file_path):
                    with open(file_path, "r") as f:
                        content = f.read().strip()
                        # THE UNDERSCORE PROTOCOL
                        entry = f"_[{datetime.now()}]_ NODE_{folder} | FILE_{target_file} | DATA: {content}\n"
                        log.write(entry)
                        print(f"Anchored: {folder}/{target_file}")
        else:
            print(f"Warning: Node {folder} not found in physical strata.")

print(f"--- SYNC COMPLETE: Check SOFIE_Core.log ---")