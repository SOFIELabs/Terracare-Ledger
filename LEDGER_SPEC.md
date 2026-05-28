# Terracare_Ledger — Sovereign Ledger Specification

## Overview

The Terracare_Ledger is the canonical, tamper-evident, on-device record of every sovereign action taken by a user across the Terracare ecosystem. It is the single source of truth shared across:

- **Oriana** — the main sovereign social app
- **Terracare_Messenger** — the encrypted messaging interface
- **Pollen Wallet** — the sovereign token wallet

## On-Device Storage

All ledger data is stored in the browser's `localStorage` under these canonical keys:

| Key | Type | Description |
|-----|------|-------------|
| `oriana_identity` | JSON object | The user's sovereign identity record (see `schema/identity.json`) |
| `terracare_ledger` | JSON array | Append-only array of ledger entries (see `schema/ledger-entry.json`) |
| `oriana_messages` | JSON array | Messages including system Sovereign Log entries |
| `oriana_setup_done` | string `'1'` | Set when user completes onboarding — prevents repeat setup |
| `oriana_sovereign_log_sent` | string `'1'` | Set when Sovereign Log welcome message has been sent |
| `oriana_monthly_report_optin` | string `'1'` | Set if user opted in to monthly email report |

## Identity Record (`oriana_identity`)

Written once on NFT mint. Read by all 3 apps on load.

```json
{
  "handle": "@username",
  "bio": "Sovereign declaration",
  "email": "optional@recovery.email",
  "monthlyReportOptIn": false,
  "tokenId": "NFT_1K9X3A_F7B2C1",
  "nftImage": "data:image/jpeg;base64,...",
  "nftColour": "#F5A623",
  "credits": 50,
  "registeredAt": 1748394847000,
  "registeredAtStr": "28/05/2026, 1:27:27 pm",
  "ledgerEntry": 1
}
```

**Privacy:** The `email` field is optional, stored only on the user's device, never transmitted to any server. Governed by the Australian Privacy Act 1988.

## Ledger Entry Types

| Type | Trigger | Pollen Effect |
|------|---------|---------------|
| `IDENTITY_REGISTER` | User registers handle + bio | — |
| `NFT_MINT` | User mints sovereign NFT | +50 welcome bonus |
| `POLLEN_EARN` | Any earning event | +amount |
| `POLLEN_SPEND` | Market purchase, gift | -amount |
| `CONTENT_POST` | Post created | +10 |
| `CONTENT_VIDEO` | Video posted | +15 |
| `BLOOM_HARVEST` | Bloom cycle harvested | +variable |
| `FAUNA_CATCH` | Fauna tracked/caught | +rarity-based |
| `GIFT_SEND` | Gift sent to another user | -cost |
| `MESSAGE_SENT` | Message count snapshot | — |
| `SHOP_LAUNCH` | User launches a shop | +750 (easter egg) |
| `MARKET_PURCHASE` | Purchase made with Pollen | -amount |
| `MONTHLY_SNAPSHOT` | Auto-generated monthly summary | — |

## Chain Integrity

Each entry has a sequential `entry` number (1-indexed). The chain is considered **VERIFIED** when:
1. All entry numbers are sequential with no gaps
2. All timestamps are monotonically increasing
3. No entries have been deleted

## Cross-App Reading

Since all 3 apps are served from the same origin (`localhost:3000` or the deployed domain), they share the same `localStorage` automatically. No sync required.

**Oriana** writes → **Messenger** reads → **Pollen** reads

## Monthly Report

If `monthlyReportOptIn` is `true` in the identity record, the user has opted in to receive a monthly sovereign ledger summary. The report is generated client-side as a downloadable `.txt` file containing:
- Total Pollen earned/spent
- Content, bloom, fauna, message counts
- Chain integrity status
- SHA-256 hash of the full ledger

**Automated email delivery is Phase 2** (requires backend email service). Current implementation: manual download via "GENERATE MY MONTHLY REPORT" button in Profile tab.

## Smart Contracts

The `contracts/` directory contains Solidity smart contracts for the future on-chain version of the ledger:
- `IdentityRegistry.sol` — on-chain identity registration
- `TokenEngine.sol` — Pollen token (ERC-20 compatible)
- `ActivityRegistry.sol` — on-chain activity recording
- `RecordRegistry.sol` — immutable record storage

These contracts are the Phase 3 decentralised backend. The on-device localStorage ledger is designed to be fully compatible with these contracts for future migration.

## Privacy & Compliance

- All data stored on-device only (localStorage)
- No data transmitted to any server without explicit user action
- Email address (if provided) stored encrypted in localStorage, never transmitted
- Governed by **Australian Privacy Act 1988**
- User can export all their data at any time via "EXPORT ALL MY DATA" button
- User can delete all their data by clearing localStorage

## Ecosystem Alignment

```
Terracare_Project/
├── Oriana/                    → github.com/DudeAdrian/Oriana
│   └── apps/mobile/web-build/
│       ├── index.html         ← writes oriana_identity + terracare_ledger
│       ├── messenger.html     ← reads oriana_identity + oriana_messages
│       ├── pollen.html        ← reads oriana_identity + terracare_ledger
│       └── terracare-bridge.js ← shared TC.Ledger bridge
├── Terracare_Ledger/          → github.com/DudeAdrian/Terracare-Ledger
│   ├── schema/                ← canonical JSON schemas (this repo)
│   ├── examples/              ← sample ledger data
│   ├── contracts/             ← Solidity smart contracts (Phase 3)
│   └── LEDGER_SPEC.md         ← this document
└── Terracare-Messenger/       → github.com/DudeAdrian/terracare-messenger
    └── public/                ← messenger web app
```
