# TERRACARE LEDGER
### Sovereign Ecosystem Ledger | Harmonic Habitats

> *Every action signed. Every entry timestamped. Every record permanent. No central authority.*

---

## ECOSYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    TERRACARE ECOSYSTEM                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   ORIANA     │  TC-LEDGER   │  MESSENGER   │    POLLEN      │
│              │  (this repo) │              │  (future v2)   │
│  PWA + App   │  Ledger UI   │  Sovereign   │  AI Wallet     │
│  AR Fauna    │  Swarm       │  Messenger   │  Agent Layer   │
│  Pollen      │  Voting      │  P2P Comms   │  Economics     │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

**GitHub Repos:**
- Terracare-Ledger: https://github.com/DudeAdrian/Terracare-Ledger ← this repo
- Oriana: https://github.com/DudeAdrian/Oriana
- Terracare-Messenger: https://github.com/DudeAdrian/terracare-messenger
- Pollen (AI layer): https://github.com/DudeAdrian/pollen

---

## WHAT THE TERRACARE LEDGER IS

The Terracare Ledger is the **source of truth** for the entire Terracare ecosystem. It is:

- **Sovereign** — no central authority, no single point of failure
- **Transparent** — every entry is publicly readable via the Ledger UI
- **Permanent** — entries are signed and cannot be altered
- **Participatory** — community voting is built in

Every action across Oriana, Messenger, and Pollen is written to the Ledger using the **Underscore Protocol**.

---

## REPOSITORY STRUCTURE

```
Terracare-Ledger/
├── ledger-ui/                  ← PUBLIC LEDGER EXPLORER (Phase 25/27)
│   ├── index.html              ← Standalone PWA — 5 tabs
│   ├── ledger_ui.js            ← Core UI engine + tab rendering
│   ├── conservation.js         ← Conservation dashboard module
│   ├── voting.js               ← Community voting system
│   └── manifest.json           ← PWA manifest
├── Swarm/                      ← LOCAL SWARM TOOLS (Phase 23)
│   ├── mass_clone.py           ← Clone all 18 seed nodes
│   ├── server_deploy.py        ← Deploy to HP Gen 8 + seed nodes
│   └── cell_agent_spawn.py     ← Spawn Cell Agents on Swarm nodes
├── schema/                     ← LEDGER SCHEMA
│   ├── ledger-entry.json       ← Entry schema definition
│   └── identity.json           ← Identity schema definition
├── examples/                   ← EXAMPLE DATA
│   └── sample-ledger.json      ← Sample ledger entries
└── LEDGER_SPEC.md              ← Full ledger specification
```

---

## LEDGER UI — PUBLIC EXPLORER

The Ledger UI is a standalone PWA at `ledger-ui/` that provides public, read-only access to the Terracare ecosystem data.

### Tabs

| Tab | Description |
|-----|-------------|
| **LIVE FEED** | Real-time stream of all ledger entries, colour-coded by action type, auto-refreshes every 5 seconds |
| **CONSERVATION** | 40 tracked species across all 8 states/territories, encounter counts, conservation status breakdown, state-by-state progress |
| **FUND ALLOCATION** | Revenue split visualisation (70/4/15/5/6), live Pollen totals, conservation fund sub-allocation |
| **ECOSYSTEM STATS** | Total entries, unique actors, fauna captured, top actions, your identity/balance |
| **VOTING** | Community proposals, YES/NO voting, quorum tracking, results published to ledger |

### Running the Ledger UI
```bash
# Serve locally
npx serve Terracare-Ledger/ledger-ui/

# Or with Python
python -m http.server 8080 --directory Terracare-Ledger/ledger-ui/
```
Open: http://localhost:8080

### Deploying the Ledger UI
Deploy `ledger-ui/` as a static site:
- **Cloudflare Pages**: root = `ledger-ui/`, no build command
- **Vercel**: same config
- **Self-hosted**: serve with nginx

---

## SWARM

The Terracare Swarm is a local Python-based mesh network of 18 seed nodes managed from a VIC master node running on an HP ProLiant Gen 8 server.

### Nodes
- **VIC Master** — HP ProLiant Gen 8 (primary orchestrator)
- **18 Seed Nodes** — distributed across Australia
- **Cell Agents** — one per user, bound to sovereign identity

### Swarm Tools
```bash
# Clone all 18 seed nodes
python Swarm/mass_clone.py

# Deploy to HP Gen 8 + seed nodes
python Swarm/server_deploy.py

# Spawn Cell Agents
python Swarm/cell_agent_spawn.py
```

> **Note:** Swarm tools are for local/server use only. Do not run on untrusted networks.

---

## UNDERSCORE PROTOCOL

All ledger entries follow the Underscore Protocol format:

```
_[timestamp]_ ACTION | KEY: value | ECOSYSTEM: TERRACARE_LEDGER
```

### Example Entries
```
_1748484000000_ CELL_AGENT_BIRTH | publicKey: abc123... | ECOSYSTEM: TERRACARE_LEDGER
_1748484001000_ FAUNA_CATCH | species: Tasmanian Devil | rarity: RARE | pollen: 150 | ECOSYSTEM: TERRACARE_LEDGER
_1748484002000_ POLLEN_REWARD | amount: 50 | reason: DAILY_QUESTIONNAIRE | ECOSYSTEM: TERRACARE_LEDGER
_1748484003000_ VOTE_CAST | proposalId: prop_001 | vote: YES | ECOSYSTEM: TERRACARE_LEDGER
_1748484004000_ FUND_ALLOCATION | conservation: 15% | creators: 70% | ECOSYSTEM: TERRACARE_LEDGER
```

---

## COMMUNITY VOTING

The Voting system (Phase 27) allows the Terracare community to:

- **Create proposals** — any user with a sovereign identity can submit
- **Vote YES/NO** — one vote per user per proposal, signed to ledger
- **Quorum** — 5 votes minimum (beta), 10% of active users (production)
- **Auto-resolve** — proposals pass or fail when quorum is met
- **Permanent record** — all votes and results written to the Terracare Ledger

### Proposal Categories
- CONSERVATION · POLLEN · GOVERNANCE · FAUNA · SWARM · COMMUNITY · GENERAL

---

## CONSERVATION DASHBOARD

Tracks 40 native Australian species across all 8 states and territories:

| Status | Count |
|--------|-------|
| Critically Endangered | 8 species |
| Endangered | 14 species |
| Vulnerable | 9 species |
| Near Threatened | 5 species |
| Least Concern | 3 species |
| Data Deficient | 1 species |

Conservation fund allocation (15% of all Pollen revenue):
- 40% Species Protection Programs
- 30% Habitat Restoration
- 20% Community Education
- 10% Research & Monitoring

---

## REVENUE SPLIT

All Pollen revenue is split as follows:

| Recipient | Split |
|-----------|-------|
| Creator Rewards | 70% |
| Conservation Fund | 15% |
| Swarm Infrastructure | 6% |
| Founder's Token (90-day vest) | 5% |
| Advertising Standards | 4% |

---

## SHARED localStorage KEYS

The Ledger UI reads from the same localStorage keys used by all Terracare apps:

```javascript
terracare_ledger      // Primary ledger entries array
tc_ledger_log         // Secondary ledger log
oriana_identity       // Sovereign NFT identity
tc_pollen_balance     // Pollen token balance
tc_fauna_collection   // Caught fauna cards
tc_proposals          // Community proposals
tc_votes              // Cast votes
```

---

## LEDGER SCHEMA

See `schema/ledger-entry.json` for the full entry schema.
See `schema/identity.json` for the identity schema.
See `LEDGER_SPEC.md` for the complete ledger specification.

---

*Terracare / Harmonic Habitats — Sovereign Ledger — Australia*
*Every entry signed. Every record permanent. No central authority.*
