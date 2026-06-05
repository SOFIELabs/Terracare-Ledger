/**
 * TERRACARE LEDGER UI — ledger_ui.js
 * Phase 25 | Public Ledger Explorer
 * Reads from localStorage shared across all Terracare apps
 * Also polls SOFIE HTTP Bridge (localhost:7700) for live data when running locally
 * Tabs: LIVE FEED · CONSERVATION · FUND ALLOCATION · ECOSYSTEM STATS · VOTING
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SOFIE HTTP BRIDGE — Live data feed for Ledger UI
// Polls localhost:7700 every 15 seconds when SOFIE is running.
// Merges SOFIE ledger entries into localStorage so TCLedgerUI reads them.
// Silent fail — UI works from localStorage alone if SOFIE is offline.
// ═══════════════════════════════════════════════════════════════════════════
(function() {
  var SOFIE_URL = 'http://localhost:7700';
  var _online   = false;
  var _statusEl = null;

  function updateStatusBadge(online, sofieId) {
    if (!_statusEl) {
      _statusEl = document.getElementById('sofie-status-badge');
    }
    if (!_statusEl) return;
    if (online) {
      _statusEl.textContent = '🟢 SOFIE ONLINE' + (sofieId ? ' · ' + sofieId : '');
      _statusEl.style.color = '#52FF6A';
    } else {
      _statusEl.textContent = '⚫ SOFIE OFFLINE';
      _statusEl.style.color = '#888';
    }
  }

  function mergeLedgerEntries(sofieEntries) {
    if (!Array.isArray(sofieEntries) || sofieEntries.length === 0) return;
    try {
      // Read existing localStorage ledger
      var existing = [];
      try { existing = JSON.parse(localStorage.getItem('terracare_ledger') || '[]'); } catch(e) {}
      if (!Array.isArray(existing)) existing = [];

      // Build a set of existing IDs to avoid duplicates
      var existingIds = new Set(existing.map(function(e) { return e.id || e.timestamp; }));

      // Add new SOFIE entries that aren't already present
      var added = 0;
      sofieEntries.forEach(function(entry) {
        var key = entry.id || entry.timestamp;
        if (!existingIds.has(key)) {
          existing.push(entry);
          existingIds.add(key);
          added++;
        }
      });

      if (added > 0) {
        // Sort by timestamp descending, keep last 500
        existing.sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
        existing = existing.slice(0, 500);
        localStorage.setItem('terracare_ledger', JSON.stringify(existing));
        // Trigger UI refresh if TCLedgerUI is loaded
        if (window.TCLedgerUI && window.TCLedgerUI.refresh) {
          window.TCLedgerUI.refresh();
        }
      }
    } catch(e) {}
  }

  function pollSOFIE() {
    // Poll ledger
    fetch(SOFIE_URL + '/ledger', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!_online) {
        _online = true;
        updateStatusBadge(true, data.sofie_id);
        console.log('[LedgerUI] SOFIE online — live feed active:', data.sofie_id);
      }
      mergeLedgerEntries(data.entries || []);

      // Store SOFIE metadata
      try {
        localStorage.setItem('tc:sofie:id', data.sofie_id || 'SOFIE');
        localStorage.setItem('tc:sofie:last_sync', data.last_sync || new Date().toISOString());
      } catch(e) {}
    })
    .catch(function() {
      if (_online) {
        _online = false;
        updateStatusBadge(false);
      }
    });

    // Poll swarm status
    fetch(SOFIE_URL + '/swarm')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      try { localStorage.setItem('tc:sofie:swarm', JSON.stringify(data.swarm || {})); } catch(e) {}
    })
    .catch(function() {});

    // Poll ecosystem
    fetch(SOFIE_URL + '/ecosystem')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      try { localStorage.setItem('tc:sofie:ecosystem', JSON.stringify(data.repos || {})); } catch(e) {}
    })
    .catch(function() {});
  }

  // Start polling after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(pollSOFIE, 1000);
      setInterval(pollSOFIE, 15000);
    });
  } else {
    setTimeout(pollSOFIE, 1000);
    setInterval(pollSOFIE, 15000);
  }

  // Public API
  window.TCSOFIELedgerPoll = {
    isOnline: function() { return _online; },
    poll:     pollSOFIE,
  };
})();

window.TCLedgerUI = (function () {

  // ─── Constants ───────────────────────────────────────────────────────────────
  const LEDGER_KEY       = 'terracare_ledger';
  const LOG_KEY          = 'tc_ledger_log';
  const IDENTITY_KEY     = 'oriana_identity';
  const POLLEN_KEY       = 'tc_pollen_balance';
  const FAUNA_KEY        = 'tc_fauna_collection';
  const VOTES_KEY        = 'tc_votes';
  const PROPOSALS_KEY    = 'tc_proposals';
  const REFRESH_INTERVAL = 5000; // 5 seconds

  // ─── State ───────────────────────────────────────────────────────────────────
  let currentTab = 'feed';
  let refreshTimer = null;

  // ─── Utility ─────────────────────────────────────────────────────────────────
  function safeJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(typeof ts === 'number' ? ts : parseInt(ts));
    return d.toLocaleString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function truncate(str, n) {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Data Loaders ────────────────────────────────────────────────────────────
  function getLedgerEntries() {
    const ledger = safeJSON(LEDGER_KEY, []);
    const log    = safeJSON(LOG_KEY, []);
    const combined = [...ledger, ...log];
    // Sort newest first
    combined.sort((a, b) => {
      const ta = a.timestamp || a.ts || 0;
      const tb = b.timestamp || b.ts || 0;
      return tb - ta;
    });
    return combined;
  }

  function getIdentity() {
    return safeJSON(IDENTITY_KEY, null);
  }

  function getPollenBalance() {
    return parseInt(localStorage.getItem(POLLEN_KEY) || '0', 10);
  }

  function getFaunaCollection() {
    return safeJSON(FAUNA_KEY, []);
  }

  // ─── Tab: LIVE FEED ──────────────────────────────────────────────────────────
  function renderFeed() {
    const entries = getLedgerEntries();
    const container = document.getElementById('tab-feed');
    if (!container) return;

    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state">No ledger entries yet. Actions in Oriana will appear here.</div>';
      return;
    }

    const rows = entries.slice(0, 200).map(entry => {
      const action = escapeHTML(entry.action || entry.type || 'ENTRY');
      const actor  = escapeHTML(truncate(entry.publicKey || entry.actor || entry.userId || 'anonymous', 16));
      const detail = escapeHTML(truncate(JSON.stringify(entry.data || entry.payload || entry.detail || {}), 80));
      const ts     = formatTime(entry.timestamp || entry.ts);
      const badge  = getBadgeClass(action);

      return `<div class="feed-row">
        <span class="feed-badge ${badge}">${action}</span>
        <span class="feed-actor">${actor}</span>
        <span class="feed-detail">${detail}</span>
        <span class="feed-time">${ts}</span>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="feed-header">
        <span class="live-dot"></span> LIVE LEDGER FEED
        <span class="entry-count">${entries.length} entries</span>
      </div>
      <div class="feed-list">${rows}</div>`;
  }

  function getBadgeClass(action) {
    const a = (action || '').toUpperCase();
    if (a.includes('FAUNA') || a.includes('CATCH')) return 'badge-fauna';
    if (a.includes('POLLEN') || a.includes('REWARD')) return 'badge-pollen';
    if (a.includes('IDENTITY') || a.includes('BIRTH') || a.includes('MINT')) return 'badge-identity';
    if (a.includes('VOTE') || a.includes('PROPOSAL')) return 'badge-vote';
    if (a.includes('BLOOM') || a.includes('TREE')) return 'badge-bloom';
    if (a.includes('GIFT')) return 'badge-gift';
    if (a.includes('TRADE') || a.includes('MARKET')) return 'badge-trade';
    return 'badge-default';
  }

  // ─── Tab: ECOSYSTEM STATS ────────────────────────────────────────────────────
  function renderStats() {
    const container = document.getElementById('tab-stats');
    if (!container) return;

    const entries  = getLedgerEntries();
    const fauna    = getFaunaCollection();
    const identity = getIdentity();
    const pollen   = getPollenBalance();

    // Count action types
    const counts = {};
    entries.forEach(e => {
      const k = (e.action || e.type || 'UNKNOWN').toUpperCase();
      counts[k] = (counts[k] || 0) + 1;
    });

    const topActions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const uniqueActors = new Set(
      entries.map(e => e.publicKey || e.actor || e.userId).filter(Boolean)
    ).size;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${entries.length.toLocaleString()}</div>
          <div class="stat-label">Total Ledger Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${uniqueActors.toLocaleString()}</div>
          <div class="stat-label">Unique Actors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${fauna.length.toLocaleString()}</div>
          <div class="stat-label">Fauna Captured</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pollen.toLocaleString()} 🍯</div>
          <div class="stat-label">Your Pollen Balance</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${identity ? identity.tier || 'BETA' : 'NONE'}</div>
          <div class="stat-label">Your Identity Tier</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${identity ? truncate(identity.publicKey || '', 12) : '—'}</div>
          <div class="stat-label">Your Public Key</div>
        </div>
      </div>
      <div class="section-title">TOP ACTIONS</div>
      <div class="action-bars">
        ${topActions.map(([action, count]) => `
          <div class="action-bar-row">
            <span class="action-bar-label">${escapeHTML(action)}</span>
            <div class="action-bar-track">
              <div class="action-bar-fill" style="width:${Math.min(100, (count / (topActions[0][1] || 1)) * 100)}%"></div>
            </div>
            <span class="action-bar-count">${count}</span>
          </div>`).join('')}
      </div>`;
  }

  // ─── Tab: CONSERVATION ───────────────────────────────────────────────────────
  // Loaded from conservation.js — TCConservation.render()
  function renderConservation() {
    const container = document.getElementById('tab-conservation');
    if (!container) return;
    if (window.TCConservation) {
      window.TCConservation.render(container);
    } else {
      container.innerHTML = '<div class="empty-state">Conservation module loading…</div>';
    }
  }

  // ─── Tab: FUND ALLOCATION ────────────────────────────────────────────────────
  function renderFundAllocation() {
    const container = document.getElementById('tab-fund');
    if (!container) return;

    // Revenue split: 70/4/15/5/6
    const splits = [
      { label: 'Creator Rewards',        pct: 70, color: '#FFD166', icon: '🍯' },
      { label: 'Conservation Fund',       pct: 15, color: '#00FF88', icon: '🌿' },
      { label: 'Swarm Infrastructure',    pct:  6, color: '#4FC3F7', icon: '🐝' },
      { label: 'Founder\'s Token Vest',   pct:  5, color: '#F5A623', icon: '🪙' },
      { label: 'Advertising Standards',   pct:  4, color: '#CE93D8', icon: '📋' },
    ];

    const entries = getLedgerEntries();
    const pollenEntries = entries.filter(e => {
      const a = (e.action || e.type || '').toUpperCase();
      return a.includes('POLLEN') || a.includes('REWARD') || a.includes('EARN');
    });

    const totalPollenMoved = pollenEntries.reduce((sum, e) => {
      const amt = e.data?.amount || e.payload?.amount || e.amount || 0;
      return sum + parseInt(amt, 10);
    }, 0);

    container.innerHTML = `
      <div class="section-title">REVENUE SPLIT — TERRACARE ECOSYSTEM</div>
      <div class="fund-total">Total Pollen Distributed: <strong>${totalPollenMoved.toLocaleString()} 🍯</strong></div>
      <div class="fund-bars">
        ${splits.map(s => `
          <div class="fund-row">
            <span class="fund-icon">${s.icon}</span>
            <span class="fund-label">${s.label}</span>
            <div class="fund-track">
              <div class="fund-fill" style="width:${s.pct}%;background:${s.color}"></div>
            </div>
            <span class="fund-pct">${s.pct}%</span>
            <span class="fund-amount">${Math.floor(totalPollenMoved * s.pct / 100).toLocaleString()} 🍯</span>
          </div>`).join('')}
      </div>
      <div class="section-title" style="margin-top:32px">CONSERVATION FUND ALLOCATION</div>
      <div class="conservation-splits">
        <div class="cs-row"><span class="cs-label">Species Protection Programs</span><span class="cs-pct">40%</span></div>
        <div class="cs-row"><span class="cs-label">Habitat Restoration</span><span class="cs-pct">30%</span></div>
        <div class="cs-row"><span class="cs-label">Community Education</span><span class="cs-pct">20%</span></div>
        <div class="cs-row"><span class="cs-label">Research & Monitoring</span><span class="cs-pct">10%</span></div>
      </div>
      <div class="ledger-note">All allocations are signed to the Terracare Ledger and publicly verifiable. Underscore Protocol: _[timestamp]_ FUND_ALLOCATION | ECOSYSTEM: TERRACARE_LEDGER</div>`;
  }

  // ─── Tab: VOTING ─────────────────────────────────────────────────────────────
  // Loaded from voting.js — TCVoting.render()
  function renderVoting() {
    const container = document.getElementById('tab-voting');
    if (!container) return;
    if (window.TCVoting) {
      window.TCVoting.render(container);
    } else {
      container.innerHTML = '<div class="empty-state">Voting module loading…</div>';
    }
  }

  // ─── Tab Switching ────────────────────────────────────────────────────────────
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tab-' + tab);
    });
    renderCurrentTab();
  }

  function renderCurrentTab() {
    switch (currentTab) {
      case 'feed':         renderFeed();           break;
      case 'stats':        renderStats();          break;
      case 'conservation': renderConservation();   break;
      case 'fund':         renderFundAllocation(); break;
      case 'voting':       renderVoting();         break;
    }
  }

  // ─── Auto-refresh ─────────────────────────────────────────────────────────────
  function startRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(renderCurrentTab, REFRESH_INTERVAL);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    // Wire tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Initial render
    switchTab('feed');
    startRefresh();

    // Update live clock
    setInterval(() => {
      const el = document.getElementById('live-clock');
      if (el) el.textContent = new Date().toLocaleString('en-AU');
    }, 1000);

    console.log('[TCLedgerUI] Initialised — Terracare Ledger Explorer v1.0');
  }

  return { init, switchTab, renderCurrentTab };

})();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.TCLedgerUI.init);
} else {
  window.TCLedgerUI.init();
}
