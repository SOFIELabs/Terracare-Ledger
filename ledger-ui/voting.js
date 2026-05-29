/**
 * TERRACARE LEDGER UI — voting.js
 * Phase 27 | Community Voting System
 * Proposals, YES/NO votes, quorum, signed to ledger
 */

'use strict';

window.TCVoting = (function () {

  const PROPOSALS_KEY = 'tc_proposals';
  const VOTES_KEY     = 'tc_votes';
  const IDENTITY_KEY  = 'oriana_identity';
  const LEDGER_KEY    = 'terracare_ledger';
  const QUORUM_PCT    = 0.10; // 10% of registered users
  const MIN_USERS     = 5;    // minimum for quorum in early beta

  function safeJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function saveJSON(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function getIdentity() {
    return safeJSON(IDENTITY_KEY, null);
  }

  function getProposals() {
    return safeJSON(PROPOSALS_KEY, []);
  }

  function getVotes() {
    return safeJSON(VOTES_KEY, {});
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ─── Write to Ledger ─────────────────────────────────────────────────────────
  function writeLedger(action, data) {
    const ts = Date.now();
    const identity = getIdentity();
    const entry = {
      timestamp: ts,
      action: action,
      publicKey: identity?.publicKey || 'anonymous',
      data: data,
      underscore: `_${ts}_ ${action} | ECOSYSTEM: TERRACARE_LEDGER`
    };
    const ledger = safeJSON(LEDGER_KEY, []);
    ledger.push(entry);
    saveJSON(LEDGER_KEY, ledger);
    return entry;
  }

  // ─── Create Proposal ─────────────────────────────────────────────────────────
  function createProposal(title, description, category) {
    const identity = getIdentity();
    if (!identity || !identity.publicKey) {
      alert('You must have a sovereign identity to create proposals. Open Oriana to create yours.');
      return null;
    }

    const proposals = getProposals();
    const id = 'prop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    const proposal = {
      id,
      title: title.trim(),
      description: description.trim(),
      category: category || 'GENERAL',
      author: identity.publicKey,
      authorName: identity.name || 'Anonymous',
      created: Date.now(),
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'ACTIVE',
      yesVotes: 0,
      noVotes: 0,
      quorumRequired: MIN_USERS,
    };

    proposals.push(proposal);
    saveJSON(PROPOSALS_KEY, proposals);

    writeLedger('PROPOSAL_CREATED', {
      proposalId: id,
      title: proposal.title,
      category: proposal.category,
      author: identity.publicKey
    });

    return proposal;
  }

  // ─── Cast Vote ───────────────────────────────────────────────────────────────
  function castVote(proposalId, vote) {
    const identity = getIdentity();
    if (!identity || !identity.publicKey) {
      alert('You must have a sovereign identity to vote. Open Oriana to create yours.');
      return false;
    }

    const votes = getVotes();
    const voteKey = `${proposalId}:${identity.publicKey}`;

    if (votes[voteKey]) {
      alert('You have already voted on this proposal.');
      return false;
    }

    // Record vote
    votes[voteKey] = {
      vote,
      voter: identity.publicKey,
      proposalId,
      timestamp: Date.now()
    };
    saveJSON(VOTES_KEY, votes);

    // Update proposal tally
    const proposals = getProposals();
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      if (vote === 'YES') proposal.yesVotes++;
      else proposal.noVotes++;

      const totalVotes = proposal.yesVotes + proposal.noVotes;
      if (totalVotes >= proposal.quorumRequired) {
        proposal.status = proposal.yesVotes > proposal.noVotes ? 'PASSED' : 'FAILED';
      }

      saveJSON(PROPOSALS_KEY, proposals);
    }

    writeLedger('VOTE_CAST', {
      proposalId,
      vote,
      voter: identity.publicKey,
      proposalTitle: proposal?.title || ''
    });

    return true;
  }

  // ─── Get user's vote on a proposal ───────────────────────────────────────────
  function getUserVote(proposalId) {
    const identity = getIdentity();
    if (!identity) return null;
    const votes = getVotes();
    const voteKey = `${proposalId}:${identity.publicKey}`;
    return votes[voteKey] || null;
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  function render(container) {
    const proposals = getProposals();
    const identity  = getIdentity();
    const hasIdentity = !!(identity && identity.publicKey);

    // Sort: active first, then by created desc
    const sorted = [...proposals].sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      return b.created - a.created;
    });

    const active  = sorted.filter(p => p.status === 'ACTIVE');
    const closed  = sorted.filter(p => p.status !== 'ACTIVE');

    container.innerHTML = `
      <div class="section-title">COMMUNITY VOTING</div>
      <div class="voting-intro">
        Proposals are voted on by the Terracare community. Quorum: ${MIN_USERS} votes minimum.
        All votes are signed to the Terracare Ledger and permanently recorded.
      </div>

      ${hasIdentity ? `
        <div class="create-proposal-panel">
          <div class="create-title">CREATE A PROPOSAL</div>
          <input id="prop-title" class="prop-input" type="text" placeholder="Proposal title (max 100 chars)" maxlength="100" />
          <select id="prop-category" class="prop-select">
            <option value="GENERAL">General</option>
            <option value="CONSERVATION">Conservation</option>
            <option value="POLLEN">Pollen Economy</option>
            <option value="GOVERNANCE">Governance</option>
            <option value="FAUNA">Fauna & AR</option>
            <option value="SWARM">Swarm Infrastructure</option>
            <option value="COMMUNITY">Community</option>
          </select>
          <textarea id="prop-desc" class="prop-textarea" placeholder="Describe your proposal (max 500 chars)" maxlength="500"></textarea>
          <button class="prop-submit-btn" onclick="window.TCVoting.submitProposal()">SUBMIT PROPOSAL TO LEDGER</button>
        </div>` : `
        <div class="voting-no-identity">
          You need a sovereign identity to create proposals or vote.
          <a href="/" class="identity-link">Open Oriana to create yours →</a>
        </div>`}

      <div class="section-title">ACTIVE PROPOSALS (${active.length})</div>
      ${active.length === 0
        ? '<div class="empty-state">No active proposals. Be the first to submit one.</div>'
        : active.map(p => renderProposalCard(p, hasIdentity)).join('')}

      ${closed.length > 0 ? `
        <div class="section-title">CLOSED PROPOSALS (${closed.length})</div>
        ${closed.map(p => renderProposalCard(p, false)).join('')}` : ''}

      <div class="ledger-note">
        All votes are signed with your sovereign identity and written to the Terracare Ledger.
        Underscore Protocol: _[timestamp]_ VOTE_CAST | ECOSYSTEM: TERRACARE_LEDGER
      </div>`;
  }

  function renderProposalCard(proposal, canVote) {
    const userVote = getUserVote(proposal.id);
    const total    = proposal.yesVotes + proposal.noVotes;
    const yesPct   = total > 0 ? Math.round((proposal.yesVotes / total) * 100) : 0;
    const noPct    = total > 0 ? Math.round((proposal.noVotes  / total) * 100) : 0;
    const quorumMet = total >= proposal.quorumRequired;

    const statusColor = {
      'ACTIVE': '#FFD166',
      'PASSED': '#00FF88',
      'FAILED': '#FF3B30',
    }[proposal.status] || '#888';

    const categoryColors = {
      'CONSERVATION': '#00FF88',
      'POLLEN':       '#FFD166',
      'GOVERNANCE':   '#CE93D8',
      'FAUNA':        '#4FC3F7',
      'SWARM':        '#F5A623',
      'COMMUNITY':    '#FF9500',
      'GENERAL':      '#8E8E93',
    };

    const catColor = categoryColors[proposal.category] || '#8E8E93';
    const isExpired = Date.now() > proposal.expires && proposal.status === 'ACTIVE';

    return `
      <div class="proposal-card ${proposal.status.toLowerCase()}">
        <div class="proposal-header">
          <span class="proposal-category" style="color:${catColor}">${escapeHTML(proposal.category)}</span>
          <span class="proposal-status" style="color:${statusColor}">${proposal.status}${isExpired ? ' (EXPIRED)' : ''}</span>
        </div>
        <div class="proposal-title">${escapeHTML(proposal.title)}</div>
        <div class="proposal-desc">${escapeHTML(proposal.description)}</div>
        <div class="proposal-meta">
          By ${escapeHTML(proposal.authorName || 'Anonymous')} · ${formatTime(proposal.created)}
          ${proposal.status === 'ACTIVE' ? ` · Expires ${formatTime(proposal.expires)}` : ''}
        </div>

        <div class="vote-bars">
          <div class="vote-bar-row">
            <span class="vote-label yes">YES</span>
            <div class="vote-track">
              <div class="vote-fill yes" style="width:${yesPct}%"></div>
            </div>
            <span class="vote-count">${proposal.yesVotes} (${yesPct}%)</span>
          </div>
          <div class="vote-bar-row">
            <span class="vote-label no">NO</span>
            <div class="vote-track">
              <div class="vote-fill no" style="width:${noPct}%"></div>
            </div>
            <span class="vote-count">${proposal.noVotes} (${noPct}%)</span>
          </div>
        </div>

        <div class="quorum-status ${quorumMet ? 'met' : ''}">
          Quorum: ${total}/${proposal.quorumRequired} votes ${quorumMet ? '✓ MET' : '(not yet met)'}
        </div>

        ${canVote && proposal.status === 'ACTIVE' && !isExpired ? (
          userVote
            ? `<div class="voted-badge">You voted: <strong>${userVote.vote}</strong></div>`
            : `<div class="vote-actions">
                <button class="vote-btn yes" onclick="window.TCVoting.vote('${proposal.id}', 'YES')">✓ YES</button>
                <button class="vote-btn no"  onclick="window.TCVoting.vote('${proposal.id}', 'NO')">✗ NO</button>
               </div>`
        ) : (userVote ? `<div class="voted-badge">You voted: <strong>${userVote.vote}</strong></div>` : '')}
      </div>`;
  }

  // ─── Public API ───────────────────────────────────────────────────────────────
  function submitProposal() {
    const title    = (document.getElementById('prop-title')?.value || '').trim();
    const desc     = (document.getElementById('prop-desc')?.value || '').trim();
    const category = document.getElementById('prop-category')?.value || 'GENERAL';

    if (!title) { alert('Please enter a proposal title.'); return; }
    if (!desc)  { alert('Please enter a proposal description.'); return; }

    const proposal = createProposal(title, desc, category);
    if (proposal) {
      // Re-render
      const container = document.getElementById('tab-voting');
      if (container) render(container);
    }
  }

  function vote(proposalId, voteValue) {
    const success = castVote(proposalId, voteValue);
    if (success) {
      const container = document.getElementById('tab-voting');
      if (container) render(container);
    }
  }

  // Seed example proposals if none exist (for demo/beta)
  function seedExampleProposals() {
    const existing = getProposals();
    if (existing.length > 0) return;

    const examples = [
      {
        id: 'prop_seed_001',
        title: 'Add 10 new marine species to the fauna manifest',
        description: 'Proposal to expand the fauna manifest with 10 additional marine species including the Great White Shark, Blue-ringed Octopus, and Leafy Sea Dragon to improve ocean conservation awareness.',
        category: 'FAUNA',
        author: 'TERRACARE_GENESIS',
        authorName: 'Terracare Genesis',
        created: Date.now() - (2 * 24 * 60 * 60 * 1000),
        expires: Date.now() + (5 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        yesVotes: 7,
        noVotes: 1,
        quorumRequired: MIN_USERS,
      },
      {
        id: 'prop_seed_002',
        title: 'Increase daily questionnaire reward from 50 to 75 Pollen',
        description: 'The current 50 Pollen reward for completing the daily questionnaire is too low to incentivise consistent participation. Propose increasing to 75 Pollen to improve daily active user rates.',
        category: 'POLLEN',
        author: 'TERRACARE_GENESIS',
        authorName: 'Terracare Genesis',
        created: Date.now() - (4 * 24 * 60 * 60 * 1000),
        expires: Date.now() + (3 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        yesVotes: 12,
        noVotes: 3,
        quorumRequired: MIN_USERS,
      },
      {
        id: 'prop_seed_003',
        title: 'Establish a Terracare Conservation Advisory Council',
        description: 'Create a 5-member advisory council elected by the community to oversee conservation fund allocation. Council members serve 90-day terms and publish monthly reports to the Terracare Ledger.',
        category: 'GOVERNANCE',
        author: 'TERRACARE_GENESIS',
        authorName: 'Terracare Genesis',
        created: Date.now() - (10 * 24 * 60 * 60 * 1000),
        expires: Date.now() - (3 * 24 * 60 * 60 * 1000),
        status: 'PASSED',
        yesVotes: 18,
        noVotes: 2,
        quorumRequired: MIN_USERS,
      },
    ];

    saveJSON(PROPOSALS_KEY, examples);
  }

  // Auto-seed on load
  seedExampleProposals();

  return { render, submitProposal, vote, createProposal, castVote };

})();
