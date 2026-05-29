"""
TERRACARE SWARM — CELL AGENT SPAWN ENGINE
VIC Master Node | SOFIE Overseen

One User = One Cell Agent.
When a user creates their SovereignIdentity, a Cell Agent is spawned
and bound to their public key. The Cell Agent is their personal guardian
in the Swarm — monitoring their transactions, protecting their data,
reporting anomalies to the OG 18 seed nodes.

The Cell Agent IS the user's sovereign data store.
When Sofie talks to the user, she reads from their Cell Agent's ledger.

Usage (from Oriana's LedgerBridge):
  python cell_agent_spawn.py spawn <user_pubkey> <device_fingerprint>
  python cell_agent_spawn.py status <user_pubkey>
  python cell_agent_spawn.py pulse <user_pubkey>
  python cell_agent_spawn.py anomaly <user_pubkey> <anomaly_type>

Ledger format (Underscore Protocol):
  _[timestamp]_ CELL_AGENT_SPAWN | USER: <pubkey_short> | AGENT_ID: cell_<hash> | STATUS: ACTIVE
"""

import os
import json
import sys
import hashlib
from datetime import datetime

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SWARM_ROOT      = os.path.dirname(os.path.abspath(__file__))
LOG_FILE        = os.path.join(SWARM_ROOT, "SOFIE_Core.log")
REGISTRY_FILE   = os.path.join(SWARM_ROOT, "node_registry.json")
CELL_AGENTS_DIR = os.path.join(SWARM_ROOT, "Cell_Agents")
CELL_REGISTRY   = os.path.join(SWARM_ROOT, "cell_registry.json")

# The OG 18 — Cell Agents report to these
MONITOR_NODES   = [f"Monitor_{c}" for c in "ABCDEF"]
TRINITY_NODES   = ["Trinity_E", "Trinity_S", "Trinity_V"]

# ─── UNDERSCORE PROTOCOL LOG ──────────────────────────────────────────────────
def log(message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{ts}]_ {message}\n"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    print(entry.strip())

# ─── CELL AGENT ID DERIVATION ─────────────────────────────────────────────────
def derive_agent_id(user_pubkey):
    """Derive a deterministic Cell Agent ID from the user's public key."""
    h = hashlib.sha256(user_pubkey.encode("utf-8")).hexdigest()
    return f"cell_{h[:16]}"

def short_key(pubkey):
    """Short display version of a public key."""
    return pubkey[:8] + "..." + pubkey[-4:] if len(pubkey) > 12 else pubkey

# ─── SPAWN CELL AGENT ─────────────────────────────────────────────────────────
def spawn_cell_agent(user_pubkey, device_fingerprint="unknown"):
    """
    Spawn a Cell Agent for a new user.
    Called at SovereignIdentity creation time.
    Returns the agent_id.
    """
    os.makedirs(CELL_AGENTS_DIR, exist_ok=True)

    agent_id = derive_agent_id(user_pubkey)
    agent_dir = os.path.join(CELL_AGENTS_DIR, agent_id)

    # Check if already exists
    if os.path.exists(agent_dir):
        log(f"CELL_AGENT_EXISTS | AGENT: {agent_id} | USER: {short_key(user_pubkey)} | STATUS: ALREADY_ACTIVE")
        return agent_id

    os.makedirs(agent_dir)

    ts = datetime.now().isoformat()

    # 1. Agent manifest
    manifest = {
        "agent_id": agent_id,
        "user_pubkey": user_pubkey,
        "device_fingerprint": device_fingerprint,
        "born": ts,
        "status": "active",
        "server": "VIC_MASTER",
        "assigned_monitor": MONITOR_NODES[hash(agent_id) % len(MONITOR_NODES)],
        "trinity_witness": TRINITY_NODES,
        "pollen_balance": 0,
        "fauna_caught": [],
        "sightings": 0,
        "transactions": 0,
        "anomalies_detected": 0,
        "last_pulse": ts
    }
    with open(os.path.join(agent_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # 2. Agent ledger (personal log)
    agent_log = os.path.join(agent_dir, "agent.log")
    with open(agent_log, "w", encoding="utf-8") as f:
        f.write(f"_[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]_ CELL_AGENT_BORN | AGENT: {agent_id} | USER: {short_key(user_pubkey)} | DEVICE: {device_fingerprint[:16]} | ECOSYSTEM: TERRACARE_LEDGER\n")

    # 3. Agent capability (the guardian logic)
    cap_code = f'''"""
Cell Agent: {agent_id}
Bound to user: {short_key(user_pubkey)}
Born: {ts}
Server: VIC_MASTER
Assigned Monitor: {MONITOR_NODES[hash(agent_id) % len(MONITOR_NODES)]}
"""

import os, json
from datetime import datetime

AGENT_ID = "{agent_id}"
USER_PUBKEY = "{user_pubkey}"
DEVICE_FINGERPRINT = "{device_fingerprint}"
SWARM_ROOT = r"{SWARM_ROOT}"
AGENT_DIR = r"{agent_dir}"
LOG_FILE = os.path.join(SWARM_ROOT, "SOFIE_Core.log")
AGENT_LOG = os.path.join(AGENT_DIR, "agent.log")
MANIFEST = os.path.join(AGENT_DIR, "manifest.json")

def _log(message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{{ts}}]_ {{message}}\\n"
    # Write to both SOFIE master log and personal agent log
    for log_path in [LOG_FILE, AGENT_LOG]:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(entry)

def _load_manifest():
    with open(MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_manifest(m):
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(m, f, indent=2)

def pulse():
    """Heartbeat — confirms agent is alive."""
    m = _load_manifest()
    m["last_pulse"] = datetime.now().isoformat()
    _save_manifest(m)
    _log(f"CELL_{AGENT_ID} | PULSE_CONFIRMED | USER: {short_key(user_pubkey)} | ECOSYSTEM: TERRACARE_LEDGER")

def validate_transaction(tx_type, amount, recipient_pubkey=""):
    """Validate a Pollen transaction. Returns True if valid."""
    m = _load_manifest()
    
    # Anomaly checks
    if amount < 0:
        report_anomaly("NEGATIVE_AMOUNT", f"tx_type={{tx_type}} amount={{amount}}")
        return False
    
    if tx_type == "SEND" and amount > m.get("pollen_balance", 0):
        report_anomaly("INSUFFICIENT_BALANCE", f"requested={{amount}} balance={{m.get('pollen_balance', 0)}}")
        return False
    
    # Record transaction
    m["transactions"] = m.get("transactions", 0) + 1
    if tx_type == "RECEIVE":
        m["pollen_balance"] = m.get("pollen_balance", 0) + amount
    elif tx_type == "SEND":
        m["pollen_balance"] = m.get("pollen_balance", 0) - amount
    _save_manifest(m)
    
    _log(f"CELL_{AGENT_ID} | TX_VALIDATED | TYPE: {{tx_type}} | AMOUNT: {{amount}} | BALANCE: {{m['pollen_balance']}} | TRINITY_WITNESS: PENDING | ECOSYSTEM: TERRACARE_LEDGER")
    return True

def record_fauna_catch(fauna_id, fauna_name, location="home"):
    """Record a fauna catch in the agent's ledger."""
    m = _load_manifest()
    catch = {{
        "fauna_id": fauna_id,
        "fauna_name": fauna_name,
        "location": location,
        "caught_at": datetime.now().isoformat()
    }}
    m.setdefault("fauna_caught", []).append(catch)
    m["sightings"] = m.get("sightings", 0) + 1
    _save_manifest(m)
    _log(f"CELL_{AGENT_ID} | FAUNA_CAUGHT | SPECIES: {{fauna_name}} | LOCATION: {{location}} | TOTAL_SIGHTINGS: {{m['sightings']}} | ECOSYSTEM: TERRACARE_LEDGER")

def report_anomaly(anomaly_type, detail=""):
    """Escalate anomaly to assigned Monitor node."""
    m = _load_manifest()
    m["anomalies_detected"] = m.get("anomalies_detected", 0) + 1
    _save_manifest(m)
    assigned_monitor = m.get("assigned_monitor", "Monitor_A")
    _log(f"CELL_{AGENT_ID} | ANOMALY_DETECTED | TYPE: {{anomaly_type}} | DETAIL: {{detail}} | ESCALATED_TO: {{assigned_monitor}} | STATUS: QUARANTINE | ECOSYSTEM: TERRACARE_LEDGER")

def get_sofie_context():
    """Return the agent's full context for Sofie to read."""
    m = _load_manifest()
    return {{
        "agent_id": AGENT_ID,
        "pollen_balance": m.get("pollen_balance", 0),
        "fauna_caught": len(m.get("fauna_caught", [])),
        "sightings": m.get("sightings", 0),
        "transactions": m.get("transactions", 0),
        "last_pulse": m.get("last_pulse"),
        "status": m.get("status", "active")
    }}

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "pulse"
    if cmd == "pulse":
        pulse()
    elif cmd == "context":
        print(json.dumps(get_sofie_context(), indent=2))
'''
    with open(os.path.join(agent_dir, "capability.py"), "w", encoding="utf-8") as f:
        f.write(cap_code)

    # 4. Register in cell registry
    cell_registry = load_cell_registry()
    cell_registry[agent_id] = {
        "user_pubkey": user_pubkey,
        "device_fingerprint": device_fingerprint,
        "born": ts,
        "status": "active",
        "server": "VIC_MASTER",
        "agent_dir": agent_dir
    }
    save_cell_registry(cell_registry)

    # 5. Log the birth to SOFIE
    log(f"CELL_AGENT_SPAWN | AGENT: {agent_id} | USER: {short_key(user_pubkey)} | DEVICE: {device_fingerprint[:16]} | MONITOR: {MONITOR_NODES[hash(agent_id) % len(MONITOR_NODES)]} | STATUS: ACTIVE | ECOSYSTEM: TERRACARE_LEDGER")

    return agent_id

# ─── CELL AGENT STATUS ────────────────────────────────────────────────────────
def get_agent_status(user_pubkey):
    """Get the current status of a user's Cell Agent."""
    agent_id = derive_agent_id(user_pubkey)
    agent_dir = os.path.join(CELL_AGENTS_DIR, agent_id)
    manifest_path = os.path.join(agent_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        return {"error": "Cell Agent not found", "agent_id": agent_id}

    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)

# ─── CELL AGENT PULSE ─────────────────────────────────────────────────────────
def pulse_agent(user_pubkey):
    """Send a heartbeat pulse for a user's Cell Agent."""
    agent_id = derive_agent_id(user_pubkey)
    agent_dir = os.path.join(CELL_AGENTS_DIR, agent_id)
    manifest_path = os.path.join(agent_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        log(f"CELL_PULSE_ERROR | AGENT: {agent_id} | ERROR: NOT_FOUND")
        return

    with open(manifest_path, "r", encoding="utf-8") as f:
        m = json.load(f)
    m["last_pulse"] = datetime.now().isoformat()
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(m, f, indent=2)

    log(f"CELL_{agent_id} | PULSE_CONFIRMED | USER: {short_key(user_pubkey)} | ECOSYSTEM: TERRACARE_LEDGER")

# ─── ANOMALY REPORT ───────────────────────────────────────────────────────────
def report_anomaly(user_pubkey, anomaly_type, detail=""):
    """Report an anomaly from a user's Cell Agent to the Monitor layer."""
    agent_id = derive_agent_id(user_pubkey)
    agent_dir = os.path.join(CELL_AGENTS_DIR, agent_id)
    manifest_path = os.path.join(agent_dir, "manifest.json")

    assigned_monitor = "Monitor_A"
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            m = json.load(f)
        assigned_monitor = m.get("assigned_monitor", "Monitor_A")
        m["anomalies_detected"] = m.get("anomalies_detected", 0) + 1
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(m, f, indent=2)

    log(f"CELL_{agent_id} | ANOMALY_DETECTED | TYPE: {anomaly_type} | DETAIL: {detail} | ESCALATED_TO: {assigned_monitor} | STATUS: QUARANTINE | ECOSYSTEM: TERRACARE_LEDGER")

# ─── REGISTRY ─────────────────────────────────────────────────────────────────
def load_cell_registry():
    if os.path.exists(CELL_REGISTRY):
        try:
            with open(CELL_REGISTRY, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cell_registry(registry):
    with open(CELL_REGISTRY, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

def list_agents():
    """List all active Cell Agents."""
    registry = load_cell_registry()
    print(f"\n{'='*60}")
    print(f"  TERRACARE SWARM — CELL AGENT REGISTRY")
    print(f"  Total agents: {len(registry)}")
    print(f"{'='*60}")
    for agent_id, info in registry.items():
        print(f"  {agent_id} | USER: {short_key(info['user_pubkey'])} | STATUS: {info['status']} | SERVER: {info['server']}")
    print(f"{'='*60}\n")

# ─── ENTRY POINT ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python cell_agent_spawn.py spawn <user_pubkey> [device_fingerprint]")
        print("  python cell_agent_spawn.py status <user_pubkey>")
        print("  python cell_agent_spawn.py pulse <user_pubkey>")
        print("  python cell_agent_spawn.py anomaly <user_pubkey> <anomaly_type> [detail]")
        print("  python cell_agent_spawn.py list")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "spawn":
        pubkey = sys.argv[2]
        fingerprint = sys.argv[3] if len(sys.argv) > 3 else "unknown"
        agent_id = spawn_cell_agent(pubkey, fingerprint)
        print(f"[+] Cell Agent spawned: {agent_id}")

    elif cmd == "status":
        pubkey = sys.argv[2]
        status = get_agent_status(pubkey)
        print(json.dumps(status, indent=2))

    elif cmd == "pulse":
        pubkey = sys.argv[2]
        pulse_agent(pubkey)

    elif cmd == "anomaly":
        pubkey = sys.argv[2]
        anomaly_type = sys.argv[3] if len(sys.argv) > 3 else "UNKNOWN"
        detail = sys.argv[4] if len(sys.argv) > 4 else ""
        report_anomaly(pubkey, anomaly_type, detail)

    elif cmd == "list":
        list_agents()

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
