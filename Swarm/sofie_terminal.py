#!/usr/bin/env python3
# ── PHASE 17b: S.O.F.I.E TERMINAL ────────────────────────────────────────────
# Sovereign Operational Field Intelligence Engine
# Python terminal with speech, Llama integration, The Factory agents, auto-start
# Usage: python sofie_terminal.py [--no-speech] [--no-llama] [--port 7700]
# ─────────────────────────────────────────────────────────────────────────────
"""
S.O.F.I.E — Sovereign Operational Field Intelligence Engine
Terracare Ecosystem — Phase 17b

Commands:
  sofie tail          — tail SOFIE_Core.log live
  sofie stats         — ecosystem stats (nodes, pollen, fauna, ledger)
  sofie users         — list active Cell Agents
  sofie factory       — show Factory agent status
  sofie spawn <name>  — spawn a new Factory agent
  sofie speak <text>  — speak text via TTS
  sofie ask <prompt>  — ask Llama (if available)
  sofie ledger        — show recent ledger entries
  sofie help          — show all commands
  exit / quit         — exit SOFIE terminal
"""

import os
import sys
import json
import time
import threading
import subprocess
import argparse
import signal
import socket
import hashlib
import datetime
import platform
from pathlib import Path

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
LOG_FILE    = BASE_DIR / 'SOFIE_Core.log'
LEDGER_FILE = BASE_DIR / 'terracare_ledger.json'
AGENTS_FILE = BASE_DIR / 'factory_agents.json'
USERS_FILE  = BASE_DIR / 'cell_agents.json'

# ── COLOURS ───────────────────────────────────────────────────────────────────
class C:
    GOLD   = '\033[38;5;214m'
    AMBER  = '\033[38;5;208m'
    GREEN  = '\033[38;5;82m'
    CYAN   = '\033[38;5;51m'
    RED    = '\033[38;5;196m'
    WHITE  = '\033[97m'
    DIM    = '\033[2m'
    BOLD   = '\033[1m'
    RESET  = '\033[0m'
    CLEAR  = '\033[2J\033[H'

    @staticmethod
    def gold(s):   return f'{C.GOLD}{s}{C.RESET}'
    @staticmethod
    def amber(s):  return f'{C.AMBER}{s}{C.RESET}'
    @staticmethod
    def green(s):  return f'{C.GREEN}{s}{C.RESET}'
    @staticmethod
    def cyan(s):   return f'{C.CYAN}{s}{C.RESET}'
    @staticmethod
    def red(s):    return f'{C.RED}{s}{C.RESET}'
    @staticmethod
    def dim(s):    return f'{C.DIM}{s}{C.RESET}'
    @staticmethod
    def bold(s):   return f'{C.BOLD}{s}{C.RESET}'

# ── LOGGER ────────────────────────────────────────────────────────────────────
def log(msg, level='INFO'):
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    entry = f'[{ts}] [{level}] {msg}'
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(entry + '\n')
    except Exception:
        pass
    return entry

def ledger_entry(action, data=None):
    """Write Underscore Protocol ledger entry."""
    ts = int(time.time() * 1000)
    entry = f'_[{ts}]_ {action}'
    if data:
        for k, v in data.items():
            entry += f' | {k}: {v}'
    entry += ' | ECOSYSTEM: TERRACARE_LEDGER'
    log(entry, 'LEDGER')

    # Also write to JSON ledger
    try:
        ledger = []
        if LEDGER_FILE.exists():
            with open(LEDGER_FILE, 'r', encoding='utf-8') as f:
                ledger = json.load(f)
        ledger.append({
            'type': action,
            'timestamp': ts,
            'data': data or {},
            'source': 'SOFIE_TERMINAL'
        })
        with open(LEDGER_FILE, 'w', encoding='utf-8') as f:
            json.dump(ledger[-500:], f, indent=2)  # keep last 500
    except Exception:
        pass

# ── SPEECH ENGINE ─────────────────────────────────────────────────────────────
class SpeechEngine:
    def __init__(self, enabled=True):
        self.enabled = enabled
        self.engine  = None
        self._init()

    def _init(self):
        if not self.enabled:
            return
        # Try pyttsx3 first (offline, cross-platform)
        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', 165)
            self.engine.setProperty('volume', 0.9)
            # Try to find a female voice
            voices = self.engine.getProperty('voices')
            for v in voices:
                if any(x in v.name.lower() for x in ['female', 'zira', 'samantha', 'karen', 'victoria']):
                    self.engine.setProperty('voice', v.id)
                    break
            print(C.green('  [SPEECH] pyttsx3 engine ready'))
            return
        except ImportError:
            pass

        # Try espeak (Linux)
        if platform.system() == 'Linux':
            try:
                subprocess.run(['espeak', '--version'], capture_output=True, check=True)
                self.engine = 'espeak'
                print(C.green('  [SPEECH] espeak engine ready'))
                return
            except Exception:
                pass

        # Try say (macOS)
        if platform.system() == 'Darwin':
            self.engine = 'say'
            print(C.green('  [SPEECH] macOS say engine ready'))
            return

        # Try PowerShell TTS (Windows)
        if platform.system() == 'Windows':
            self.engine = 'powershell'
            print(C.green('  [SPEECH] Windows TTS engine ready'))
            return

        print(C.dim('  [SPEECH] No TTS engine found — speech disabled'))
        print(C.dim('           Install: pip install pyttsx3'))
        self.enabled = False

    def speak(self, text, async_=True):
        if not self.enabled or not self.engine:
            return
        if async_:
            t = threading.Thread(target=self._speak_sync, args=(text,), daemon=True)
            t.start()
        else:
            self._speak_sync(text)

    def _speak_sync(self, text):
        try:
            if hasattr(self.engine, 'say'):
                # pyttsx3
                self.engine.say(text)
                self.engine.runAndWait()
            elif self.engine == 'espeak':
                subprocess.run(['espeak', '-s', '165', '-v', 'en+f3', text],
                               capture_output=True)
            elif self.engine == 'say':
                subprocess.run(['say', '-r', '165', text], capture_output=True)
            elif self.engine == 'powershell':
                ps_cmd = f'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 2; $s.Speak("{text}")'
                subprocess.run(['powershell', '-Command', ps_cmd],
                               capture_output=True, timeout=15)
        except Exception as e:
            pass  # Speech errors are non-fatal

# ── LLAMA ENGINE ─────────────────────────────────────────────────────────────
class LlamaEngine:
    def __init__(self, enabled=True):
        self.enabled = enabled
        self.client  = None
        self.model   = None
        self._init()

    def _init(self):
        if not self.enabled:
            return

        # Try ollama (local Llama server)
        try:
            import urllib.request
            req = urllib.request.urlopen('http://localhost:11434/api/tags', timeout=2)
            data = json.loads(req.read())
            models = [m['name'] for m in data.get('models', [])]
            if models:
                # Prefer llama3, llama2, mistral, phi in that order
                for preferred in ['llama3', 'llama3.2', 'llama3.1', 'llama2', 'mistral', 'phi3', 'phi']:
                    for m in models:
                        if preferred in m.lower():
                            self.model = m
                            break
                    if self.model:
                        break
                if not self.model:
                    self.model = models[0]
                self.client = 'ollama'
                print(C.green(f'  [LLAMA] Ollama ready — model: {self.model}'))
                return
        except Exception:
            pass

        # Try llama-cpp-python
        try:
            from llama_cpp import Llama
            # Look for GGUF models in common locations
            model_paths = [
                Path.home() / '.ollama' / 'models',
                Path('/usr/local/lib/llama'),
                BASE_DIR / 'models',
                Path.home() / 'models',
            ]
            for mp in model_paths:
                if mp.exists():
                    gguf_files = list(mp.glob('**/*.gguf'))
                    if gguf_files:
                        self.model = str(gguf_files[0])
                        self.client = Llama(model_path=self.model, n_ctx=2048, verbose=False)
                        print(C.green(f'  [LLAMA] llama-cpp ready — {Path(self.model).name}'))
                        return
        except ImportError:
            pass

        print(C.dim('  [LLAMA] No Llama engine found — AI responses disabled'))
        print(C.dim('           Install ollama: https://ollama.ai'))
        print(C.dim('           Then: ollama pull llama3'))
        self.enabled = False

    def ask(self, prompt, system=None):
        if not self.enabled or not self.client:
            return '[LLAMA] No AI engine available. Install ollama: https://ollama.ai'

        sys_prompt = system or (
            'You are S.O.F.I.E — Sovereign Operational Field Intelligence Engine for the Terracare ecosystem. '
            'You are concise, precise, and sovereign. You help manage the Terracare Ledger, Cell Agents, '
            'Pollen economy, and Fauna tracking system. Respond in 2-3 sentences max unless asked for more.'
        )

        try:
            if self.client == 'ollama':
                return self._ask_ollama(prompt, sys_prompt)
            else:
                return self._ask_llama_cpp(prompt, sys_prompt)
        except Exception as e:
            return f'[LLAMA] Error: {e}'

    def _ask_ollama(self, prompt, system):
        import urllib.request
        payload = json.dumps({
            'model': self.model,
            'prompt': prompt,
            'system': system,
            'stream': False,
            'options': {'temperature': 0.7, 'num_predict': 256}
        }).encode()
        req = urllib.request.Request(
            'http://localhost:11434/api/generate',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data.get('response', '').strip()

    def _ask_llama_cpp(self, prompt, system):
        full_prompt = f'<s>[INST] <<SYS>>\n{system}\n<</SYS>>\n\n{prompt} [/INST]'
        output = self.client(full_prompt, max_tokens=256, temperature=0.7, stop=['</s>'])
        return output['choices'][0]['text'].strip()

# ── FACTORY AGENTS ────────────────────────────────────────────────────────────
FACTORY_AGENTS = {
    'Monitor_A': {
        'role': 'Ledger Witness',
        'desc': 'Monitors all ledger writes, validates Underscore Protocol entries',
        'status': 'ACTIVE',
        'tasks': ['validate_ledger', 'detect_anomalies', 'sign_entries'],
    },
    'Monitor_B': {
        'role': 'Pollen Economist',
        'desc': 'Tracks Pollen flows, enforces 70/4/15/5/6 split, flags irregularities',
        'status': 'ACTIVE',
        'tasks': ['track_pollen', 'enforce_split', 'generate_reports'],
    },
    'Monitor_C': {
        'role': 'Fauna Tracker',
        'desc': 'Monitors fauna encounter rates, rarity distribution, GPS clusters',
        'status': 'ACTIVE',
        'tasks': ['track_encounters', 'update_rarity', 'cluster_analysis'],
    },
    'Monitor_D': {
        'role': 'Mesh Guardian',
        'desc': 'P2P mesh health, node connectivity, broadcast integrity',
        'status': 'ACTIVE',
        'tasks': ['mesh_health', 'node_ping', 'broadcast_verify'],
    },
    'Monitor_E': {
        'role': 'Identity Verifier',
        'desc': 'Sovereign identity validation, NFT mint verification, keypair integrity',
        'status': 'ACTIVE',
        'tasks': ['verify_identity', 'validate_nft', 'keypair_check'],
    },
    'Monitor_F': {
        'role': 'Content Moderator',
        'desc': 'Content policy enforcement, Community Covenant compliance, flag review',
        'status': 'ACTIVE',
        'tasks': ['content_scan', 'covenant_check', 'flag_review'],
    },
    'Trinity': {
        'role': 'Validation Core',
        'desc': 'Cross-validates all Monitor outputs, final ledger authority, consensus engine',
        'status': 'ACTIVE',
        'tasks': ['cross_validate', 'consensus', 'final_authority'],
    },
}

class FactoryManager:
    def __init__(self):
        self.agents = dict(FACTORY_AGENTS)
        self._load()

    def _load(self):
        if AGENTS_FILE.exists():
            try:
                with open(AGENTS_FILE, 'r') as f:
                    saved = json.load(f)
                    self.agents.update(saved)
            except Exception:
                pass

    def _save(self):
        try:
            with open(AGENTS_FILE, 'w') as f:
                json.dump(self.agents, f, indent=2)
        except Exception:
            pass

    def status(self):
        lines = []
        lines.append(C.bold(C.gold('  ╔══════════════════════════════════════════════╗')))
        lines.append(C.bold(C.gold('  ║         THE FACTORY — AGENT STATUS           ║')))
        lines.append(C.bold(C.gold('  ╚══════════════════════════════════════════════╝')))
        for name, agent in self.agents.items():
            status_col = C.green if agent['status'] == 'ACTIVE' else C.red
            lines.append(
                f"  {C.gold(name):30s} {status_col(agent['status']):12s} "
                f"{C.dim(agent['role'])}"
            )
            lines.append(f"  {C.dim('  ' + agent['desc'])}")
        return '\n'.join(lines)

    def spawn(self, name, role='Custom Agent', desc='User-defined agent'):
        agent_id = f'Agent_{name}_{int(time.time())}'
        self.agents[agent_id] = {
            'role': role,
            'desc': desc,
            'status': 'ACTIVE',
            'tasks': ['custom'],
            'spawned_at': datetime.datetime.now().isoformat(),
            'spawned_by': 'SOFIE_TERMINAL',
        }
        self._save()
        ledger_entry('AGENT_SPAWN', {'agent': agent_id, 'role': role})
        return agent_id

    def get_agent(self, name):
        return self.agents.get(name)

# ── CELL AGENT MANAGER ────────────────────────────────────────────────────────
class CellAgentManager:
    def __init__(self):
        self.agents = []
        self._load()

    def _load(self):
        if USERS_FILE.exists():
            try:
                with open(USERS_FILE, 'r') as f:
                    self.agents = json.load(f)
            except Exception:
                pass

    def list_agents(self):
        if not self.agents:
            return C.dim('  No Cell Agents registered yet.')
        lines = [C.bold(C.gold(f'  CELL AGENTS ({len(self.agents)} registered)'))]
        for a in self.agents[-20:]:  # show last 20
            ts = a.get('timestamp', 0)
            dt = datetime.datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d %H:%M') if ts else 'unknown'
            lines.append(
                f"  {C.gold(a.get('handle', 'unknown')):20s} "
                f"{C.cyan(a.get('publicKey', '')[:16] + '...' if a.get('publicKey') else 'no key'):22s} "
                f"{C.dim(dt)}"
            )
        return '\n'.join(lines)

    def count(self):
        return len(self.agents)

# ── STATS ENGINE ──────────────────────────────────────────────────────────────
class StatsEngine:
    def __init__(self, cell_mgr, factory_mgr):
        self.cell_mgr    = cell_mgr
        self.factory_mgr = factory_mgr

    def get_stats(self):
        # Read ledger
        ledger = []
        if LEDGER_FILE.exists():
            try:
                with open(LEDGER_FILE, 'r') as f:
                    ledger = json.load(f)
            except Exception:
                pass

        # Count event types
        event_counts = {}
        total_pollen = 0
        for entry in ledger:
            t = entry.get('type', 'UNKNOWN')
            event_counts[t] = event_counts.get(t, 0) + 1
            if t in ('FAUNA_ENCOUNTER', 'BLOOM_HARVEST', 'CONTENT_POST', 'POLLEN_PURCHASE'):
                d = entry.get('data', {})
                total_pollen += int(d.get('pollen', 0) or d.get('pts', 0) or 0)

        # Node count
        node_count = 18  # seed nodes

        lines = []
        lines.append(C.bold(C.gold('  ╔══════════════════════════════════════════════╗')))
        lines.append(C.bold(C.gold('  ║         TERRACARE ECOSYSTEM STATS            ║')))
        lines.append(C.bold(C.gold('  ╚══════════════════════════════════════════════╝')))
        lines.append(f"  {C.gold('Swarm Nodes')}        {C.green(str(node_count))}")
        lines.append(f"  {C.gold('Cell Agents')}        {C.green(str(self.cell_mgr.count()))}")
        lines.append(f"  {C.gold('Factory Agents')}     {C.green(str(len(self.factory_mgr.agents)))}")
        lines.append(f"  {C.gold('Ledger Entries')}     {C.green(str(len(ledger)))}")
        lines.append(f"  {C.gold('Total Pollen')}       {C.green(str(total_pollen))}")
        lines.append('')
        lines.append(C.dim('  Event Breakdown:'))
        for evt, count in sorted(event_counts.items(), key=lambda x: -x[1])[:10]:
            lines.append(f"  {C.dim(evt):35s} {C.amber(str(count))}")
        lines.append('')
        lines.append(f"  {C.dim('Log file:')} {C.dim(str(LOG_FILE))}")
        lines.append(f"  {C.dim('Ledger:')}   {C.dim(str(LEDGER_FILE))}")
        return '\n'.join(lines)

# ── LOG TAILER ────────────────────────────────────────────────────────────────
class LogTailer:
    def __init__(self, log_file, lines=20):
        self.log_file = log_file
        self.lines    = lines
        self._stop    = threading.Event()

    def tail_once(self):
        if not self.log_file.exists():
            return C.dim('  [LOG] No log file yet — actions will appear here')
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                all_lines = f.readlines()
            recent = all_lines[-self.lines:]
            result = []
            for line in recent:
                line = line.rstrip()
                if '[LEDGER]' in line:
                    result.append(C.gold('  ' + line))
                elif '[ERROR]' in line or '[WARN]' in line:
                    result.append(C.red('  ' + line))
                elif '[INFO]' in line:
                    result.append(C.dim('  ' + line))
                else:
                    result.append('  ' + line)
            return '\n'.join(result)
        except Exception as e:
            return C.red(f'  [LOG] Error reading log: {e}')

    def tail_live(self, callback):
        """Live tail — calls callback with each new line."""
        self._stop.clear()
        if not self.log_file.exists():
            self.log_file.touch()

        def _tail():
            with open(self.log_file, 'r', encoding='utf-8') as f:
                f.seek(0, 2)  # seek to end
                while not self._stop.is_set():
                    line = f.readline()
                    if line:
                        callback(line.rstrip())
                    else:
                        time.sleep(0.1)

        t = threading.Thread(target=_tail, daemon=True)
        t.start()
        return t

    def stop(self):
        self._stop.set()

# ── SOFIE TERMINAL ────────────────────────────────────────────────────────────
class SOFIETerminal:
    def __init__(self, args):
        self.args         = args
        self.speech       = SpeechEngine(enabled=not args.no_speech)
        self.llama        = LlamaEngine(enabled=not args.no_llama)
        self.factory      = FactoryManager()
        self.cell_mgr     = CellAgentManager()
        self.stats_engine = StatsEngine(self.cell_mgr, self.factory)
        self.tailer       = LogTailer(LOG_FILE)
        self._running     = True

    def banner(self):
        print(C.CLEAR)
        print(C.bold(C.gold('''
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ███████╗ ██████╗ ███████╗██╗███████╗                   ║
  ║   ██╔════╝██╔═══██╗██╔════╝██║██╔════╝                   ║
  ║   ███████╗██║   ██║█████╗  ██║█████╗                     ║
  ║   ╚════██║██║   ██║██╔══╝  ██║██╔══╝                     ║
  ║   ███████║╚██████╔╝██║     ██║███████╗                   ║
  ║   ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝                   ║
  ║                                                           ║
  ║   Sovereign Operational Field Intelligence Engine         ║
  ║   Terracare Ecosystem — Phase 17b                         ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
''')))
        print(C.dim(f'  Nodes: 18 | Agents: {len(self.factory.agents)} | Users: {self.cell_mgr.count()}'))
        print(C.dim(f'  Speech: {"ON" if self.speech.enabled else "OFF"} | Llama: {"ON" if self.llama.enabled else "OFF"}'))
        print(C.dim(f'  Log: {LOG_FILE}'))
        print()
        print(C.gold('  Type "help" for commands. Type "exit" to quit.'))
        print()

    def prompt(self):
        try:
            return input(C.gold('  SOFIE › ') + C.RESET).strip()
        except (EOFError, KeyboardInterrupt):
            return 'exit'

    def handle(self, cmd):
        if not cmd:
            return

        parts = cmd.split(None, 1)
        verb  = parts[0].lower()
        rest  = parts[1] if len(parts) > 1 else ''

        if verb in ('exit', 'quit', 'q'):
            self._running = False
            print(C.gold('\n  🐝 SOFIE signing off. Sovereign ledger secured.\n'))
            ledger_entry('SOFIE_EXIT', {'session': 'terminal'})
            self.speech.speak('Signing off. Sovereign ledger secured.')
            return

        elif verb == 'help':
            self._help()

        elif verb == 'tail':
            self._tail(rest)

        elif verb == 'stats':
            print(self.stats_engine.get_stats())

        elif verb == 'users':
            print(self.cell_mgr.list_agents())

        elif verb == 'factory':
            print(self.factory.status())

        elif verb == 'spawn':
            if not rest:
                print(C.red('  Usage: spawn <agent_name>'))
                return
            agent_id = self.factory.spawn(rest)
            print(C.green(f'  ✅ Agent spawned: {agent_id}'))
            self.speech.speak(f'Agent {rest} spawned and active.')

        elif verb == 'speak':
            if not rest:
                print(C.red('  Usage: speak <text>'))
                return
            self.speech.speak(rest, async_=False)
            print(C.dim(f'  [SPEECH] "{rest}"'))

        elif verb == 'ask':
            if not rest:
                print(C.red('  Usage: ask <prompt>'))
                return
            print(C.dim('  [LLAMA] Thinking...'))
            response = self.llama.ask(rest)
            print(C.cyan(f'\n  SOFIE: {response}\n'))
            self.speech.speak(response)
            ledger_entry('SOFIE_ASK', {'prompt': rest[:80], 'model': self.llama.model or 'none'})

        elif verb == 'ledger':
            self._show_ledger(rest)

        elif verb == 'clear':
            print(C.CLEAR)

        elif verb == 'log':
            print(self.tailer.tail_once())

        elif verb == 'nodes':
            self._show_nodes()

        elif verb == 'pollen':
            self._show_pollen()

        elif verb == 'agent':
            if rest:
                agent = self.factory.get_agent(rest)
                if agent:
                    print(C.gold(f'\n  {rest}'))
                    for k, v in agent.items():
                        print(f'  {C.dim(k):20s} {v}')
                    print()
                else:
                    print(C.red(f'  Agent not found: {rest}'))
            else:
                print(C.red('  Usage: agent <name>'))

        elif verb == 'version':
            print(C.gold('  S.O.F.I.E v1.0.0 — Phase 17b — Terracare Ecosystem'))

        else:
            # Try Llama for unknown commands
            if self.llama.enabled:
                print(C.dim(f'  [SOFIE] Unknown command "{verb}" — asking Llama...'))
                response = self.llama.ask(f'The user typed: "{cmd}". Respond as SOFIE.')
                print(C.cyan(f'\n  SOFIE: {response}\n'))
                self.speech.speak(response)
            else:
                print(C.red(f'  Unknown command: {verb}. Type "help" for commands.'))

    def _help(self):
        cmds = [
            ('tail [n]',      'Live tail SOFIE_Core.log (n = lines, default 20)'),
            ('stats',         'Ecosystem stats — nodes, pollen, fauna, ledger'),
            ('users',         'List active Cell Agents'),
            ('factory',       'Show Factory agent status'),
            ('spawn <name>',  'Spawn a new Factory agent'),
            ('agent <name>',  'Show agent details'),
            ('speak <text>',  'Speak text via TTS'),
            ('ask <prompt>',  'Ask Llama AI (if available)'),
            ('ledger [n]',    'Show recent ledger entries (n = count, default 10)'),
            ('log',           'Show recent log entries'),
            ('nodes',         'Show Swarm node status'),
            ('pollen',        'Show Pollen economy summary'),
            ('clear',         'Clear terminal'),
            ('version',       'Show SOFIE version'),
            ('exit / quit',   'Exit SOFIE terminal'),
        ]
        print(C.bold(C.gold('\n  S.O.F.I.E COMMANDS\n')))
        for cmd, desc in cmds:
            print(f"  {C.gold(cmd):25s} {C.dim(desc)}")
        print()

    def _tail(self, rest):
        n = 20
        try:
            n = int(rest) if rest else 20
        except ValueError:
            pass

        print(C.gold(f'\n  📋 SOFIE_Core.log — last {n} lines (Ctrl+C to stop live tail)\n'))
        tailer = LogTailer(LOG_FILE, lines=n)
        print(tailer.tail_once())
        print(C.dim('\n  [LIVE] Watching for new entries...\n'))

        def on_line(line):
            if '[LEDGER]' in line:
                print(C.gold('  ' + line))
            elif '[ERROR]' in line:
                print(C.red('  ' + line))
            else:
                print(C.dim('  ' + line))

        t = tailer.tail_live(on_line)
        try:
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            tailer.stop()
            print(C.dim('\n  [TAIL] Stopped\n'))

    def _show_ledger(self, rest):
        n = 10
        try:
            n = int(rest) if rest else 10
        except ValueError:
            pass

        ledger = []
        if LEDGER_FILE.exists():
            try:
                with open(LEDGER_FILE, 'r') as f:
                    ledger = json.load(f)
            except Exception:
                pass

        if not ledger:
            print(C.dim('  No ledger entries yet.'))
            return

        recent = ledger[-n:]
        print(C.bold(C.gold(f'\n  TERRACARE LEDGER — last {n} entries\n')))
        for entry in reversed(recent):
            ts = entry.get('timestamp', 0)
            dt = datetime.datetime.fromtimestamp(ts/1000).strftime('%H:%M:%S') if ts else '??:??:??'
            t  = entry.get('type', 'UNKNOWN')
            d  = entry.get('data', {})
            d_str = ' | '.join(f'{k}: {v}' for k, v in list(d.items())[:3])
            print(f"  {C.dim(dt)} {C.gold(t):30s} {C.dim(d_str)}")
        print()

    def _show_nodes(self):
        print(C.bold(C.gold('\n  SWARM NODES — 18 SEED NODES\n')))
        nodes = [
            ('VIC_MASTER',  '192.168.1.1',  'ACTIVE', 'Victoria Master'),
            ('HP_GEN8',     '192.168.1.2',  'ACTIVE', 'HP Gen 8 Server'),
            ('NODE_03',     '192.168.1.3',  'ACTIVE', 'Seed Node 3'),
            ('NODE_04',     '192.168.1.4',  'ACTIVE', 'Seed Node 4'),
            ('NODE_05',     '192.168.1.5',  'ACTIVE', 'Seed Node 5'),
            ('NODE_06',     '192.168.1.6',  'STANDBY','Seed Node 6'),
            ('NODE_07',     '192.168.1.7',  'ACTIVE', 'Seed Node 7'),
            ('NODE_08',     '192.168.1.8',  'ACTIVE', 'Seed Node 8'),
            ('NODE_09',     '192.168.1.9',  'ACTIVE', 'Seed Node 9'),
            ('NODE_10',     '192.168.1.10', 'ACTIVE', 'Seed Node 10'),
            ('NODE_11',     '192.168.1.11', 'ACTIVE', 'Seed Node 11'),
            ('NODE_12',     '192.168.1.12', 'STANDBY','Seed Node 12'),
            ('NODE_13',     '192.168.1.13', 'ACTIVE', 'Seed Node 13'),
            ('NODE_14',     '192.168.1.14', 'ACTIVE', 'Seed Node 14'),
            ('NODE_15',     '192.168.1.15', 'ACTIVE', 'Seed Node 15'),
            ('NODE_16',     '192.168.1.16', 'ACTIVE', 'Seed Node 16'),
            ('NODE_17',     '192.168.1.17', 'ACTIVE', 'Seed Node 17'),
            ('NODE_18',     '192.168.1.18', 'ACTIVE', 'Seed Node 18'),
        ]
        for node_id, ip, status, desc in nodes:
            col = C.green if status == 'ACTIVE' else C.amber
            print(f"  {C.gold(node_id):15s} {C.dim(ip):18s} {col(status):10s} {C.dim(desc)}")
        print()

    def _show_pollen(self):
        ledger = []
        if LEDGER_FILE.exists():
            try:
                with open(LEDGER_FILE, 'r') as f:
                    ledger = json.load(f)
            except Exception:
                pass

        total = sum(
            int(e.get('data', {}).get('pollen', 0) or 0)
            for e in ledger
        )
        purchases = sum(1 for e in ledger if e.get('type') == 'POLLEN_PURCHASE')
        fauna_catches = sum(1 for e in ledger if e.get('type') == 'FAUNA_ENCOUNTER')

        print(C.bold(C.gold('\n  POLLEN ECONOMY\n')))
        print(f"  {C.gold('Total Pollen Earned')}    {C.green(str(total))}")
        print(f"  {C.gold('Fauna Catches')}          {C.green(str(fauna_catches))}")
        print(f"  {C.gold('Pollen Purchases')}       {C.green(str(purchases))}")
        print()
        print(C.dim('  Revenue Split: 70% User | 4% Conservation | 15% Ecosystem | 5% Dev | 6% Platform'))
        print()

    def run(self):
        self.banner()
        ledger_entry('SOFIE_START', {'version': '1.0.0', 'phase': '17b'})
        log('SOFIE Terminal started', 'INFO')
        self.speech.speak('S.O.F.I.E online. Sovereign ecosystem ready.')

        while self._running:
            try:
                cmd = self.prompt()
                if cmd:
                    log(f'CMD: {cmd}', 'INFO')
                    self.handle(cmd)
            except KeyboardInterrupt:
                print()
                continue
            except Exception as e:
                print(C.red(f'  [ERROR] {e}'))
                log(f'Terminal error: {e}', 'ERROR')

# ── AUTO-START SERVICE ────────────────────────────────────────────────────────
def install_autostart():
    """Install SOFIE as a system service / startup item."""
    system = platform.system()
    script_path = Path(__file__).resolve()

    if system == 'Linux':
        service = f"""[Unit]
Description=S.O.F.I.E Terracare Intelligence Engine
After=network.target

[Service]
Type=simple
ExecStart={sys.executable} {script_path} --no-speech --no-llama
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
        service_path = Path('/etc/systemd/system/sofie.service')
        try:
            service_path.write_text(service)
            subprocess.run(['systemctl', 'daemon-reload'], check=True)
            subprocess.run(['systemctl', 'enable', 'sofie'], check=True)
            print(C.green('  ✅ SOFIE installed as systemd service'))
            print(C.dim('     Start: sudo systemctl start sofie'))
            print(C.dim('     Logs:  journalctl -u sofie -f'))
        except PermissionError:
            print(C.red('  Run with sudo to install service'))

    elif system == 'Darwin':
        plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.terracare.sofie</string>
    <key>ProgramArguments</key>
    <array>
        <string>{sys.executable}</string>
        <string>{script_path}</string>
        <string>--no-speech</string>
        <string>--no-llama</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{LOG_FILE}</string>
    <key>StandardErrorPath</key>
    <string>{LOG_FILE}</string>
</dict>
</plist>"""
        plist_path = Path.home() / 'Library/LaunchAgents/com.terracare.sofie.plist'
        plist_path.write_text(plist)
        subprocess.run(['launchctl', 'load', str(plist_path)])
        print(C.green('  ✅ SOFIE installed as macOS LaunchAgent'))

    elif system == 'Windows':
        bat = f'@echo off\n"{sys.executable}" "{script_path}" --no-speech --no-llama\n'
        startup = Path(os.environ.get('APPDATA', '')) / 'Microsoft/Windows/Start Menu/Programs/Startup/sofie.bat'
        startup.write_text(bat)
        print(C.green(f'  ✅ SOFIE added to Windows startup: {startup}'))

    else:
        print(C.red(f'  Auto-start not supported on {system}'))

# ── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='S.O.F.I.E — Sovereign Operational Field Intelligence Engine'
    )
    parser.add_argument('--no-speech',   action='store_true', help='Disable TTS speech')
    parser.add_argument('--no-llama',    action='store_true', help='Disable Llama AI')
    parser.add_argument('--port',        type=int, default=7700, help='API port (future use)')
    parser.add_argument('--install',     action='store_true', help='Install as system service')
    parser.add_argument('--log',         action='store_true', help='Just tail the log and exit')
    parser.add_argument('--stats',       action='store_true', help='Print stats and exit')
    args = parser.parse_args()

    if args.install:
        install_autostart()
        return

    if args.log:
        tailer = LogTailer(LOG_FILE, lines=50)
        print(tailer.tail_once())
        return

    if args.stats:
        factory = FactoryManager()
        cell_mgr = CellAgentManager()
        stats = StatsEngine(cell_mgr, factory)
        print(stats.get_stats())
        return

    terminal = SOFIETerminal(args)
    terminal.run()

if __name__ == '__main__':
    main()
