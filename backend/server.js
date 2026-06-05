/**
 * Terracare Unified API + P2P Signaling Server — Port 5000
 * Central server for Oriana, Pollen, and Terracare-Messenger.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'terracare-sovereign-secret-dev';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'terracare.db');
const LOG_PATH = process.env.LOG_PATH || path.join(__dirname, '..', 'Swarm', 'SOFIE_Core.log');

// ─── Database ─────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS Records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id TEXT UNIQUE,
    type TEXT NOT NULL,
    user_id TEXT,
    address TEXT,
    data TEXT,
    hash_signature TEXT,
    timestamp INTEGER DEFAULT (strftime('%s','now')),
    synced INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS Identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id TEXT UNIQUE,
    address TEXT,
    public_key TEXT,
    hive_metadata TEXT,
    verified INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS P2PPeers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    peer_id TEXT UNIQUE,
    capabilities TEXT,
    sdp_offer TEXT,
    sdp_answer TEXT,
    ice_candidates TEXT DEFAULT '[]',
    last_seen INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS PollenBalances (
    address TEXT PRIMARY KEY,
    balance REAL DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS FaunaCollection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT,
    species_id TEXT,
    rarity TEXT,
    caught_at INTEGER DEFAULT (strftime('%s','now')),
    sector TEXT,
    metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS HoloHiveCells (
    cell_id TEXT PRIMARY KEY,
    bloom REAL DEFAULT 0,
    fauna REAL DEFAULT 0,
    mesh REAL DEFAULT 0,
    identity REAL DEFAULT 0,
    activity REAL DEFAULT 0,
    reward REAL DEFAULT 0,
    health REAL DEFAULT 0,
    last_interaction INTEGER DEFAULT (strftime('%s','now')),
    interaction_count INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS Feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_address TEXT,
    content TEXT,
    media_hash TEXT,
    likes INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS Messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    recipient TEXT,
    encrypted_payload TEXT,
    delivered INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS Notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT,
    type TEXT,
    payload TEXT,
    read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
  CREATE TABLE IF NOT EXISTS Votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id TEXT,
    voter_address TEXT,
    support INTEGER,
    voting_power REAL DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    UNIQUE(proposal_id, voter_address)
  );
  CREATE TABLE IF NOT EXISTS Proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id TEXT UNIQUE,
    title TEXT,
    description TEXT,
    proposer TEXT,
    state TEXT DEFAULT 'Active',
    for_votes REAL DEFAULT 0,
    against_votes REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    ends_at INTEGER
  );
`);

// ─── Underscore Protocol signing ─────────────────────────────────────────────

function signEntry(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return 'US_' + crypto.createHash('sha256').update(payload).digest('hex');
}

function appendToLog(entry) {
  try {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify({ ...entry, logged_at: new Date().toISOString() }) + '\n', 'utf8');
  } catch (_) {}
}

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use((req, _res, next) => { appendToLog({ type: 'REQ', method: req.method, url: req.url }); next(); });

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next(); }
  catch { res.status(403).json({ error: 'Invalid or expired token' }); }
}

function optionalAuth(req, _res, next) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); } catch (_) {}
  next();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { address, sovereignId } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });
  const token = jwt.sign({ address, sovereignId: sovereignId || null, role: 'User' }, JWT_SECRET, { expiresIn: '7d' });
  const sig = signEntry({ address, ts: Date.now() });
  appendToLog({ type: 'AUTH_LOGIN', address, sig });
  res.json({ token, address, sig });
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ─── Ledger ───────────────────────────────────────────────────────────────────

app.post('/api/ledger/connect', optionalAuth, (req, res) => {
  const sig = signEntry({ ts: Date.now() });
  res.json({ connected: true, sig, server: 'Terracare-Ledger-v1', port: PORT });
});

app.post('/api/ledger/activity', optionalAuth, (req, res) => {
  const { type, userId, address, data, timestamp } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  const actId = 'ACT_' + crypto.randomBytes(8).toString('hex');
  const sig = signEntry({ type, userId, address, data, timestamp: timestamp || Date.now() });
  try {
    db.prepare('INSERT OR IGNORE INTO Records (activity_id,type,user_id,address,data,hash_signature) VALUES (?,?,?,?,?,?)')
      .run(actId, type, userId || address, address, JSON.stringify(data), sig);
    if (address) db.prepare('INSERT OR IGNORE INTO PollenBalances (address,balance) VALUES (?,0)').run(address);
    appendToLog({ type: 'LEDGER_ACTIVITY', actId, actType: type, address, sig });
    res.json({ success: true, activityId: actId, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ledger/events', optionalAuth, (req, res) => {
  const { eventType, address, payload } = req.body;
  const actId = 'EVT_' + crypto.randomBytes(8).toString('hex');
  const sig = signEntry({ eventType, address, payload, ts: Date.now() });
  try {
    db.prepare('INSERT OR IGNORE INTO Records (activity_id,type,address,data,hash_signature) VALUES (?,?,?,?,?)')
      .run(actId, eventType || 'EVENT', address, JSON.stringify(payload), sig);
    appendToLog({ type: 'LEDGER_EVENT', actId, eventType, address, sig });
    res.json({ success: true, eventId: actId, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ledger/events/commit', optionalAuth, (req, res) => {
  const { eventId } = req.body;
  const sig = signEntry({ eventId, ts: Date.now() });
  try {
    db.prepare('UPDATE Records SET synced=1, hash_signature=? WHERE activity_id=?').run(sig, eventId);
    res.json({ success: true, committed: true, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ledger/state', optionalAuth, (req, res) => {
  const { address, limit = 20 } = req.query;
  try {
    const rows = address
      ? db.prepare('SELECT * FROM Records WHERE address=? ORDER BY timestamp DESC LIMIT ?').all(address, Number(limit))
      : db.prepare('SELECT * FROM Records ORDER BY timestamp DESC LIMIT ?').all(Number(limit));
    res.json({ state: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ledger/identity/:id', optionalAuth, (req, res) => {
  try {
    const identity = db.prepare('SELECT * FROM Identities WHERE token_id=? OR address=?').get(req.params.id, req.params.id);
    res.json({ verified: identity?.verified === 1, identity: identity || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ledger/identity/register', optionalAuth, (req, res) => {
  const { tokenId, address, publicKey, hiveMetadata } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });
  const sig = signEntry({ tokenId, address, publicKey, ts: Date.now() });
  try {
    db.prepare('INSERT OR REPLACE INTO Identities (token_id,address,public_key,hive_metadata,verified) VALUES (?,?,?,?,1)')
      .run(tokenId || ('SID_' + crypto.randomBytes(8).toString('hex')), address, publicKey, JSON.stringify(hiveMetadata));
    appendToLog({ type: 'IDENTITY_REGISTER', address, sig });
    res.json({ success: true, verified: true, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ledger/balance/:address', optionalAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT balance FROM PollenBalances WHERE address=?').get(req.params.address);
    res.json({ address: req.params.address, balance: row?.balance ?? 0, currency: 'POLLEN' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ledger/transactions/:address', optionalAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM Records WHERE address=? ORDER BY timestamp DESC LIMIT 100').all(req.params.address);
    res.json({ address: req.params.address, transactions: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── P2P Signaling ────────────────────────────────────────────────────────────

const peers = new Map();

app.post('/api/p2p/register', optionalAuth, (req, res) => {
  const { peerId, capabilities } = req.body;
  if (!peerId) return res.status(400).json({ error: 'peerId required' });
  peers.set(peerId, { peerId, capabilities: capabilities || [], lastSeen: Date.now() });
  try { db.prepare('INSERT OR REPLACE INTO P2PPeers (peer_id,capabilities,last_seen) VALUES (?,?,?)').run(peerId, JSON.stringify(capabilities||[]), Math.floor(Date.now()/1000)); } catch (_) {}
  res.json({ registered: true, peerId, peerCount: peers.size });
});

app.get('/api/p2p/peers', optionalAuth, (req, res) => {
  const active = [...peers.values()].filter(p => Date.now() - p.lastSeen < 60000);
  res.json({ peers: active, count: active.length });
});

app.post('/api/p2p/offer', optionalAuth, (req, res) => {
  const { fromPeerId, toPeerId, sdp } = req.body;
  if (!sdp) return res.status(400).json({ error: 'sdp required' });
  broadcastToWsClient(toPeerId, { type: 'offer', fromPeerId, sdp });
  res.json({ success: true, relayed: true });
});

app.post('/api/p2p/ice/:peerId', optionalAuth, (req, res) => {
  const { peerId } = req.params;
  const { candidate, fromPeerId } = req.body;
  try {
    const row = db.prepare('SELECT ice_candidates FROM P2PPeers WHERE peer_id=?').get(peerId);
    const existing = row ? JSON.parse(row.ice_candidates || '[]') : [];
    existing.push(candidate);
    db.prepare('UPDATE P2PPeers SET ice_candidates=? WHERE peer_id=?').run(JSON.stringify(existing), peerId);
  } catch (_) {}
  broadcastToWsClient(peerId, { type: 'ice', fromPeerId, candidate });
  res.json({ success: true });
});

app.post('/api/p2p/broadcast', optionalAuth, (req, res) => {
  const { fromPeerId, message, signature } = req.body;
  let count = 0;
  wsClients.forEach((ws, pid) => {
    if (pid !== fromPeerId && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'broadcast', fromPeerId, message, signature, ts: Date.now() })); count++; }
  });
  res.json({ success: true, delivered: count });
});

app.post('/api/p2p/connect/:peerId', optionalAuth, (req, res) => {
  const { fromPeerId, sdp } = req.body;
  broadcastToWsClient(req.params.peerId, { type: 'offer', fromPeerId, sdp });
  res.json({ success: true });
});

// ─── Pollen ───────────────────────────────────────────────────────────────────

app.get('/api/pollen/balance/:address', optionalAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT balance FROM PollenBalances WHERE address=?').get(req.params.address);
    res.json({ address: req.params.address, balance: row?.balance ?? 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pollen/earn', optionalAuth, (req, res) => {
  const { address, amount, reason } = req.body;
  if (!address || !amount) return res.status(400).json({ error: 'address and amount required' });
  try {
    db.prepare('INSERT OR IGNORE INTO PollenBalances (address,balance) VALUES (?,0)').run(address);
    db.prepare("UPDATE PollenBalances SET balance=balance+?, updated_at=strftime('%s','now') WHERE address=?").run(Number(amount), address);
    const row = db.prepare('SELECT balance FROM PollenBalances WHERE address=?').get(address);
    const sig = signEntry({ address, amount, reason, ts: Date.now() });
    appendToLog({ type: 'POLLEN_EARN', address, amount, reason, sig });
    res.json({ success: true, newBalance: row.balance, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Fauna ────────────────────────────────────────────────────────────────────

app.get('/api/fauna/collection/:address', optionalAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM FaunaCollection WHERE user_address=? ORDER BY caught_at DESC').all(req.params.address);
    res.json({ address: req.params.address, collection: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fauna/catch', optionalAuth, (req, res) => {
  const { address, speciesId, rarity, sector, metadata } = req.body;
  if (!address || !speciesId) return res.status(400).json({ error: 'address and speciesId required' });
  try {
    db.prepare('INSERT INTO FaunaCollection (user_address,species_id,rarity,sector,metadata) VALUES (?,?,?,?,?)').run(address, speciesId, rarity || 'common', sector, JSON.stringify(metadata || {}));
    const sig = signEntry({ address, speciesId, rarity, ts: Date.now() });
    appendToLog({ type: 'FAUNA_CATCH', address, speciesId, rarity, sig });
    res.json({ success: true, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── HoloHive cells ───────────────────────────────────────────────────────────

app.get('/api/holohive/cells', optionalAuth, (req, res) => {
  const { sector } = req.query;
  try {
    const rows = sector
      ? db.prepare('SELECT * FROM HoloHiveCells WHERE cell_id LIKE ? ORDER BY last_interaction DESC LIMIT 500').all(`${sector}%`)
      : db.prepare('SELECT * FROM HoloHiveCells ORDER BY last_interaction DESC LIMIT 500').all();
    res.json({ cells: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/holohive/cells', optionalAuth, (req, res) => {
  const { cellId, sides, health } = req.body;
  if (!cellId || !sides) return res.status(400).json({ error: 'cellId and sides required' });
  try {
    db.prepare(`
      INSERT INTO HoloHiveCells (cell_id,bloom,fauna,mesh,identity,activity,reward,health,interaction_count)
      VALUES (?,?,?,?,?,?,?,?,1)
      ON CONFLICT(cell_id) DO UPDATE SET
        bloom=excluded.bloom,fauna=excluded.fauna,mesh=excluded.mesh,
        identity=excluded.identity,activity=excluded.activity,reward=excluded.reward,
        health=excluded.health,last_interaction=strftime('%s','now'),interaction_count=interaction_count+1
    `).run(cellId, sides.BLOOM||0, sides.FAUNA||0, sides.MESH||0, sides.IDENTITY||0, sides.ACTIVITY||0, sides.REWARD||0, health||0);
    res.json({ success: true, cellId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/holohive/sync', optionalAuth, (req, res) => {
  const { cells } = req.body;
  if (!Array.isArray(cells)) return res.status(400).json({ error: 'cells array required' });
  const stmt = db.prepare(`
    INSERT INTO HoloHiveCells (cell_id,bloom,fauna,mesh,identity,activity,reward,health)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(cell_id) DO UPDATE SET
      bloom=MAX(bloom,excluded.bloom),fauna=MAX(fauna,excluded.fauna),
      mesh=MAX(mesh,excluded.mesh),identity=MAX(identity,excluded.identity),
      activity=MAX(activity,excluded.activity),reward=MAX(reward,excluded.reward),
      health=MAX(health,excluded.health),last_interaction=strftime('%s','now')
  `);
  try {
    const sync = db.transaction((cells) => { for (const c of cells) stmt.run(c.id, c.sides?.BLOOM||0, c.sides?.FAUNA||0, c.sides?.MESH||0, c.sides?.IDENTITY||0, c.sides?.ACTIVITY||0, c.sides?.REWARD||0, c.health||0); });
    sync(cells);
    res.json({ success: true, synced: cells.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Feed ─────────────────────────────────────────────────────────────────────

app.get('/api/feed', optionalAuth, (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  try {
    const rows = db.prepare('SELECT * FROM Feed ORDER BY created_at DESC LIMIT ? OFFSET ?').all(Number(limit), Number(offset));
    res.json({ feed: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feed/post', authMiddleware, (req, res) => {
  const { content, mediaHash } = req.body;
  try {
    const r = db.prepare('INSERT INTO Feed (author_address,content,media_hash) VALUES (?,?,?)').run(req.user.address, content, mediaHash);
    res.json({ success: true, postId: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Messages ─────────────────────────────────────────────────────────────────

app.get('/api/messages/:address', authMiddleware, (req, res) => {
  if (req.user.address !== req.params.address) return res.status(403).json({ error: 'Forbidden' });
  try {
    const rows = db.prepare('SELECT * FROM Messages WHERE recipient=? ORDER BY created_at DESC LIMIT 100').all(req.params.address);
    res.json({ messages: rows, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/send', authMiddleware, (req, res) => {
  const { recipient, encryptedPayload } = req.body;
  try {
    const r = db.prepare('INSERT INTO Messages (sender,recipient,encrypted_payload) VALUES (?,?,?)').run(req.user.address, recipient, encryptedPayload);
    broadcastToWsClient(recipient, { type: 'message', from: req.user.address, payload: encryptedPayload });
    res.json({ success: true, messageId: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Notifications ────────────────────────────────────────────────────────────

app.get('/api/notifications/:address', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM Notifications WHERE user_address=? ORDER BY created_at DESC LIMIT 50').all(req.params.address);
    res.json({ notifications: rows, unread: rows.filter(n => !n.read).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Voting ───────────────────────────────────────────────────────────────────

app.get('/api/voting/proposals', optionalAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM Proposals ORDER BY created_at DESC').all();
    res.json({ proposals: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/voting/vote', authMiddleware, (req, res) => {
  const { proposalId, support } = req.body;
  const sig = signEntry({ proposalId, voter: req.user.address, support, ts: Date.now() });
  try {
    db.prepare('INSERT OR IGNORE INTO Votes (proposal_id,voter_address,support) VALUES (?,?,?)').run(proposalId, req.user.address, support ? 1 : 0);
    appendToLog({ type: 'VOTE_CAST', proposalId, voter: req.user.address, support, sig });
    res.json({ success: true, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────

app.get('/api/users/:address', optionalAuth, (req, res) => {
  try {
    const identity = db.prepare('SELECT * FROM Identities WHERE address=?').get(req.params.address);
    const balance = db.prepare('SELECT balance FROM PollenBalances WHERE address=?').get(req.params.address);
    const fauna = db.prepare('SELECT COUNT(*) as count FROM FaunaCollection WHERE user_address=?').get(req.params.address);
    res.json({ address: req.params.address, verified: identity?.verified === 1, tokenId: identity?.token_id, pollenBalance: balance?.balance || 0, faunaCount: fauna?.count || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Social interactions ──────────────────────────────────────────────────────

app.post('/api/social/interact', optionalAuth, (req, res) => {
  const { type, targetId, address, data } = req.body;
  const actId = 'INT_' + crypto.randomBytes(8).toString('hex');
  const sig = signEntry({ type, targetId, address, ts: Date.now() });
  try {
    db.prepare('INSERT OR IGNORE INTO Records (activity_id,type,address,data,hash_signature) VALUES (?,?,?,?,?)').run(actId, 'SOCIAL_' + (type || 'INTERACT').toUpperCase(), address, JSON.stringify(data), sig);
    res.json({ success: true, interactionId: actId, sig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  let recordCount = 0;
  try { recordCount = db.prepare('SELECT COUNT(*) as n FROM Records').get().n; } catch (_) {}
  res.json({ status: 'ok', port: PORT, peers: peers.size, wsConnections: wsClients.size, ledgerRecords: recordCount, ts: Date.now() });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/p2p' });
const wsClients = new Map();

function broadcastToWsClient(peerId, payload) {
  const ws = wsClients.get(peerId);
  if (ws?.readyState === 1) { ws.send(JSON.stringify(payload)); return true; }
  return false;
}

wss.on('connection', (ws) => {
  let peerId = null;
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'register') {
        peerId = msg.peerId;
        if (!peerId) return ws.send(JSON.stringify({ error: 'peerId required' }));
        wsClients.set(peerId, ws);
        peers.set(peerId, { peerId, capabilities: msg.capabilities || [], lastSeen: Date.now() });
        ws.send(JSON.stringify({ type: 'registered', peerId, peerCount: wsClients.size }));
      } else if (['offer', 'answer', 'ice'].includes(msg.type)) {
        broadcastToWsClient(msg.toPeerId, { ...msg, fromPeerId: peerId });
      } else if (msg.type === 'broadcast') {
        wsClients.forEach((c, pid) => { if (pid !== peerId && c.readyState === 1) c.send(JSON.stringify({ ...msg, fromPeerId: peerId })); });
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        if (peerId) { const p = peers.get(peerId); if (p) p.lastSeen = Date.now(); }
      }
    } catch { ws.send(JSON.stringify({ error: 'invalid message' })); }
  });
  ws.on('close', () => { if (peerId) { wsClients.delete(peerId); peers.delete(peerId); } });
});

// ─── Factory status ───────────────────────────────────────────────────────────

const FACTORY_STATE_PATH = process.env.FACTORY_STATE_PATH ||
  path.join(__dirname, '..', 'Swarm', 'factory_state.json');

app.get('/api/factory/status', (req, res) => {
  try {
    if (!fs.existsSync(FACTORY_STATE_PATH)) {
      return res.json({ running: false, message: 'Factory not started. Run: python factory_revenue_engine.py' });
    }
    const state = JSON.parse(fs.readFileSync(FACTORY_STATE_PATH, 'utf8'));
    res.json({ running: true, ...state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pollen/agent/insights', (req, res) => {
  try {
    if (!fs.existsSync(FACTORY_STATE_PATH)) {
      return res.json({ insights: [], running: false });
    }
    const state = JSON.parse(fs.readFileSync(FACTORY_STATE_PATH, 'utf8'));
    const agents = state.agents || {};
    const insights = Object.values(agents).map(a => ({
      agent: a.id || a.name,
      status: a.status,
      mode: a.mode || 'SIMULATION',
      totalProcessed: a.total_processed || 0,
      transactions: a.transactions || 0,
      lastActivity: a.last_activity || a.heartbeat,
    }));
    res.json({ running: true, insights, totalProcessed: insights.reduce((s, a) => s + (a.totalProcessed || 0), 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── HoloHive decay daemon ────────────────────────────────────────────────────

const DECAY_RATE = 0.01;
const DECAY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function runCellDecayDaemon() {
  try {
    const staleTime = Math.floor(Date.now() / 1000) - 3600;
    const staleCells = db.prepare('SELECT cell_id FROM HoloHiveCells WHERE last_interaction < ?').all(staleTime);
    if (staleCells.length === 0) return;
    const update = db.prepare(`
      UPDATE HoloHiveCells SET
        bloom    = MAX(0, bloom    - ?),
        fauna    = MAX(0, fauna    - ?),
        mesh     = MAX(0, mesh     - ?),
        identity = MAX(0, identity - ?),
        activity = MAX(0, activity - ?),
        reward   = MAX(0, reward   - ?)
      WHERE cell_id = ?
    `);
    const decay = db.transaction((cells) => {
      for (const c of cells) {
        update.run(DECAY_RATE, DECAY_RATE, DECAY_RATE, DECAY_RATE, DECAY_RATE, DECAY_RATE * 0.5, c.cell_id);
      }
    });
    decay(staleCells);
    appendToLog({ type: 'HOLOHIVE_DECAY_CYCLE', cells: staleCells.length, rate: DECAY_RATE });
    console.log(`[HOLOHIVE] Decay: ${staleCells.length} stale cells processed`);
  } catch (e) {
    console.error('[HOLOHIVE] Decay error:', e.message);
  }
}

setTimeout(runCellDecayDaemon, 10000);
setInterval(runCellDecayDaemon, DECAY_INTERVAL_MS);

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Terracare Unified Server — Port ${PORT}`);
  console.log(`  DB  : ${DB_PATH}`);
  console.log(`  Log : ${LOG_PATH}`);
  console.log(`  WS  : ws://localhost:${PORT}/ws/p2p`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  appendToLog({ type: 'SERVER_START', port: PORT });
});

server.on('error', (e) => { console.error('Server error:', e.message); process.exit(1); });
