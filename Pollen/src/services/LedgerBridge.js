/**
 * LedgerBridge - Terracare Ledger Connectivity for Pollen Wallet
 * 
 * Provides connectivity to the Terracare Ledger for recording
 * wallet activities, transactions, and state management.
 * Aligned with Oriana's LedgerBridge implementation.
 */

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ledger database path (local SQLite via Python bridge)
const LEDGER_DB_PATH = '../Terracare_Ledger/terracare.db';

// Smart contract addresses (to be configured)
const CONTRACT_ADDRESSES = {
  IdentityRegistry: '0x0000000000000000000000000000000000000000',
  ActivityRegistry: '0x0000000000000000000000000000000000000000',
  TokenEngine: '0x0000000000000000000000000000000000000000',
};

// Ledger configuration - Aligned with Terracare ecosystem
const LEDGER_CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api/ledger',
  EVENT_TYPES: {
    TOKEN_TRANSFER: 'TOKEN_TRANSFER',
    IDENTITY_REGISTER: 'IDENTITY_REGISTER',
    WALLET_LINK: 'WALLET_LINK',
    BLOOM_HARVEST: 'BLOOM_HARVEST',
    BLOOM_SPAWN: 'BLOOM_SPAWN',
    POT_ASSET_SPAWN: 'POT_ASSET_SPAWN',
    MARKET_SALE: 'MARKET_SALE',
    SALE: 'SALE',
  },
  // Platform fee configuration (6% fee aligned with Terracare)
  PLATFORM_FEE_RATE: 0.06,
};

/**
 * Connect to the Terracare Ledger
 */
export async function connectToLedger() {
  try {
    const response = await fetch(`${LEDGER_CONFIG.API_BASE_URL}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'pollen-wallet',
        timestamp: new Date().toISOString(),
      }),
    });
    
    const result = await response.json();
    console.log('[POLLEN LEDGER] Connected:', result);
    return { status: 'OK', connectionId: result.connectionId };
  } catch (error) {
    console.error('[POLLEN LEDGER] Connection failed:', error.message);
    return { status: 'ERROR', error: error.message };
  }
}

/**
 * Record an activity to the ledger
 */
export async function recordActivity(activityType, payload) {
  const eventId = await generateEventId(activityType, payload);
  
  const event = {
    eventId,
    activityType,
    payload,
    timestamp: new Date().toISOString(),
    signature: await signEvent(eventId, activityType, payload),
  };
  
  try {
    const response = await fetch(`${LEDGER_CONFIG.API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    
    const result = await response.json();
    
    if (result.status === 'OK') {
      // Store event locally for offline access
      await storeLocalEvent(event);
      console.log('[POLLEN LEDGER] Event recorded:', eventId);
      return { status: 'OK', eventId, result };
    }
    
    return { status: 'ERROR', error: 'Failed to record event' };
  } catch (error) {
    console.error('[POLLEN LEDGER] Record activity failed:', error.message);
    
    // Store locally for later sync
    await storeLocalEvent(event);
    return { status: 'PENDING', eventId, error: error.message };
  }
}

/**
 * Generate unique event ID
 */
async function generateEventId(activityType, payload) {
  const data = JSON.stringify({
    activityType,
    payload,
    timestamp: Date.now(),
    random: await Crypto.getRandomBytesAsync(8),
  });
  
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
  
  return `pollen_evt_${hash.slice(0, 16)}`;
}

/**
 * Sign event with cryptographic signature
 */
async function signEvent(eventId, activityType, payload) {
  const dataToSign = JSON.stringify({
    eventId,
    activityType,
    payload,
    timestamp: new Date().toISOString(),
  });
  
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataToSign
  );
}

/**
 * Store event locally for offline access
 */
async function storeLocalEvent(event) {
  try {
    const localEvents = await AsyncStorage.getItem('pollen_local_events');
    const events = localEvents ? JSON.parse(localEvents) : [];
    events.push(event);
    
    // Keep only last 100 events
    const trimmedEvents = events.slice(-100);
    
    await AsyncStorage.setItem('pollen_local_events', JSON.stringify(trimmedEvents));
  } catch (error) {
    console.error('[POLLEN LEDGER] Failed to store local event:', error.message);
  }
}

/**
 * Get latest ledger state
 */
export async function getLatestState() {
  try {
    const response = await fetch(`${LEDGER_CONFIG.API_BASE_URL}/state`, {
      method: 'GET',
    });
    
    const result = await response.json();
    return { status: 'OK', state: result.state };
  } catch (error) {
    console.error('[POLLEN LEDGER] Get state failed:', error.message);
    
    // Return cached state if available
    const cachedState = await AsyncStorage.getItem('pollen_cached_state');
    if (cachedState) {
      return { status: 'CACHED', state: JSON.parse(cachedState) };
    }
    
    return { status: 'ERROR', error: error.message };
  }
}

/**
 * Verify sovereign identity against ledger
 */
export async function verifySovereignIdentity(sovereignId) {
  try {
    const response = await fetch(
      `${LEDGER_CONFIG.API_BASE_URL}/identity/verify/${sovereignId}`,
      { method: 'GET' }
    );
    
    const result = await response.json();
    return result.verified || false;
  } catch (error) {
    console.error('[POLLEN LEDGER] Identity verification failed:', error.message);
    return false;
  }
}

/**
 * Sync pending local events to ledger
 */
export async function syncPendingEvents() {
  try {
    const localEvents = await AsyncStorage.getItem('pollen_local_events');
    const events = localEvents ? JSON.parse(localEvents) : [];
    
    if (events.length === 0) {
      return { status: 'OK', synced: 0 };
    }
    
    let syncedCount = 0;
    const failedEvents = [];
    
    for (const event of events) {
      try {
        const response = await fetch(`${LEDGER_CONFIG.API_BASE_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
        
        const result = await response.json();
        
        if (result.status === 'OK') {
          syncedCount++;
        } else {
          failedEvents.push(event);
        }
      } catch (error) {
        failedEvents.push(event);
      }
    }
    
    // Store only failed events back
    await AsyncStorage.setItem('pollen_local_events', JSON.stringify(failedEvents));
    
    console.log('[POLLEN LEDGER] Synced', syncedCount, 'events');
    return { status: 'OK', synced: syncedCount, failed: failedEvents.length };
  } catch (error) {
    console.error('[POLLEN LEDGER] Sync failed:', error.message);
    return { status: 'ERROR', error: error.message };
  }
}

/**
 * Get wallet balance from ledger
 */
export async function getWalletBalance(walletAddress) {
  try {
    const response = await fetch(
      `${LEDGER_CONFIG.API_BASE_URL}/balance/${walletAddress}`,
      { method: 'GET' }
    );
    
    const result = await response.json();
    return { status: 'OK', balance: result.balance || '0.00' };
  } catch (error) {
    console.error('[POLLEN LEDGER] Get balance failed:', error.message);
    return { status: 'ERROR', error: error.message };
  }
}

/**
 * Get transaction history from ledger
 */
export async function getTransactionHistory(walletAddress, limit = 20) {
  try {
    const response = await fetch(
      `${LEDGER_CONFIG.API_BASE_URL}/transactions/${walletAddress}?limit=${limit}`,
      { method: 'GET' }
    );
    
    const result = await response.json();
    return { status: 'OK', transactions: result.transactions || [] };
  } catch (error) {
    console.error('[POLLEN LEDGER] Get transactions failed:', error.message);
    return { status: 'ERROR', error: error.message };
  }
}

/**
 * Process sale with ledger integration
 * Aligned with Oriana's processSale function
 */
export async function processSale(from, to, amount, itemDetails) {
  const gross = parseFloat(amount);
  const fee = (gross * LEDGER_CONFIG.PLATFORM_FEE_RATE).toFixed(2);
  const net = (gross * (1 - LEDGER_CONFIG.PLATFORM_FEE_RATE)).toFixed(2);
  
  // Record transaction to ledger
  const activityResult = await recordActivity('MARKET_SALE', {
    from,
    to,
    gross,
    fee: parseFloat(fee),
    net: parseFloat(net),
    item: itemDetails,
    timestamp: new Date().toISOString(),
  });
  
  return {
    gross,
    fee: parseFloat(fee),
    net: parseFloat(net),
    ledgerRecord: activityResult,
  };
}

/**
 * Calculate net amount after platform fee
 * Utility function for fee calculations
 */
export function calculateNet(amount) {
  const gross = parseFloat(amount);
  const fee = (gross * LEDGER_CONFIG.PLATFORM_FEE_RATE).toFixed(2);
  const net = (gross - parseFloat(fee)).toFixed(2);
  
  return {
    gross,
    fee: parseFloat(fee),
    net: parseFloat(net),
  };
}

/**
 * Commit event directly to ledger
 */
export async function commitEvent(event) {
  try {
    const response = await fetch(`${LEDGER_CONFIG.API_BASE_URL}/events/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[POLLEN LEDGER] Commit event failed:', error.message);
    return { status: 'ERROR', error: error.message };
  }
}

export const LedgerBridge = {
  // Connection
  connect: connectToLedger,
  
  // Activity recording
  recordActivity,
  
  // Sale processing (aligned with Oriana)
  processSale,
  calculateNet,
  
  // Event management
  commitEvent,
  
  // State queries
  getLatestState,
  getWalletBalance,
  getTransactionHistory,
  
  // Identity verification
  verifySovereignIdentity,
  
  // Sync management
  syncPendingEvents,
  
  // Configuration
  LEDGER_CONFIG,
  CONTRACT_ADDRESSES,
};

export default LedgerBridge;
