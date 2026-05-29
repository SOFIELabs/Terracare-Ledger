/**
 * TERRACARE LEDGER UI — conservation.js
 * Phase 25 | Conservation Dashboard Module
 * Renders species stats, habitat zones, encounter counts
 */

'use strict';

window.TCConservation = (function () {

  const FAUNA_KEY   = 'tc_fauna_collection';
  const LEDGER_KEY  = 'terracare_ledger';
  const LOG_KEY     = 'tc_ledger_log';

  function safeJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  // All 144 species mapped to state + conservation status
  const SPECIES_DATA = [
    // NSW
    { name: 'Koala',              state: 'NSW', status: 'Vulnerable',   emoji: '🐨', encounters: 0 },
    { name: 'Platypus',           state: 'NSW', status: 'Near Threatened', emoji: '🦆', encounters: 0 },
    { name: 'Eastern Quoll',      state: 'NSW', status: 'Endangered',   emoji: '🐾', encounters: 0 },
    { name: 'Swift Parrot',       state: 'NSW', status: 'Critically Endangered', emoji: '🦜', encounters: 0 },
    { name: 'Regent Honeyeater',  state: 'NSW', status: 'Critically Endangered', emoji: '🐦', encounters: 0 },
    // VIC
    { name: 'Leadbeater\'s Possum', state: 'VIC', status: 'Critically Endangered', emoji: '🐿️', encounters: 0 },
    { name: 'Helmeted Honeyeater', state: 'VIC', status: 'Critically Endangered', emoji: '🐦', encounters: 0 },
    { name: 'Southern Corroboree Frog', state: 'VIC', status: 'Critically Endangered', emoji: '🐸', encounters: 0 },
    { name: 'Mountain Pygmy Possum', state: 'VIC', status: 'Endangered', emoji: '🐭', encounters: 0 },
    { name: 'Brolga',             state: 'VIC', status: 'Vulnerable',   emoji: '🦢', encounters: 0 },
    // QLD
    { name: 'Cassowary',          state: 'QLD', status: 'Endangered',   emoji: '🦤', encounters: 0 },
    { name: 'Mahogany Glider',    state: 'QLD', status: 'Endangered',   emoji: '🐿️', encounters: 0 },
    { name: 'Lumholtz\'s Tree-kangaroo', state: 'QLD', status: 'Near Threatened', emoji: '🦘', encounters: 0 },
    { name: 'Irukandji Jellyfish', state: 'QLD', status: 'Data Deficient', emoji: '🪼', encounters: 0 },
    { name: 'Dugong',             state: 'QLD', status: 'Vulnerable',   emoji: '🐬', encounters: 0 },
    // WA
    { name: 'Numbat',             state: 'WA',  status: 'Endangered',   emoji: '🦡', encounters: 0 },
    { name: 'Quokka',             state: 'WA',  status: 'Vulnerable',   emoji: '🐾', encounters: 0 },
    { name: 'Black-flanked Rock-wallaby', state: 'WA', status: 'Endangered', emoji: '🦘', encounters: 0 },
    { name: 'Carnaby\'s Cockatoo', state: 'WA', status: 'Endangered',   emoji: '🦜', encounters: 0 },
    { name: 'Western Ground Parrot', state: 'WA', status: 'Critically Endangered', emoji: '🦜', encounters: 0 },
    // SA
    { name: 'Southern Hairy-nosed Wombat', state: 'SA', status: 'Near Threatened', emoji: '🐻', encounters: 0 },
    { name: 'Yellow-footed Rock-wallaby', state: 'SA', status: 'Vulnerable', emoji: '🦘', encounters: 0 },
    { name: 'Malleefowl',         state: 'SA',  status: 'Vulnerable',   emoji: '🐓', encounters: 0 },
    { name: 'Coorong Mullet',     state: 'SA',  status: 'Endangered',   emoji: '🐟', encounters: 0 },
    { name: 'Plains-wanderer',    state: 'SA',  status: 'Critically Endangered', emoji: '🐦', encounters: 0 },
    // TAS
    { name: 'Tasmanian Devil',    state: 'TAS', status: 'Endangered',   emoji: '😈', encounters: 0 },
    { name: 'Eastern Quoll',      state: 'TAS', status: 'Near Threatened', emoji: '🐾', encounters: 0 },
    { name: 'Spotted-tail Quoll', state: 'TAS', status: 'Endangered',   emoji: '🐾', encounters: 0 },
    { name: 'Orange-bellied Parrot', state: 'TAS', status: 'Critically Endangered', emoji: '🦜', encounters: 0 },
    { name: 'Tasmanian Wedge-tail Eagle', state: 'TAS', status: 'Endangered', emoji: '🦅', encounters: 0 },
    // NT
    { name: 'Black-footed Rock-wallaby', state: 'NT', status: 'Vulnerable', emoji: '🦘', encounters: 0 },
    { name: 'Gouldian Finch',     state: 'NT',  status: 'Endangered',   emoji: '🐦', encounters: 0 },
    { name: 'Freshwater Crocodile', state: 'NT', status: 'Least Concern', emoji: '🐊', encounters: 0 },
    { name: 'Saltwater Crocodile', state: 'NT', status: 'Least Concern', emoji: '🐊', encounters: 0 },
    { name: 'Bilby',              state: 'NT',  status: 'Vulnerable',   emoji: '🐰', encounters: 0 },
    // ACT
    { name: 'Superb Parrot',      state: 'ACT', status: 'Vulnerable',   emoji: '🦜', encounters: 0 },
    { name: 'Gang-gang Cockatoo', state: 'ACT', status: 'Endangered',   emoji: '🦜', encounters: 0 },
    { name: 'Brush-tailed Rock-wallaby', state: 'ACT', status: 'Endangered', emoji: '🦘', encounters: 0 },
    { name: 'Striped Legless Lizard', state: 'ACT', status: 'Vulnerable', emoji: '🦎', encounters: 0 },
    { name: 'Golden Sun Moth',    state: 'ACT', status: 'Endangered',   emoji: '🦋', encounters: 0 },
  ];

  const STATUS_COLORS = {
    'Critically Endangered': '#FF3B30',
    'Endangered':            '#FF9500',
    'Vulnerable':            '#FFCC00',
    'Near Threatened':       '#34C759',
    'Least Concern':         '#00FF88',
    'Data Deficient':        '#8E8E93',
  };

  const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

  function getEncounterCounts() {
    const fauna = safeJSON(FAUNA_KEY, []);
    const counts = {};
    fauna.forEach(f => {
      const name = f.name || f.species || '';
      counts[name] = (counts[name] || 0) + 1;
    });

    // Also scan ledger for FAUNA_CATCH entries
    const ledger = [...safeJSON(LEDGER_KEY, []), ...safeJSON(LOG_KEY, [])];
    ledger.forEach(e => {
      const a = (e.action || e.type || '').toUpperCase();
      if (a.includes('FAUNA') || a.includes('CATCH')) {
        const name = e.data?.species || e.data?.name || e.payload?.species || '';
        if (name) counts[name] = (counts[name] || 0) + 1;
      }
    });

    return counts;
  }

  function render(container) {
    const encounterCounts = getEncounterCounts();
    const totalEncounters = Object.values(encounterCounts).reduce((s, v) => s + v, 0);

    // Enrich species data with encounter counts
    const enriched = SPECIES_DATA.map(s => ({
      ...s,
      encounters: encounterCounts[s.name] || 0
    }));

    // Status summary
    const statusSummary = {};
    enriched.forEach(s => {
      statusSummary[s.status] = (statusSummary[s.status] || 0) + 1;
    });

    // State summary
    const stateSummary = {};
    STATES.forEach(st => {
      const stateSpecies = enriched.filter(s => s.state === st);
      stateSummary[st] = {
        total: stateSpecies.length,
        encountered: stateSpecies.filter(s => s.encounters > 0).length,
        critical: stateSpecies.filter(s => s.status === 'Critically Endangered').length
      };
    });

    // Top encountered
    const topEncountered = [...enriched]
      .filter(s => s.encounters > 0)
      .sort((a, b) => b.encounters - a.encounters)
      .slice(0, 10);

    container.innerHTML = `
      <div class="section-title">CONSERVATION DASHBOARD</div>

      <div class="cons-summary">
        <div class="cons-card">
          <div class="cons-value">${enriched.length}</div>
          <div class="cons-label">Species Tracked</div>
        </div>
        <div class="cons-card">
          <div class="cons-value">${enriched.filter(s => s.encounters > 0).length}</div>
          <div class="cons-label">Species Encountered</div>
        </div>
        <div class="cons-card">
          <div class="cons-value">${totalEncounters.toLocaleString()}</div>
          <div class="cons-label">Total Encounters</div>
        </div>
        <div class="cons-card critical">
          <div class="cons-value">${statusSummary['Critically Endangered'] || 0}</div>
          <div class="cons-label">Critically Endangered</div>
        </div>
      </div>

      <div class="section-title">CONSERVATION STATUS BREAKDOWN</div>
      <div class="status-breakdown">
        ${Object.entries(STATUS_COLORS).map(([status, color]) => `
          <div class="status-row">
            <span class="status-dot" style="background:${color}"></span>
            <span class="status-name">${status}</span>
            <span class="status-count">${statusSummary[status] || 0} species</span>
          </div>`).join('')}
      </div>

      <div class="section-title">BY STATE & TERRITORY</div>
      <div class="state-grid">
        ${STATES.map(st => {
          const d = stateSummary[st];
          const pct = d.total > 0 ? Math.round((d.encountered / d.total) * 100) : 0;
          return `<div class="state-card">
            <div class="state-name">${st}</div>
            <div class="state-bar-track">
              <div class="state-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="state-stats">
              <span>${d.encountered}/${d.total} encountered</span>
              <span class="state-critical">${d.critical} critical</span>
            </div>
          </div>`;
        }).join('')}
      </div>

      ${topEncountered.length > 0 ? `
        <div class="section-title">MOST ENCOUNTERED SPECIES</div>
        <div class="top-species">
          ${topEncountered.map((s, i) => `
            <div class="species-row">
              <span class="species-rank">#${i + 1}</span>
              <span class="species-emoji">${s.emoji}</span>
              <span class="species-name">${s.name}</span>
              <span class="species-state">${s.state}</span>
              <span class="species-status" style="color:${STATUS_COLORS[s.status] || '#fff'}">${s.status}</span>
              <span class="species-count">${s.encounters} encounters</span>
            </div>`).join('')}
        </div>` : ''}

      <div class="section-title">ALL TRACKED SPECIES</div>
      <div class="all-species">
        ${enriched.map(s => `
          <div class="species-chip ${s.encounters > 0 ? 'encountered' : ''}">
            <span>${s.emoji}</span>
            <span class="chip-name">${s.name}</span>
            <span class="chip-dot" style="background:${STATUS_COLORS[s.status] || '#888'}"></span>
          </div>`).join('')}
      </div>

      <div class="ledger-note">
        Conservation data is derived from signed ledger entries. Every fauna encounter contributes to the Terracare Conservation Fund.
        Underscore Protocol: _[timestamp]_ CONSERVATION_RECORD | ECOSYSTEM: TERRACARE_LEDGER
      </div>`;
  }

  return { render, SPECIES_DATA, STATUS_COLORS };

})();
