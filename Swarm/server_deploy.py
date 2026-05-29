"""
TERRACARE SWARM — SERVER DEPLOY ENGINE
VIC Master Node | SOFIE Overseen

Packages the Swarm for deployment to a new physical state server.
Generates WireGuard config for sovereign encrypted tunnel back to VIC master.
Registers the new server with SOFIE and the node registry.

Usage: python server_deploy.py <state> <server_ip> <wireguard_pubkey>
Example: python server_deploy.py NSW 192.168.1.100 <wg_pubkey>

States: NSW, QLD, WA, SA, TAS, NT, ACT
"""

import os
import json
import sys
import shutil
from datetime import datetime

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SWARM_ROOT    = os.path.dirname(os.path.abspath(__file__))
LOG_FILE      = os.path.join(SWARM_ROOT, "SOFIE_Core.log")
REGISTRY_FILE = os.path.join(SWARM_ROOT, "node_registry.json")
DEPLOY_DIR    = os.path.join(SWARM_ROOT, "deployments")

# VIC Master WireGuard endpoint (update with your actual public IP or DDNS)
VIC_MASTER_ENDPOINT = "vic-master.terracare.local:51820"
VIC_MASTER_WG_PUBKEY = "REPLACE_WITH_VIC_MASTER_WG_PUBKEY"

# Node allocation per state
STATE_NODE_PLAN = {
    "NSW": {"monitors": 66, "shards": 100},
    "QLD": {"monitors": 66, "shards": 100},
    "WA":  {"monitors": 33, "shards": 50},
    "SA":  {"monitors": 33, "shards": 50},
    "TAS": {"monitors": 16, "shards": 25},
    "NT":  {"monitors": 16, "shards": 25},
    "ACT": {"monitors": 16, "shards": 25},
}

# WireGuard IP allocation per state (10.x.0.0/24 subnet)
STATE_WG_SUBNET = {
    "VIC": "10.0.0.1",   # Master
    "NSW": "10.1.0.1",
    "QLD": "10.2.0.1",
    "WA":  "10.3.0.1",
    "SA":  "10.4.0.1",
    "TAS": "10.5.0.1",
    "NT":  "10.6.0.1",
    "ACT": "10.7.0.1",
}

# ─── UNDERSCORE PROTOCOL LOG ──────────────────────────────────────────────────
def log(message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{ts}]_ {message}\n"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    print(entry.strip())

# ─── WIREGUARD CONFIG GENERATOR ───────────────────────────────────────────────
def generate_wireguard_config(state, server_ip, wg_pubkey):
    """Generate WireGuard config for the new state server to tunnel back to VIC master."""
    state_ip = STATE_WG_SUBNET.get(state, "10.99.0.1")

    # Config for the NEW state server (goes on the state server)
    state_config = f"""# WireGuard Config — {state} State Server
# Terracare Sovereign Mesh — Tunnel to VIC Master
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

[Interface]
PrivateKey = REPLACE_WITH_{state}_PRIVATE_KEY
Address = {state_ip}/24
ListenPort = 51820
DNS = 1.1.1.1

[Peer]
# VIC Master Node
PublicKey = {VIC_MASTER_WG_PUBKEY}
Endpoint = {VIC_MASTER_ENDPOINT}
AllowedIPs = 10.0.0.0/8
PersistentKeepalive = 25
"""

    # Peer entry to ADD to VIC master's WireGuard config
    vic_peer_entry = f"""
# Add this peer to VIC Master's /etc/wireguard/wg0.conf
[Peer]
# {state} State Server
PublicKey = {wg_pubkey}
AllowedIPs = {state_ip}/32
"""

    return state_config, vic_peer_entry

# ─── DEPLOY PACKAGE GENERATOR ─────────────────────────────────────────────────
def generate_deploy_package(state, server_ip, wg_pubkey):
    """Create a deployment package folder for the state server."""
    os.makedirs(DEPLOY_DIR, exist_ok=True)
    package_dir = os.path.join(DEPLOY_DIR, f"{state}_deploy")

    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)
    os.makedirs(package_dir)

    plan = STATE_NODE_PLAN.get(state, {"monitors": 10, "shards": 15})
    state_ip = STATE_WG_SUBNET.get(state, "10.99.0.1")

    # 1. WireGuard configs
    state_wg, vic_peer = generate_wireguard_config(state, server_ip, wg_pubkey)
    with open(os.path.join(package_dir, f"wg0_{state}.conf"), "w") as f:
        f.write(state_wg)
    with open(os.path.join(package_dir, f"vic_peer_{state}.conf"), "w") as f:
        f.write(vic_peer)

    # 2. State server config
    server_config = {
        "state": state,
        "server_ip": server_ip,
        "wireguard_ip": state_ip,
        "vic_master": VIC_MASTER_ENDPOINT,
        "node_plan": plan,
        "total_nodes": plan["monitors"] + plan["shards"] + 3,
        "deployed": datetime.now().isoformat(),
        "status": "pending_activation"
    }
    with open(os.path.join(package_dir, "server_config.json"), "w") as f:
        json.dump(server_config, f, indent=2)

    # 3. Setup script for the state server (Ubuntu)
    setup_script = f"""#!/bin/bash
# TERRACARE SWARM — {state} State Server Setup
# Run as root on Ubuntu Server 22.04
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

echo "=== TERRACARE SWARM — {state} STATE SERVER SETUP ==="

# 1. System update
apt-get update -y && apt-get upgrade -y

# 2. Install dependencies
apt-get install -y python3 python3-pip git wireguard curl

# 3. Install Ollama (Picobrain)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull picobrain

# 4. Clone the Terracare project
git clone https://github.com/DudeAdrian/Oriana.git /opt/terracare
cd /opt/terracare

# 5. Install WireGuard config
cp wg0_{state}.conf /etc/wireguard/wg0.conf
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# 6. Clone the Swarm nodes for this state
cd /opt/terracare/Terracare_Ledger/Swarm
python3 mass_clone.py {plan['monitors'] + plan['shards'] + 4}

# 7. Register with VIC master
python3 server_deploy.py register {state} {server_ip}

echo "=== {state} STATE SERVER ACTIVE ==="
echo "Nodes: {plan['monitors'] + plan['shards'] + 3}"
echo "WireGuard tunnel: {state_ip} -> VIC Master"
"""
    with open(os.path.join(package_dir, f"setup_{state}.sh"), "w") as f:
        f.write(setup_script)

    # 4. README
    readme = f"""# TERRACARE SWARM — {state} State Server Deployment Package

## Contents
- `wg0_{state}.conf` — WireGuard config for this server (install to /etc/wireguard/wg0.conf)
- `vic_peer_{state}.conf` — Peer entry to add to VIC Master's WireGuard config
- `server_config.json` — Server configuration
- `setup_{state}.sh` — Automated setup script (run as root)

## Node Plan
- Monitors: {plan['monitors']}
- Shards: {plan['shards']}
- Trinity: 3 (fixed)
- Total: {plan['monitors'] + plan['shards'] + 3}

## WireGuard IPs
- This server: {state_ip}
- VIC Master: 10.0.0.1

## Steps
1. Install Ubuntu Server 22.04 on the HP Gen 8 (or equivalent)
2. Copy this package to the server
3. Run: `sudo bash setup_{state}.sh`
4. Add `vic_peer_{state}.conf` content to VIC Master's /etc/wireguard/wg0.conf
5. Run `sudo wg-quick reload wg0` on VIC Master
6. Verify tunnel: `ping 10.0.0.1` from {state} server

## SOFIE Registration
Once online, this server reports to SOFIE at VIC Master.
All node activity is logged to SOFIE_Core.log via the Underscore Protocol.
"""
    with open(os.path.join(package_dir, "README.md"), "w") as f:
        f.write(readme)

    return package_dir, plan

# ─── REGISTER STATE SERVER WITH SOFIE ─────────────────────────────────────────
def register_server(state, server_ip):
    """Register a state server in the node registry."""
    registry_path = REGISTRY_FILE
    registry = {}
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                registry = json.load(f)
        except Exception:
            registry = {}

    registry[f"SERVER_{state}"] = {
        "type": "StateServer",
        "state": state,
        "ip": server_ip,
        "wireguard_ip": STATE_WG_SUBNET.get(state, "10.99.0.1"),
        "status": "active",
        "registered": datetime.now().isoformat()
    }

    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    log(f"SERVER_REGISTERED | STATE: {state} | IP: {server_ip} | WG: {STATE_WG_SUBNET.get(state)} | ECOSYSTEM: TERRACARE_LEDGER")

# ─── ENTRY POINT ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python server_deploy.py <state> <server_ip> <wg_pubkey>")
        print("  python server_deploy.py register <state> <server_ip>")
        print("")
        print("States: NSW, QLD, WA, SA, TAS, NT, ACT")
        print("Example: python server_deploy.py NSW 192.168.1.100 abc123pubkey")
        sys.exit(1)

    if sys.argv[1] == "register":
        state = sys.argv[2].upper()
        server_ip = sys.argv[3]
        register_server(state, server_ip)
        print(f"[+] {state} server registered with SOFIE.")
    else:
        state = sys.argv[1].upper()
        server_ip = sys.argv[2] if len(sys.argv) > 2 else "0.0.0.0"
        wg_pubkey = sys.argv[3] if len(sys.argv) > 3 else "PENDING"

        if state not in STATE_NODE_PLAN:
            print(f"Unknown state: {state}. Valid: {', '.join(STATE_NODE_PLAN.keys())}")
            sys.exit(1)

        print(f"\n{'='*60}")
        print(f"  TERRACARE SWARM — SERVER DEPLOY ENGINE")
        print(f"  Generating deployment package for: {state}")
        print(f"{'='*60}\n")

        package_dir, plan = generate_deploy_package(state, server_ip, wg_pubkey)

        print(f"  [+] Deployment package created: {package_dir}")
        print(f"  [+] Monitors: {plan['monitors']}")
        print(f"  [+] Shards: {plan['shards']}")
        print(f"  [+] WireGuard config: wg0_{state}.conf")
        print(f"  [+] Setup script: setup_{state}.sh")
        print(f"\n  Next steps:")
        print(f"  1. Copy {package_dir} to the {state} server")
        print(f"  2. Run: sudo bash setup_{state}.sh")
        print(f"  3. Add vic_peer_{state}.conf to VIC Master WireGuard")
        print(f"\n{'='*60}\n")

        log(f"DEPLOY_PACKAGE_CREATED | STATE: {state} | SERVER: {server_ip} | NODES: {plan['monitors'] + plan['shards'] + 3} | ECOSYSTEM: TERRACARE_LEDGER")
