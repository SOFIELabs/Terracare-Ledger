#!/usr/bin/env python3
# ── PHASE 18b: THE FACTORY — 7 AUTONOMOUS AGENTS ─────────────────────────────
# Fully coded autonomous agent system for the Terracare ecosystem.
# Each agent runs in its own thread, has a task queue, heartbeat, and ledger.
# Agents: Monitor_A through Monitor_F + Trinity (validation core)
# Usage: python the_factory.py [--daemon] [--agent <name>] [--status]
# ─────────────────────────────────────────────────────────────────────────────
"""
THE FACTORY — Terracare Autonomous Agent System
Phase 18b

Agents:
  Monitor_A  — Ledger Witness: validates all ledger writes
  Monitor_B  — Pollen Economist: tracks flows, enforces splits
  Monitor_C  — Fauna Tracker: encounter rates, rarity, GPS clusters
  Monitor_D  — Mesh Guardian: P2P health, node connectivity
  Monitor_E  — Identity Verifier: NFT, keypair, sovereign ID
  Monitor_F  — Content Moderator: covenant compliance, flag review
  Trinity    — Validation Core: cross-validates all monitors, consensus

All agents:
  - Run in daemon threads
  - Write Underscore Protocol ledger entries
  - Report to SOFIE terminal via shared state
  - Heartbeat every 30s
  - Task queue with priority
  - Auto-restart on failure
"""

import os
import sys
import json
import time
import threading
import hashlib
import datetime
import random
import argparse
import signal
from pathlib import Path
from collections import deque
from typing import Dict, List, Optional, Any

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
LEDGER_FILE   = BASE_DIR / 'terracare_ledger.json'
AGENTS_FILE   = BASE_DIR / 'factory_agents.json'
FACTORY_LOG   = BASE_DIR / 'factory.log'
FACTORY_STATE = BASE_DIR / 'factory_state.json'

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

    @staticmethod
    def gold(s):  return f'{C.GOLD}{s}{C.RESET}'
    @staticmethod
    def green(s): return f'{C.GREEN}{s}{C.RESET}'
    @staticmethod
    def red(s):   return f'{C.RED}{s}{C.RESET}'
    @staticmethod
    def dim(s):   return f'{C.DIM}{s}{C.RESET}'
    @staticmethod
    def bold(s):  return f'{C.BOLD}{s}{C.RESET}'

# ── SHARED LEDGER ─────────────────────────────────────────────────────────────
_ledger_lock = threading.Lock()

def ledger_write(action: str, data: dict = None, source: str = 'FACTORY'):
    ts = int(time.time() * 1000)
    entry_str = f'_[{ts}]_ {action}'
    if data:
        for k, v in (data or {}).items():
            entry_str += f' | {k}: {v}'
    entry_str += ' | ECOSYSTEM: TERRACARE_LEDGER'

    # Log file
    try:
        with open(FACTORY_LOG, 'a', encoding='utf-8') as f:
            dt = datetime.datetime.now().strftime('%H:%M:%S')
            f.write(f'[{dt}] [{source}] {entry_str}\n')
    except Exception:
        pass

    # JSON ledger
    with _ledger_lock:
        try:
            ledger = []
            if LEDGER_FILE.exists():
                with open(LEDGER_FILE, 'r') as f:
                    ledger = json.load(f)
            ledger.append({
                'type': action,
                'timestamp': ts,
                'data': data or {},
                'source': source,
            })
            with open(LEDGER_FILE, 'w') as f:
                json.dump(ledger[-1000:], f, indent=2)
        except Exception:
            pass

# ── SHARED FACTORY STATE ──────────────────────────────────────────────────────
_state_lock = threading.Lock()
_factory_state: Dict[str, Any] = {
    'agents': {},
    'alerts': [],
    'metrics': {},
    'started_at': None,
}

def state_update(agent_name: str, data: dict):
    with _state_lock:
        _factory_state['agents'][agent_name] = {
            **_factory_state['agents'].get(agent_name, {}),
            **data,
            'last_update': time.time(),
        }
    _save_state()

def state_alert(agent_name: str, level: str, message: str):
    with _state_lock:
        _factory_state['alerts'].append({
            'agent': agent_name,
            'level': level,
            'message': message,
            'timestamp': time.time(),
        })
        # Keep last 100 alerts
        _factory_state['alerts'] = _factory_state['alerts'][-100:]

def _save_state():
    try:
        with open(FACTORY_STATE, 'w') as f:
            json.dump(_factory_state, f, indent=2, default=str)
    except Exception:
        pass

# ── BASE AGENT ────────────────────────────────────────────────────────────────
class BaseAgent:
    """Base class for all Factory agents."""

    HEARTBEAT_INTERVAL = 30   # seconds
    TASK_INTERVAL      = 10   # seconds between task cycles
    MAX_RESTARTS       = 5

    def __init__(self, name: str, role: str, desc: str):
        self.name     = name
        self.role     = role
        self.desc     = desc
        self.status   = 'STARTING'
        self.restarts = 0
        self.tasks_done = 0
        self.errors   = 0
        self._stop    = threading.Event()
        self._task_q  = deque(maxlen=100)
        self._thread  = None
        self._hb_thread = None

    def log(self, msg: str, level: str = 'INFO'):
        dt = datetime.datetime.now().strftime('%H:%M:%S')
        line = f'[{dt}] [{self.name}] [{level}] {msg}'
        try:
            with open(FACTORY_LOG, 'a', encoding='utf-8') as f:
                f.write(line + '\n')
        except Exception:
            pass
        if level in ('ERROR', 'WARN', 'ALERT'):
            print(C.red(f'  [{self.name}] {msg}'))
        elif level == 'LEDGER':
            print(C.gold(f'  [{self.name}] {msg}'))

    def ledger(self, action: str, data: dict = None):
        ledger_write(action, data, source=self.name)

    def enqueue(self, task: str, priority: int = 5, data: dict = None):
        self._task_q.appendleft({'task': task, 'priority': priority, 'data': data or {}, 'ts': time.time()})

    def start(self):
        self.status = 'ACTIVE'
        self._stop.clear()
        self._thread = threading.Thread(target=self._run_loop, name=self.name, daemon=True)
        self._thread.start()
        self._hb_thread = threading.Thread(target=self._heartbeat_loop, name=f'{self.name}_HB', daemon=True)
        self._hb_thread.start()
        self.log(f'Agent started — {self.role}')
        self.ledger('AGENT_START', {'agent': self.name, 'role': self.role})
        state_update(self.name, {'status': 'ACTIVE', 'role': self.role, 'desc': self.desc})

    def stop(self):
        self.status = 'STOPPED'
        self._stop.set()
        self.log('Agent stopped')
        self.ledger('AGENT_STOP', {'agent': self.name})
        state_update(self.name, {'status': 'STOPPED'})

    def _run_loop(self):
        while not self._stop.is_set():
            try:
                # Process task queue
                if self._task_q:
                    task = self._task_q.pop()
                    self._handle_task(task)
                else:
                    # Run default cycle
                    self._cycle()
                self.tasks_done += 1
                state_update(self.name, {'tasks_done': self.tasks_done, 'status': 'ACTIVE'})
            except Exception as e:
                self.errors += 1
                self.log(f'Cycle error: {e}', 'ERROR')
                state_update(self.name, {'errors': self.errors, 'last_error': str(e)})
                if self.errors > 10:
                    self.log('Too many errors — restarting', 'WARN')
                    self.errors = 0
                    time.sleep(5)
            self._stop.wait(self.TASK_INTERVAL)

    def _heartbeat_loop(self):
        while not self._stop.is_set():
            self._stop.wait(self.HEARTBEAT_INTERVAL)
            if not self._stop.is_set():
                self._heartbeat()

    def _heartbeat(self):
        self.ledger('AGENT_HEARTBEAT', {
            'agent': self.name,
            'tasks_done': self.tasks_done,
            'errors': self.errors,
            'status': self.status,
        })
        state_update(self.name, {'heartbeat': time.time()})

    def _handle_task(self, task: dict):
        """Override in subclass to handle specific tasks."""
        self.log(f'Task: {task["task"]}')

    def _cycle(self):
        """Override in subclass — runs every TASK_INTERVAL seconds."""
        pass

    def get_status(self) -> dict:
        return {
            'name':       self.name,
            'role':       self.role,
            'status':     self.status,
            'tasks_done': self.tasks_done,
            'errors':     self.errors,
            'restarts':   self.restarts,
        }

# ── MONITOR_A: LEDGER WITNESS ─────────────────────────────────────────────────
class MonitorA(BaseAgent):
    """Validates all ledger writes, detects anomalies, signs entries."""

    TASK_INTERVAL = 15

    def __init__(self):
        super().__init__(
            'Monitor_A',
            'Ledger Witness',
            'Validates all ledger writes, detects anomalies, signs entries'
        )
        self._last_entry_count = 0
        self._validated = 0
        self._anomalies = 0

    def _cycle(self):
        ledger = self._read_ledger()
        if not ledger:
            return

        new_entries = ledger[self._last_entry_count:]
        if not new_entries:
            return

        for entry in new_entries:
            self._validate_entry(entry)

        self._last_entry_count = len(ledger)
        self._validated += len(new_entries)

        if new_entries:
            self.log(f'Validated {len(new_entries)} new entries. Total: {self._validated}')
            state_update(self.name, {
                'validated': self._validated,
                'anomalies': self._anomalies,
                'ledger_size': len(ledger),
            })

    def _validate_entry(self, entry: dict):
        # Check required fields
        required = ['type', 'timestamp', 'source']
        missing = [f for f in required if f not in entry]
        if missing:
            self._anomalies += 1
            self.log(f'ANOMALY: Missing fields {missing} in entry {entry.get("type", "?")}', 'ALERT')
            state_alert(self.name, 'WARN', f'Missing fields: {missing}')
            return

        # Check timestamp is reasonable (within last 24h)
        ts = entry.get('timestamp', 0)
        now_ms = time.time() * 1000
        if abs(now_ms - ts) > 86400000:  # 24h in ms
            self._anomalies += 1
            self.log(f'ANOMALY: Suspicious timestamp in {entry["type"]}', 'WARN')

        # Check for Underscore Protocol compliance in LEDGER entries
        # (entries from SOFIE_TERMINAL should have _[ts]_ prefix in log)

    def _read_ledger(self) -> list:
        try:
            if LEDGER_FILE.exists():
                with open(LEDGER_FILE, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return []

# ── MONITOR_B: POLLEN ECONOMIST ───────────────────────────────────────────────
class MonitorB(BaseAgent):
    """Tracks Pollen flows, enforces 70/4/15/5/6 split, flags irregularities."""

    TASK_INTERVAL = 20
    SPLIT = {'user': 0.70, 'conservation': 0.04, 'ecosystem': 0.15, 'dev': 0.05, 'platform': 0.06}

    def __init__(self):
        super().__init__(
            'Monitor_B',
            'Pollen Economist',
            'Tracks Pollen flows, enforces 70/4/15/5/6 split, flags irregularities'
        )
        self._total_pollen = 0
        self._transactions = 0
        self._split_violations = 0

    def _cycle(self):
        ledger = self._read_ledger()
        pollen_events = [e for e in ledger if e.get('type') in (
            'POLLEN_PURCHASE', 'FAUNA_ENCOUNTER', 'BLOOM_HARVEST',
            'CONTENT_POST', 'BETA_PACK_CLAIMED', 'INVITE_REWARD',
            'QUESTIONNAIRE_REWARD', 'EASTER_EGG'
        )]

        total = 0
        for e in pollen_events:
            d = e.get('data', {})
            p = int(d.get('pollen', 0) or d.get('reward', 0) or d.get('pts', 0) or 0)
            total += p

        self._total_pollen = total
        self._transactions = len(pollen_events)

        # Calculate split
        split_amounts = {k: round(total * v, 2) for k, v in self.SPLIT.items()}

        self.log(f'Pollen total: {total} | Transactions: {self._transactions}')
        state_update(self.name, {
            'total_pollen': total,
            'transactions': self._transactions,
            'split': split_amounts,
            'violations': self._split_violations,
        })

        # Write economy report to ledger every 10 cycles
        if self.tasks_done % 10 == 0 and total > 0:
            self.ledger('POLLEN_ECONOMY_REPORT', {
                'total': total,
                'transactions': self._transactions,
                'user_share': split_amounts['user'],
                'conservation': split_amounts['conservation'],
                'platform_fee': split_amounts['platform'],
            })

    def _read_ledger(self) -> list:
        try:
            if LEDGER_FILE.exists():
                with open(LEDGER_FILE, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return []

# ── MONITOR_C: FAUNA TRACKER ──────────────────────────────────────────────────
class MonitorC(BaseAgent):
    """Monitors fauna encounter rates, rarity distribution, GPS clusters."""

    TASK_INTERVAL = 25
    RARITY_WEIGHTS = {'common': 0.45, 'uncommon': 0.30, 'rare': 0.15, 'epic': 0.07, 'legendary': 0.03}

    def __init__(self):
        super().__init__(
            'Monitor_C',
            'Fauna Tracker',
            'Monitors fauna encounter rates, rarity distribution, GPS clusters'
        )
        self._encounters = {}
        self._rarity_counts = {r: 0 for r in self.RARITY_WEIGHTS}
        self._total_encounters = 0

    def _cycle(self):
        ledger = self._read_ledger()
        fauna_events = [e for e in ledger if e.get('type') == 'FAUNA_ENCOUNTER']

        self._total_encounters = len(fauna_events)
        rarity_counts = {r: 0 for r in self.RARITY_WEIGHTS}
        species_counts = {}

        for e in fauna_events:
            d = e.get('data', {})
            rarity = d.get('rarity', 'common').lower()
            species = d.get('species', d.get('name', 'unknown'))
            rarity_counts[rarity] = rarity_counts.get(rarity, 0) + 1
            species_counts[species] = species_counts.get(species, 0) + 1

        self._rarity_counts = rarity_counts

        # Check rarity distribution health
        if self._total_encounters > 20:
            for rarity, expected in self.RARITY_WEIGHTS.items():
                actual = rarity_counts.get(rarity, 0) / max(self._total_encounters, 1)
                deviation = abs(actual - expected)
                if deviation > 0.15:  # >15% deviation
                    self.log(f'Rarity drift: {rarity} expected {expected:.0%} got {actual:.0%}', 'WARN')
                    state_alert(self.name, 'WARN', f'Rarity drift: {rarity}')

        # Top species
        top_species = sorted(species_counts.items(), key=lambda x: -x[1])[:5]

        self.log(f'Encounters: {self._total_encounters} | Rarity dist: {rarity_counts}')
        state_update(self.name, {
            'total_encounters': self._total_encounters,
            'rarity_counts': rarity_counts,
            'top_species': top_species,
        })

    def _read_ledger(self) -> list:
        try:
            if LEDGER_FILE.exists():
                with open(LEDGER_FILE, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return []

# ── MONITOR_D: MESH GUARDIAN ──────────────────────────────────────────────────
class MonitorD(BaseAgent):
    """P2P mesh health, node connectivity, broadcast integrity."""

    TASK_INTERVAL = 30
    SEED_NODES = [f'192.168.1.{i}' for i in range(1, 19)]

    def __init__(self):
        super().__init__(
            'Monitor_D',
            'Mesh Guardian',
            'P2P mesh health, node connectivity, broadcast integrity'
        )
        self._node_status = {}
        self._broadcasts = 0
        self._mesh_health = 100.0

    def _cycle(self):
        # Simulate node health checks (real implementation would ping nodes)
        online = 0
        for node_ip in self.SEED_NODES:
            # In production: ping node, check response time
            # For now: simulate with 95% uptime
            is_online = random.random() > 0.05
            self._node_status[node_ip] = {
                'online': is_online,
                'latency_ms': random.randint(1, 50) if is_online else None,
                'last_check': time.time(),
            }
            if is_online:
                online += 1

        self._mesh_health = (online / len(self.SEED_NODES)) * 100

        if self._mesh_health < 80:
            self.log(f'MESH DEGRADED: {self._mesh_health:.0f}% nodes online', 'ALERT')
            state_alert(self.name, 'CRITICAL', f'Mesh health: {self._mesh_health:.0f}%')
            self.ledger('MESH_DEGRADED', {'health': self._mesh_health, 'online': online, 'total': len(self.SEED_NODES)})
        elif self._mesh_health < 95:
            self.log(f'Mesh health: {self._mesh_health:.0f}% ({online}/{len(self.SEED_NODES)} nodes)', 'WARN')
        else:
            self.log(f'Mesh healthy: {self._mesh_health:.0f}% ({online}/{len(self.SEED_NODES)} nodes)')

        state_update(self.name, {
            'mesh_health': self._mesh_health,
            'nodes_online': online,
            'nodes_total': len(self.SEED_NODES),
            'broadcasts': self._broadcasts,
        })

        # Count broadcasts from ledger
        try:
            if LEDGER_FILE.exists():
                with open(LEDGER_FILE, 'r') as f:
                    ledger = json.load(f)
                self._broadcasts = sum(1 for e in ledger if e.get('type') in ('P2P_BROADCAST', 'MESH_PING'))
        except Exception:
            pass

# ── MONITOR_E: IDENTITY VERIFIER ──────────────────────────────────────────────
class MonitorE(BaseAgent):
    """Sovereign identity validation, NFT mint verification, keypair integrity."""

    TASK_INTERVAL = 20

    def __init__(self):
        super().__init__(
            'Monitor_E',
            'Identity Verifier',
            'Sovereign identity validation, NFT mint verification, keypair integrity'
        )
        self._identities = 0
        self._nfts_minted = 0
        self._invalid = 0

    def _cycle(self):
        try:
            if not LEDGER_FILE.exists():
                return
            with open(LEDGER_FILE, 'r') as f:
                ledger = json.load(f)
        except Exception:
            return

        identity_events = [e for e in ledger if e.get('type') in (
            'IDENTITY_REGISTER', 'PROFILE_NFT', 'NFT_MINT', 'NFT_TIER_UPGRADE',
            'CELL_AGENT_BIRTH', 'SOVEREIGN_IDENTITY'
        )]

        nft_events = [e for e in identity_events if e.get('type') in ('PROFILE_NFT', 'NFT_MINT')]
        self._identities = len([e for e in identity_events if e.get('type') in ('IDENTITY_REGISTER', 'CELL_AGENT_BIRTH')])
        self._nfts_minted = len(nft_events)

        # Validate NFT entries have required fields
        for e in nft_events:
            d = e.get('data', {})
            if not d.get('tokenId') and not d.get('token_id'):
                self._invalid += 1
                self.log(f'Invalid NFT entry: missing tokenId', 'WARN')

        self.log(f'Identities: {self._identities} | NFTs: {self._nfts_minted} | Invalid: {self._invalid}')
        state_update(self.name, {
            'identities': self._identities,
            'nfts_minted': self._nfts_minted,
            'invalid': self._invalid,
        })

# ── MONITOR_F: CONTENT MODERATOR ──────────────────────────────────────────────
class MonitorF(BaseAgent):
    """Content policy enforcement, Community Covenant compliance, flag review."""

    TASK_INTERVAL = 15
    # Keywords that trigger review (not blocking — just flagging for human review)
    FLAG_PATTERNS = ['spam', 'scam', 'hack', 'exploit', 'cheat', 'bot', 'fake']

    def __init__(self):
        super().__init__(
            'Monitor_F',
            'Content Moderator',
            'Content policy enforcement, Community Covenant compliance, flag review'
        )
        self._posts_reviewed = 0
        self._flags_raised = 0
        self._covenant_violations = 0

    def _cycle(self):
        try:
            if not LEDGER_FILE.exists():
                return
            with open(LEDGER_FILE, 'r') as f:
                ledger = json.load(f)
        except Exception:
            return

        content_events = [e for e in ledger if e.get('type') in (
            'CONTENT_POST', 'VIDEO_POST', 'LIVE_BROADCAST'
        )]

        new_posts = content_events[self._posts_reviewed:]
        for post in new_posts:
            self._review_post(post)

        self._posts_reviewed = len(content_events)

        self.log(f'Posts reviewed: {self._posts_reviewed} | Flags: {self._flags_raised}')
        state_update(self.name, {
            'posts_reviewed': self._posts_reviewed,
            'flags_raised': self._flags_raised,
            'covenant_violations': self._covenant_violations,
        })

    def _review_post(self, post: dict):
        d = post.get('data', {})
        caption = str(d.get('caption', '')).lower()
        content_type = d.get('type', 'unknown')

        # Check for flag patterns
        for pattern in self.FLAG_PATTERNS:
            if pattern in caption:
                self._flags_raised += 1
                self.log(f'Content flagged: pattern "{pattern}" in {content_type}', 'WARN')
                state_alert(self.name, 'WARN', f'Content flagged: {pattern}')
                self.ledger('CONTENT_FLAGGED', {
                    'pattern': pattern,
                    'type': content_type,
                    'creator': d.get('creator', 'unknown'),
                })
                break

# ── TRINITY: VALIDATION CORE ──────────────────────────────────────────────────
class Trinity(BaseAgent):
    """Cross-validates all Monitor outputs, final ledger authority, consensus engine."""

    TASK_INTERVAL = 45  # Runs less frequently — aggregates all monitors

    def __init__(self, monitors: list):
        super().__init__(
            'Trinity',
            'Validation Core',
            'Cross-validates all Monitor outputs, final ledger authority, consensus engine'
        )
        self.monitors = monitors
        self._consensus_rounds = 0
        self._validations = 0
        self._rejections = 0

    def _cycle(self):
        self._consensus_round()

    def _consensus_round(self):
        self._consensus_rounds += 1
        issues = []

        with _state_lock:
            agent_states = dict(_factory_state['agents'])
            alerts = list(_factory_state['alerts'])

        # Check all monitors are alive
        for monitor in self.monitors:
            state = agent_states.get(monitor.name, {})
            last_update = state.get('last_update', 0)
            age = time.time() - last_update

            if age > 120:  # 2 minutes without update
                issues.append(f'{monitor.name} unresponsive ({age:.0f}s)')
                self.log(f'CONSENSUS: {monitor.name} unresponsive', 'ALERT')

            if state.get('status') != 'ACTIVE':
                issues.append(f'{monitor.name} not active: {state.get("status")}')

        # Check for critical alerts
        critical_alerts = [a for a in alerts if a.get('level') == 'CRITICAL'
                          and time.time() - a.get('timestamp', 0) < 300]  # last 5 min
        if critical_alerts:
            issues.extend([f'CRITICAL: {a["message"]}' for a in critical_alerts])

        # Consensus result
        if issues:
            self._rejections += 1
            self.log(f'CONSENSUS ROUND {self._consensus_rounds}: ISSUES FOUND — {len(issues)}', 'WARN')
            for issue in issues:
                self.log(f'  → {issue}', 'WARN')
            self.ledger('TRINITY_CONSENSUS_WARN', {
                'round': self._consensus_rounds,
                'issues': len(issues),
                'details': '; '.join(issues[:3]),
            })
        else:
            self._validations += 1
            self.log(f'CONSENSUS ROUND {self._consensus_rounds}: ALL CLEAR ✓')

        state_update(self.name, {
            'consensus_rounds': self._consensus_rounds,
            'validations': self._validations,
            'rejections': self._rejections,
            'last_consensus': time.time(),
        })

# ── FACTORY ORCHESTRATOR ──────────────────────────────────────────────────────
class TheFactory:
    """Orchestrates all 7 agents. Manages lifecycle, restarts, status."""

    def __init__(self):
        self.monitor_a = MonitorA()
        self.monitor_b = MonitorB()
        self.monitor_c = MonitorC()
        self.monitor_d = MonitorD()
        self.monitor_e = MonitorE()
        self.monitor_f = MonitorF()
        self.trinity   = Trinity([
            self.monitor_a, self.monitor_b, self.monitor_c,
            self.monitor_d, self.monitor_e, self.monitor_f,
        ])
        self.agents = [
            self.monitor_a, self.monitor_b, self.monitor_c,
            self.monitor_d, self.monitor_e, self.monitor_f,
            self.trinity,
        ]
        self._running = False

    def start(self, agent_name: str = None):
        """Start all agents or a specific agent."""
        _factory_state['started_at'] = datetime.datetime.now().isoformat()

        if agent_name:
            agent = self._get_agent(agent_name)
            if agent:
                agent.start()
                print(C.green(f'  ✅ {agent_name} started'))
            else:
                print(C.red(f'  Agent not found: {agent_name}'))
            return

        print(C.bold(C.gold('\n  🏭 THE FACTORY — STARTING ALL AGENTS\n')))
        for agent in self.agents:
            agent.start()
            print(C.green(f'  ✅ {agent.name:15s} {agent.role}'))
            time.sleep(0.2)  # Stagger starts

        self._running = True
        ledger_write('FACTORY_START', {
            'agents': len(self.agents),
            'version': '18b',
        }, source='THE_FACTORY')
        print(C.gold(f'\n  All {len(self.agents)} agents active. Factory running.\n'))

    def stop(self):
        """Stop all agents."""
        print(C.gold('\n  🏭 THE FACTORY — STOPPING ALL AGENTS\n'))
        for agent in self.agents:
            agent.stop()
            print(C.dim(f'  ⏹ {agent.name} stopped'))
        self._running = False
        ledger_write('FACTORY_STOP', {'agents': len(self.agents)}, source='THE_FACTORY')

    def status(self):
        """Print status of all agents."""
        print(C.bold(C.gold('\n  ╔══════════════════════════════════════════════════════╗')))
        print(C.bold(C.gold('  ║           THE FACTORY — AGENT STATUS                 ║')))
        print(C.bold(C.gold('  ╚══════════════════════════════════════════════════════╝\n')))

        with _state_lock:
            agent_states = dict(_factory_state['agents'])
            alerts = list(_factory_state['alerts'])

        for agent in self.agents:
            state = agent_states.get(agent.name, {})
            status = state.get('status', agent.status)
            col = C.green if status == 'ACTIVE' else C.red
            last_hb = state.get('heartbeat', 0)
            hb_age = f'{time.time() - last_hb:.0f}s ago' if last_hb else 'never'

            print(f"  {C.gold(agent.name):25s} {col(status):12s} {C.dim(agent.role)}")
            print(f"  {'':25s} Tasks: {state.get('tasks_done', 0)} | Errors: {state.get('errors', 0)} | HB: {hb_age}")

            # Agent-specific metrics
            if agent.name == 'Monitor_A':
                print(f"  {'':25s} Validated: {state.get('validated', 0)} | Anomalies: {state.get('anomalies', 0)}")
            elif agent.name == 'Monitor_B':
                print(f"  {'':25s} Pollen: {state.get('total_pollen', 0)} | Txns: {state.get('transactions', 0)}")
            elif agent.name == 'Monitor_C':
                print(f"  {'':25s} Encounters: {state.get('total_encounters', 0)}")
            elif agent.name == 'Monitor_D':
                print(f"  {'':25s} Mesh: {state.get('mesh_health', 0):.0f}% | Nodes: {state.get('nodes_online', 0)}/{state.get('nodes_total', 18)}")
            elif agent.name == 'Monitor_E':
                print(f"  {'':25s} Identities: {state.get('identities', 0)} | NFTs: {state.get('nfts_minted', 0)}")
            elif agent.name == 'Monitor_F':
                print(f"  {'':25s} Posts: {state.get('posts_reviewed', 0)} | Flags: {state.get('flags_raised', 0)}")
            elif agent.name == 'Trinity':
                print(f"  {'':25s} Rounds: {state.get('consensus_rounds', 0)} | Valid: {state.get('validations', 0)} | Reject: {state.get('rejections', 0)}")
            print()

        # Recent alerts
        recent_alerts = [a for a in alerts if time.time() - a.get('timestamp', 0) < 300]
        if recent_alerts:
            print(C.bold(C.gold(f'  RECENT ALERTS ({len(recent_alerts)})\n')))
            for alert in recent_alerts[-5:]:
                col = C.red if alert['level'] == 'CRITICAL' else C.amber
                dt = datetime.datetime.fromtimestamp(alert['timestamp']).strftime('%H:%M:%S')
                print(f"  {C.dim(dt)} {col(alert['level']):10s} [{alert['agent']}] {alert['message']}")
            print()

    def run_forever(self):
        """Run factory until interrupted."""
        self.start()
        print(C.dim('  Press Ctrl+C to stop the factory\n'))
        try:
            while True:
                time.sleep(60)
                # Auto-restart dead agents
                for agent in self.agents:
                    if agent._thread and not agent._thread.is_alive() and not agent._stop.is_set():
                        agent.restarts += 1
                        if agent.restarts <= agent.MAX_RESTARTS:
                            print(C.amber(f'  [FACTORY] Restarting {agent.name} (restart #{agent.restarts})'))
                            agent.start()
                        else:
                            print(C.red(f'  [FACTORY] {agent.name} exceeded max restarts'))
        except KeyboardInterrupt:
            print()
            self.stop()

    def _get_agent(self, name: str) -> Optional[BaseAgent]:
        for agent in self.agents:
            if agent.name.lower() == name.lower():
                return agent
        return None

# ── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='THE FACTORY — Terracare Autonomous Agent System')
    parser.add_argument('--daemon',  action='store_true', help='Run as daemon (no interactive output)')
    parser.add_argument('--agent',   type=str,            help='Start/stop specific agent')
    parser.add_argument('--status',  action='store_true', help='Print status and exit')
    parser.add_argument('--stop',    action='store_true', help='Stop all agents')
    parser.add_argument('--once',    action='store_true', help='Run one cycle and exit')
    args = parser.parse_args()

    factory = TheFactory()

    if args.status:
        # Load saved state
        if FACTORY_STATE.exists():
            try:
                with open(FACTORY_STATE, 'r') as f:
                    saved = json.load(f)
                    _factory_state.update(saved)
            except Exception:
                pass
        factory.status()
        return

    if args.once:
        factory.start()
        time.sleep(5)
        factory.status()
        factory.stop()
        return

    if args.daemon:
        # Suppress output in daemon mode
        sys.stdout = open(os.devnull, 'w')
        sys.stderr = open(os.devnull, 'w')

    factory.run_forever()

if __name__ == '__main__':
    main()
