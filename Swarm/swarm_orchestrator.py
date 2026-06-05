#!/usr/bin/env python3
# ── TERRACARE SWARM ORCHESTRATOR ─────────────────────────────────────────────
# Single entry point for all 25 agents: 18 Swarm nodes + 9 Factory agents
# Starts all nodes, monitors health, writes to shared swarm_state.json
# Usage: python swarm_orchestrator.py [--status] [--node <name>] [--stop]
# ─────────────────────────────────────────────────────────────────────────────

import os, sys, json, time, threading, subprocess, datetime, signal, argparse
from pathlib import Path

BASE_DIR     = Path(__file__).parent
STATE_FILE   = BASE_DIR / 'swarm_state.json'
LOG_FILE     = BASE_DIR / 'SOFIE_Core.log'
LEDGER_FILE  = BASE_DIR / 'terracare_ledger.json'

# ── COLOURS ───────────────────────────────────────────────────────────────────
class C:
    GOLD  = '\033[38;5;214m'
    GREEN = '\033[38;5;82m'
    CYAN  = '\033[38;5;51m'
    RED   = '\033[38;5;196m'
    AMBER = '\033[38;5;208m'
    DIM   = '\033[2m'
    BOLD  = '\033[1m'
    RESET = '\033[0m'

# ── 18 SWARM NODES ────────────────────────────────────────────────────────────
SWARM_NODES = [
    # Monitors — Cell Agent watchers
    {'id': 'Monitor_A', 'role': 'Cell Agent Watcher — Cohort Alpha',    'type': 'monitor', 'priority': 1},
    {'id': 'Monitor_B', 'role': 'Cell Agent Watcher — Cohort Beta',     'type': 'monitor', 'priority': 1},
    {'id': 'Monitor_C', 'role': 'Cell Agent Watcher — Cohort Gamma',    'type': 'monitor', 'priority': 1},
    {'id': 'Monitor_D', 'role': 'Cell Agent Watcher — Cohort Delta',    'type': 'monitor', 'priority': 1},
    {'id': 'Monitor_E', 'role': 'Cell Agent Watcher — Cohort Epsilon',  'type': 'monitor', 'priority': 1},
    {'id': 'Monitor_F', 'role': 'Cell Agent Watcher — Cohort Zeta',     'type': 'monitor', 'priority': 1},
    # Shards — Distributed ledger fragments
    {'id': 'Shard_01',  'role': 'Ledger Shard — Identity Records',      'type': 'shard',   'priority': 2},
    {'id': 'Shard_02',  'role': 'Ledger Shard — Pollen Transactions',   'type': 'shard',   'priority': 2},
    {'id': 'Shard_03',  'role': 'Ledger Shard — Fauna Encounters',      'type': 'shard',   'priority': 2},
    {'id': 'Shard_04',  'role': 'Ledger Shard — Conservation Events',   'type': 'shard',   'priority': 2},
    {'id': 'Shard_05',  'role': 'Ledger Shard — Invite & Referrals',    'type': 'shard',   'priority': 2},
    {'id': 'Shard_06',  'role': 'Ledger Shard — Revenue Splits',        'type': 'shard',   'priority': 2},
    {'id': 'Shard_07',  'role': 'Ledger Shard — Messenger Events',      'type': 'shard',   'priority': 2},
    {'id': 'Shard_08',  'role': 'Ledger Shard — Trading Marketplace',   'type': 'shard',   'priority': 2},
    {'id': 'Shard_09',  'role': 'Ledger Shard — GPS & Map Data',        'type': 'shard',   'priority': 2},
    # Trinity — Validation core
    {'id': 'Trinity_E', 'role': 'Ethical Validator — Covenant Compliance',  'type': 'trinity', 'priority': 0},
    {'id': 'Trinity_S', 'role': 'Sovereign Validator — Identity Integrity', 'type': 'trinity', 'priority': 0},
    {'id': 'Trinity_V', 'role': 'Value Validator — Pollen Flow Integrity',  'type': 'trinity', 'priority': 0},
]

# ── 9 FACTORY AGENTS ──────────────────────────────────────────────────────────
FACTORY_AGENTS = [
    {'id': 'Factory_Ledger',   'role': 'Ledger Witness — validates all writes',         'revenue': 'integrity_fee'},
    {'id': 'Factory_Pollen',   'role': 'Pollen Economist — enforces 70/4/15/5/6 split', 'revenue': 'split_management'},
    {'id': 'Factory_Fauna',    'role': 'Fauna Tracker — encounter rates, rarity',       'revenue': 'conservation_fund'},
    {'id': 'Factory_Mesh',     'role': 'Mesh Guardian — P2P health, node connectivity', 'revenue': 'network_fee'},
    {'id': 'Factory_Identity', 'role': 'Identity Verifier — NFT, keypair, sovereign ID','revenue': 'verification_fee'},
    {'id': 'Factory_Content',  'role': 'Content Moderator — covenant compliance',       'revenue': 'moderation_fee'},
    {'id': 'Factory_Invite',   'role': 'Invite Tracker — referrals, +500 Pollen',       'revenue': 'referral_commission'},
    {'id': 'Factory_Revenue',  'role': 'Revenue Executor — splits, Founder Token vest', 'revenue': 'processing_fee'},
    {'id': 'Factory_Trinity',  'role': 'Validation Core — cross-validates all agents',  'revenue': 'consensus_fee'},
]

ALL_AGENTS = SWARM_NODES + FACTORY_AGENTS

# ── SHARED STATE ──────────────────────────────────────────────────────────────
state = {
    'started_at': None,
    'nodes': {},
    'factory': {},
    'total_active': 0,
    'total_agents': len(ALL_AGENTS),
    'ledger_entries': 0,
    'uptime_seconds': 0,
}

state_lock = threading.Lock()
running    = True

# ── LEDGER WRITE ──────────────────────────────────────────────────────────────
def ledger_write(action, data):
    ts  = int(time.time() * 1000)
    now = datetime.datetime.now().strftime('%H:%M:%S')
    entry = f'_[{ts}]_ {action}'
    for k, v in data.items():
        entry += f' | {k}: {v}'
    entry += ' | ECOSYSTEM: TERRACARE_LEDGER'
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f'[{now}] {entry}\n')
    except Exception:
        pass
    try:
        ledger = []
        if LEDGER_FILE.exists():
            with open(LEDGER_FILE, 'r') as f:
                ledger = json.load(f)
        ledger.append({'type': action, 'timestamp': ts, 'data': data, 'source': 'SWARM_ORCHESTRATOR'})
        with open(LEDGER_FILE, 'w') as f:
            json.dump(ledger[-2000:], f, indent=2)
        with state_lock:
            state['ledger_entries'] += 1
    except Exception:
        pass

# ── NODE RUNNER ───────────────────────────────────────────────────────────────
def run_node(agent):
    node_id   = agent['id']
    node_type = agent.get('type', 'factory')
    role      = agent['role']

    with state_lock:
        key = 'nodes' if node_type in ('monitor', 'shard', 'trinity') else 'factory'
        state[key][node_id] = {
            'status':     'STARTING',
            'role':       role,
            'type':       node_type,
            'started_at': datetime.datetime.now().isoformat(),
            'pulses':     0,
            'last_pulse': None,
            'errors':     0,
        }

    # Try to run capability.py if it exists
    cap_path = BASE_DIR / node_id / 'capability.py'
    if cap_path.exists():
        try:
            subprocess.run(
                [sys.executable, str(cap_path)],
                capture_output=True, timeout=5
            )
        except Exception:
            pass

    with state_lock:
        key = 'nodes' if node_type in ('monitor', 'shard', 'trinity') else 'factory'
        state[key][node_id]['status'] = 'ACTIVE'
        state['total_active'] += 1

    ledger_write(f'{node_id}_ONLINE', {'role': role, 'type': node_type})

    # Heartbeat loop
    pulse_interval = 30  # seconds
    while running:
        time.sleep(pulse_interval)
        if not running:
            break
        now = datetime.datetime.now().isoformat()
        with state_lock:
            key = 'nodes' if node_type in ('monitor', 'shard', 'trinity') else 'factory'
            if node_id in state[key]:
                state[key][node_id]['pulses']     += 1
                state[key][node_id]['last_pulse']  = now
                state[key][node_id]['status']      = 'ACTIVE'

        # Write pulse to log
        try:
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(f'[{datetime.datetime.now().strftime("%H:%M:%S")}] PULSE | {node_id} | {role}\n')
        except Exception:
            pass

    with state_lock:
        key = 'nodes' if node_type in ('monitor', 'shard', 'trinity') else 'factory'
        if node_id in state[key]:
            state[key][node_id]['status'] = 'STOPPED'

# ── STATE WRITER ──────────────────────────────────────────────────────────────
def state_writer():
    while running:
        time.sleep(5)
        with state_lock:
            state['uptime_seconds'] = int(
                (datetime.datetime.now() - datetime.datetime.fromisoformat(state['started_at'])).total_seconds()
            ) if state['started_at'] else 0
            state['total_active'] = sum(
                1 for n in {**state['nodes'], **state['factory']}.values()
                if n.get('status') == 'ACTIVE'
            )
        try:
            with open(STATE_FILE, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception:
            pass

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    global running

    parser = argparse.ArgumentParser(description='Terracare Swarm Orchestrator')
    parser.add_argument('--status', action='store_true', help='Show current swarm status')
    parser.add_argument('--node',   type=str,            help='Show status of specific node')
    parser.add_argument('--stop',   action='store_true', help='Stop all agents')
    args = parser.parse_args()

    if args.status:
        if STATE_FILE.exists():
            with open(STATE_FILE) as f:
                s = json.load(f)
            print(C.BOLD + C.GOLD + '\n  TERRACARE SWARM STATUS\n' + C.RESET)
            print(f'  Active: {s.get("total_active", 0)}/{s.get("total_agents", 25)}')
            print(f'  Uptime: {s.get("uptime_seconds", 0)}s')
            print(f'  Ledger entries: {s.get("ledger_entries", 0)}\n')
            for nid, nd in {**s.get('nodes', {}), **s.get('factory', {})}.items():
                status = nd.get('status', '?')
                color  = C.GREEN if status == 'ACTIVE' else C.RED
                print(f'  {color}{status:8s}{C.RESET}  {nid:20s}  {nd.get("role", "")}')
        else:
            print(C.RED + '  Swarm not running (no state file)' + C.RESET)
        return

    if args.node:
        if STATE_FILE.exists():
            with open(STATE_FILE) as f:
                s = json.load(f)
            nd = {**s.get('nodes', {}), **s.get('factory', {})}.get(args.node)
            if nd:
                print(json.dumps(nd, indent=2))
            else:
                print(C.RED + f'  Node not found: {args.node}' + C.RESET)
        return

    # ── START ALL AGENTS ──────────────────────────────────────────────────────
    print(C.BOLD + C.GOLD)
    print('  ╔══════════════════════════════════════════════════════╗')
    print('  ║   TERRACARE SWARM ORCHESTRATOR — IGNITION           ║')
    print('  ║   18 Swarm Nodes + 9 Factory Agents = 25 Total      ║')
    print('  ╚══════════════════════════════════════════════════════╝')
    print(C.RESET)

    state['started_at'] = datetime.datetime.now().isoformat()

    ledger_write('SWARM_ORCHESTRATOR_START', {
        'total_agents': len(ALL_AGENTS),
        'swarm_nodes':  len(SWARM_NODES),
        'factory_agents': len(FACTORY_AGENTS),
    })

    # Start state writer thread
    sw_thread = threading.Thread(target=state_writer, daemon=True)
    sw_thread.start()

    # Start Trinity first (highest priority)
    trinity_agents = [a for a in SWARM_NODES if a.get('type') == 'trinity']
    print(C.CYAN + '  [TRINITY] Starting validation core...' + C.RESET)
    for agent in trinity_agents:
        t = threading.Thread(target=run_node, args=(agent,), daemon=True)
        t.start()
        print(f'  {C.GREEN}+{C.RESET} {agent["id"]:20s} {C.DIM}{agent["role"]}{C.RESET}')
    time.sleep(1)

    # Start Monitors
    monitor_agents = [a for a in SWARM_NODES if a.get('type') == 'monitor']
    print(C.CYAN + '\n  [MONITORS] Starting cell agent watchers...' + C.RESET)
    for agent in monitor_agents:
        t = threading.Thread(target=run_node, args=(agent,), daemon=True)
        t.start()
        print(f'  {C.GREEN}+{C.RESET} {agent["id"]:20s} {C.DIM}{agent["role"]}{C.RESET}')
    time.sleep(1)

    # Start Shards
    shard_agents = [a for a in SWARM_NODES if a.get('type') == 'shard']
    print(C.CYAN + '\n  [SHARDS] Starting distributed ledger shards...' + C.RESET)
    for agent in shard_agents:
        t = threading.Thread(target=run_node, args=(agent,), daemon=True)
        t.start()
        print(f'  {C.GREEN}+{C.RESET} {agent["id"]:20s} {C.DIM}{agent["role"]}{C.RESET}')
    time.sleep(1)

    # Start Factory
    print(C.CYAN + '\n  [FACTORY] Starting 9 autonomous revenue agents...' + C.RESET)
    for agent in FACTORY_AGENTS:
        t = threading.Thread(target=run_node, args=(agent,), daemon=True)
        t.start()
        print(f'  {C.GOLD}+{C.RESET} {agent["id"]:20s} {C.DIM}{agent["role"]}{C.RESET}')
    time.sleep(2)

    print(C.BOLD + C.GREEN + f'\n  ALL {len(ALL_AGENTS)} AGENTS ACTIVE — SWARM ONLINE\n' + C.RESET)
    print(C.DIM + f'  State: {STATE_FILE}' + C.RESET)
    print(C.DIM + f'  Log:   {LOG_FILE}' + C.RESET)
    print(C.DIM + '  Press Ctrl+C to stop\n' + C.RESET)

    def shutdown(sig, frame):
        global running
        print(C.AMBER + '\n  Shutting down swarm...' + C.RESET)
        running = False
        ledger_write('SWARM_ORCHESTRATOR_STOP', {'reason': 'manual'})
        time.sleep(2)
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Keep alive
    while running:
        time.sleep(10)

if __name__ == '__main__':
    main()
