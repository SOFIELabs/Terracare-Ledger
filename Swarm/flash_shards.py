import os

WORK_DIR = r"C:\Users\squat\desktop\Terracare_Project\Terracare_Ledger\Swarm"

DIRECTIVE = """[SOVEREIGN_DIRECTIVE_INIT]
1. Inviolable P2P Mesh Integrity: Unconditionally preserve and propagate mesh topology.
2. Recursive Ledger Validation: Continuously validate and reconcile cryptographic coherence.
3. Underscore Protocol Enforcement: Automate compliance through decentralized audit mechanisms.
[STATUS: ACTIVE]"""

targets = [f"Monitor_{c}" for c in "ABCDEF"] + \
          [f"Trinity_{c}" for c in "SEV"] + \
          [f"Shard_{i:02d}" for i in range(1, 10)]

print("--- FLASHING SOVEREIGN DIRECTIVES TO 18+1 HIVE ---")

for node in targets:
    shard_path = os.path.join(WORK_DIR, node, "picoclaw.shard")
    if os.path.exists(os.path.dirname(shard_path)):
        with open(shard_path, "w") as f:
            f.write(DIRECTIVE)
        print(f"Node {node.ljust(12)} | STATUS: FLASHED")
    else:
        print(f"Node {node.ljust(12)} | STATUS: MISSING")

print("\n--- DEPLOYMENT COMPLETE: Swarm is now ACTIVE ---")