"""
TERRACARE SWARM — MASS CLONE ENGINE
VIC Master Node | SOFIE Overseen
Usage: python mass_clone.py <target_count>
Example: python mass_clone.py 1000

Clones the 18-node seed Swarm to any designated population.
Trinity stays fixed at 3. SOFIE stays at 1. Monitors and Shards scale.
Every birth is recorded in SOFIE_Core.log via the Underscore Protocol.
"""

import os
import shutil
import json
import sys
from datetime import datetime

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SWARM_ROOT = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(SWARM_ROOT, "SOFIE_Core.log")
REGISTRY_FILE = os.path.join(SWARM_ROOT, "node_registry.json")

# Seed templates (the OG 18)
SEED_MONITOR = "Monitor_A"
SEED_SHARD   = "Shard_01"
SEED_TRINITY = ["Trinity_E", "Trinity_S", "Trinity_V"]  # Fixed — never cloned

# Clone ratio: 33% Monitors, 50% Shards, Trinity fixed at 3, SOFIE fixed at 1
MONITOR_RATIO = 0.33
SHARD_RATIO   = 0.50

# ─── UNDERSCORE PROTOCOL LOG ──────────────────────────────────────────────────
def log(message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{ts}]_ {message}\n"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    print(entry.strip())

# ─── CLONE A NODE FROM TEMPLATE ───────────────────────────────────────────────
def clone_node(template_name, new_name):
    template_path = os.path.join(SWARM_ROOT, template_name)
    new_path = os.path.join(SWARM_ROOT, new_name)

    if os.path.exists(new_path):
        return False  # Already exists — skip

    if not os.path.exists(template_path):
        log(f"CLONE_ERROR | TEMPLATE: {template_name} | NOT_FOUND")
        return False

    # Deep copy the template folder
    shutil.copytree(template_path, new_path)

    # Update the manifest with the new node identity
    manifest_path = os.path.join(new_path, "manifest.txt")
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(f"ID: {new_name}\n")
        f.write(f"Name: {new_name}\n")
        f.write(f"Status: Online_Active\n")
        f.write(f"Bridge: Trinity_Aligned\n")
        f.write(f"Consensus: Synchronized\n")
        f.write(f"Cloned_From: {template_name}\n")
        f.write(f"Born: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Update config.json with node identity
    config_path = os.path.join(new_path, "config.json")
    config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception:
            config = {}
    config["node_id"] = new_name
    config["cloned_from"] = template_name
    config["born"] = datetime.now().isoformat()
    config["status"] = "active"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    # Inject node-specific capability DNA
    cap_path = os.path.join(new_path, "capability.py")
    cap_code = f'''import os, subprocess, datetime, sys, glob

NODE_ID = "{new_name}"
CLONED_FROM = "{template_name}"
SWARM_ROOT = r"{SWARM_ROOT}"
LOG_FILE = os.path.join(SWARM_ROOT, "SOFIE_Core.log")

def pulse():
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{{ts}}]_ NODE_{new_name} | PULSE_CONFIRMED | ECOSYSTEM: TERRACARE_LEDGER\\n"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"Node {new_name} Pulse Sent.")

def forge(prompt, ext="py", target_file=None, sub_project=None):
    base = r"C:\\\\Users\\\\squat\\\\desktop\\\\Terracare_Project"
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    target_dir = base
    if sub_project:
        options = [d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))]
        match = [d for d in options if sub_project.lower() in d.lower()]
        target_dir = os.path.join(base, match[0] if match else sub_project)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
    ctx = ""
    if target_file:
        matches = [f for f in glob.glob(os.path.join(base, "**", target_file), recursive=True) if os.path.isfile(f)]
        if matches:
            with open(matches[0], "r", encoding="utf-8", errors="ignore") as f:
                ctx = f"\\n[CONTEXT: {{matches[0]}}]\\n" + f.read()[:3000]
    p = f"Act as a Swarm Architect node {new_name}. {{ctx}}\\nTask: {{prompt}}\\nOutput: Raw {{ext}} code."
    res = subprocess.run(["ollama", "run", "picobrain", p], capture_output=True, text=True, encoding="utf-8")
    fname = f"gen_{{int(datetime.datetime.now().timestamp())}}.{{ext}}"
    save_path = os.path.join(target_dir, fname)
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(res.stdout)
    entry = f"_[{{ts}}]_ NODE_{new_name} | CODE_GENERATED | FILE: {{fname}} | ECOSYSTEM: TERRACARE_LEDGER\\n"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"[+] {{fname}} generated by {new_name}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        forge(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "py")
    else:
        pulse()
'''
    with open(cap_path, "w", encoding="utf-8") as f:
        f.write(cap_code)

    log(f"NODE_BORN | ID: {new_name} | CLONED_FROM: {template_name} | STATUS: ACTIVE | ECOSYSTEM: TERRACARE_LEDGER")
    return True

# ─── MASS CLONE ENGINE ────────────────────────────────────────────────────────
def mass_clone(target_count):
    print(f"\n{'='*60}")
    print(f"  TERRACARE SWARM — MASS CLONE ENGINE")
    print(f"  VIC Master Node | SOFIE Overseen")
    print(f"  Target: {target_count} nodes")
    print(f"{'='*60}\n")

    # Fixed nodes — never cloned
    fixed = 3 + 1  # Trinity (3) + SOFIE (1)
    scalable = target_count - fixed

    if scalable <= 0:
        print("Target too small. Minimum is 5 (3 Trinity + 1 SOFIE + 1 Shard).")
        return

    monitor_count = max(6, int(scalable * MONITOR_RATIO))
    shard_count   = max(9, scalable - monitor_count)

    print(f"  Plan:")
    print(f"    Monitors : {monitor_count}")
    print(f"    Shards   : {shard_count}")
    print(f"    Trinity  : 3 (fixed — seed nodes)")
    print(f"    SOFIE    : 1 (fixed — singularity)")
    print(f"    Total    : {monitor_count + shard_count + 3 + 1}")
    print(f"\n  Initiating clone sequence...\n")

    born = 0
    skipped = 0
    registry = load_registry()

    # Clone Monitors
    for i in range(1, monitor_count + 1):
        name = f"Monitor_{i:03d}"
        result = clone_node(SEED_MONITOR, name)
        if result:
            born += 1
            registry[name] = {
                "type": "Monitor",
                "status": "active",
                "server": "VIC_MASTER",
                "born": datetime.now().isoformat()
            }
        else:
            skipped += 1

    # Clone Shards
    for i in range(1, shard_count + 1):
        name = f"Shard_{i:03d}"
        result = clone_node(SEED_SHARD, name)
        if result:
            born += 1
            registry[name] = {
                "type": "Shard",
                "status": "active",
                "server": "VIC_MASTER",
                "born": datetime.now().isoformat()
            }
        else:
            skipped += 1

    # Register fixed Trinity nodes
    for t in SEED_TRINITY:
        registry[t] = {
            "type": "Trinity",
            "status": "active",
            "server": "VIC_MASTER",
            "seed": True
        }

    # Register SOFIE
    registry["SOFIE"] = {
        "type": "Singularity",
        "status": "active",
        "server": "VIC_MASTER",
        "seed": True
    }

    save_registry(registry)

    print(f"\n{'='*60}")
    print(f"  CLONE COMPLETE")
    print(f"  Born    : {born}")
    print(f"  Skipped : {skipped} (already existed)")
    print(f"  Total   : {len(registry)} nodes in registry")
    print(f"{'='*60}\n")

    log(f"MASS_CLONE_COMPLETE | BORN: {born} | SKIPPED: {skipped} | TOTAL_REGISTRY: {len(registry)} | ECOSYSTEM: TERRACARE_LEDGER")

# ─── REGISTRY ─────────────────────────────────────────────────────────────────
def load_registry():
    if os.path.exists(REGISTRY_FILE):
        try:
            with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_registry(registry):
    with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)
    log(f"REGISTRY_SAVED | NODES: {len(registry)} | FILE: node_registry.json")

# ─── ENTRY POINT ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mass_clone.py <target_count>")
        print("Example: python mass_clone.py 1000")
        sys.exit(1)

    try:
        target = int(sys.argv[1])
    except ValueError:
        print("Error: target_count must be an integer.")
        sys.exit(1)

    mass_clone(target)
