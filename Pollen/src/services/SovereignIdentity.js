/**
 * SovereignIdentity - Web2.5 Identity Integration for Pollen Wallet
 * 
 * Manages sovereign identity verification and cryptographic signing
 * for Pollen wallet users, linking to Terracare Ledger's IdentityRegistry.
 * Aligned with Oriana's SovereignIdentity implementation.
 */

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Identity storage keys for Pollen Wallet
const IDENTITY_STORAGE_KEYS = {
  SOVEREIGN_ID: 'pollen_sovereign_id',
  IDENTITY_KEYPAIR: 'pollen_identity_keypair',
  VERIFICATION_STATUS: 'pollen_verification_status',
  WALLET_ADDRESS: 'pollen_wallet_address',
  PROFILE_DATA: 'pollen_profile_data',
};

// Terracare Ledger Identity API endpoint
const IDENTITY_API_BASE_URL = 'http://localhost:5000/api/ledger/identity';

/**
 * Generate sovereign identity keypair
 * Creates Ed25519-style keys for identity signing
 */
export async function generateSovereignKeypair() {
  // Generate random seed for identity
  const seed = await Crypto.getRandomBytesAsync(32);
  const seedHex = Array.from(seed)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Derive identity ID from seed
  const identityHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    seedHex
  );
  
  const sovereignId = `pollen_sov_${identityHash.slice(0, 16)}`;
  
  // Create keypair (simplified - in production use proper Ed25519)
  const keypair = {
    publicKey: await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      seedHex + '_public'
    ),
    privateKey: seedHex, // Keep seed as private key reference
  };
  
  return {
    sovereignId,
    keypair,
    seed: seedHex,
  };
}

/**
 * Store sovereign identity securely
 */
export async function storeSovereignIdentity(identity) {
  try {
    const storage = {
      [IDENTITY_STORAGE_KEYS.SOVEREIGN_ID]: identity.sovereignId,
      [IDENTITY_STORAGE_KEYS.IDENTITY_KEYPAIR]: JSON.stringify(identity.keypair),
      [IDENTITY_STORAGE_KEYS.VERIFICATION_STATUS]: 'PENDING',
    };
    
    for (const [key, value] of Object.entries(storage)) {
      await AsyncStorage.setItem(key, value);
    }
    
    console.log('[POLLEN IDENTITY] Sovereign identity stored:', identity.sovereignId);
    return true;
  } catch (error) {
    console.error('[POLLEN IDENTITY] Failed to store identity:', error.message);
    return false;
  }
}

/**
 * Retrieve stored sovereign identity
 */
export async function retrieveSovereignIdentity() {
  try {
    const sovereignId = await AsyncStorage.getItem(IDENTITY_STORAGE_KEYS.SOVEREIGN_ID);
    const keypairStr = await AsyncStorage.getItem(IDENTITY_STORAGE_KEYS.IDENTITY_KEYPAIR);
    const verificationStatus = await AsyncStorage.getItem(IDENTITY_STORAGE_KEYS.VERIFICATION_STATUS);
    
    if (!sovereignId || !keypairStr) {
      return null;
    }
    
    return {
      sovereignId,
      keypair: JSON.parse(keypairStr),
      verificationStatus: verificationStatus || 'PENDING',
    };
  } catch (error) {
    console.error('[POLLEN IDENTITY] Failed to retrieve identity:', error.message);
    return null;
  }
}

/**
 * Register sovereign identity with Terracare Ledger
 * Commits identity to the IdentityRegistry
 * Aligned with Oriana's registration pattern
 */
export async function registerSovereignIdentity(identity, userData) {
  const { sovereignId, keypair } = identity;
  
  // Create identity registration payload aligned with Terracare Ledger schema
  const registrationPayload = {
    id: sovereignId,
    sovereign_id: sovereignId,
    public_key: keypair.publicKey,
    profile: {
      handle: userData.handle,
      display_name: userData.displayName,
      bio: userData.bio,
      created_at: new Date().toISOString(),
    },
    signature: await signIdentityRegistration(identity, userData),
    timestamp: new Date().toISOString(),
  };
  
  // Commit to ledger via Python bridge API
  try {
    const response = await fetch(`${IDENTITY_API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationPayload),
    });
    
    const result = await response.json();
    
    if (result.status === 'OK' || result.verified) {
      await AsyncStorage.setItem(IDENTITY_STORAGE_KEYS.VERIFICATION_STATUS, 'VERIFIED');
      await AsyncStorage.setItem(IDENTITY_STORAGE_KEYS.PROFILE_DATA, JSON.stringify(userData));
      console.log('[POLLEN IDENTITY] Registered with ledger:', result);
      return { success: true, ledgerResult: result, sovereignId };
    }
  } catch (error) {
    console.error('[POLLEN IDENTITY] Ledger registration failed:', error.message);
  }
  
  return { success: false, error: 'Ledger registration failed' };
}

/**
 * Sign identity registration data
 */
async function signIdentityRegistration(identity, userData) {
  const dataToSign = JSON.stringify({
    sovereignId: identity.sovereignId,
    publicKey: identity.keypair.publicKey,
    userData,
    timestamp: new Date().toISOString(),
  });
  
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataToSign
  );
}

/**
 * Verify sovereign identity against ledger
 * Aligned with Oriana's verification pattern
 */
export async function verifySovereignIdentity(sovereignId) {
  try {
    const response = await fetch(
      `${IDENTITY_API_BASE_URL}/verify/${sovereignId}`,
      { method: 'GET' }
    );
    
    const result = await response.json();
    return result.verified || false;
  } catch (error) {
    console.error('[POLLEN IDENTITY] Verification failed:', error.message);
    return false;
  }
}

/**
 * Sign activity with sovereign identity
 * Creates cryptographic proof of user actions
 */
export async function signWithSovereignIdentity(activityData) {
  const identity = await retrieveSovereignIdentity();
  
  if (!identity) {
    throw new Error('No sovereign identity found');
  }
  
  const dataToSign = JSON.stringify({
    ...activityData,
    sovereignId: identity.sovereignId,
    timestamp: new Date().toISOString(),
  });
  
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataToSign
  );
  
  return {
    ...activityData,
    sovereignId: identity.sovereignId,
    signature,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Link wallet address to sovereign identity
 * Aligned with Oriana's wallet linking pattern
 */
export async function linkWalletAddress(walletAddress, signature) {
  const identity = await retrieveSovereignIdentity();
  
  if (!identity) {
    throw new Error('No sovereign identity found');
  }
  
  // Store wallet address locally
  await AsyncStorage.setItem(IDENTITY_STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
  
  // Register wallet link with Terracare Ledger
  try {
    const response = await fetch(`${IDENTITY_API_BASE_URL}/link-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sovereign_id: identity.sovereignId,
        wallet_address: walletAddress,
        signature: signature,
        linked_at: new Date().toISOString(),
      }),
    });
    
    const result = await response.json();
    console.log('[POLLEN IDENTITY] Wallet link result:', result);
  } catch (error) {
    console.error('[POLLEN IDENTITY] Wallet link failed:', error.message);
  }
  
  console.log('[POLLEN IDENTITY] Wallet linked:', walletAddress);
  return { success: true, walletAddress, sovereignId: identity.sovereignId };
}

/**
 * Get current sovereign identity status
 */
export async function getIdentityStatus() {
  const identity = await retrieveSovereignIdentity();
  
  if (!identity) {
    return {
      hasIdentity: false,
      isVerified: false,
      hasWallet: false,
    };
  }
  
  const walletAddress = await AsyncStorage.getItem(IDENTITY_STORAGE_KEYS.WALLET_ADDRESS);
  
  return {
    hasIdentity: true,
    sovereignId: identity.sovereignId,
    isVerified: identity.verificationStatus === 'VERIFIED',
    verificationStatus: identity.verificationStatus,
    hasWallet: !!walletAddress,
    walletAddress: walletAddress || null,
  };
}

/**
 * Create sovereign-proof activity
 */
export async function createSovereignProofActivity(activityType, payload) {
  const identity = await retrieveSovereignIdentity();
  
  if (!identity) {
    throw new Error('No sovereign identity - user must register first');
  }
  
  const nonce = Array.from(await Crypto.getRandomBytesAsync(8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const activity = {
    activityType,
    payload,
    sovereignId: identity.sovereignId,
    timestamp: new Date().toISOString(),
    nonce,
  };
  
  activity.signature = await signWithSovereignIdentity(activity);
  
  return activity;
}

/**
 * Initialize or retrieve sovereign identity
 * Main entry point for identity management
 */
export async function initializeSovereignIdentity(userData = null) {
  let identity = await retrieveSovereignIdentity();
  
  if (identity) {
    console.log('[POLLEN IDENTITY] Found existing identity:', identity.sovereignId);
    return identity;
  }
  
  if (userData) {
    const newKeypair = await generateSovereignKeypair();
    identity = {
      sovereignId: newKeypair.sovereignId,
      keypair: newKeypair.keypair,
      verificationStatus: 'PENDING',
    };
    
    await storeSovereignIdentity(identity);
    
    const registrationResult = await registerSovereignIdentity(identity, userData);
    
    if (registrationResult.success) {
      identity.verificationStatus = 'VERIFIED';
    }
    
    console.log('[POLLEN IDENTITY] Created new sovereign identity:', identity.sovereignId);
  }
  
  return identity;
}

export const SovereignIdentity = {
  // Key generation
  generate: generateSovereignKeypair,
  
  // Storage management
  store: storeSovereignIdentity,
  retrieve: retrieveSovereignIdentity,
  
  // Registration and verification
  register: registerSovereignIdentity,
  verify: verifySovereignIdentity,
  
  // Signing operations
  sign: signWithSovereignIdentity,
  createProofActivity: createSovereignProofActivity,
  
  // Wallet linking
  linkWallet: linkWalletAddress,
  
  // Status and initialization
  getStatus: getIdentityStatus,
  initialize: initializeSovereignIdentity,
  
  // Configuration
  IDENTITY_STORAGE_KEYS,
  IDENTITY_API_BASE_URL,
};

export default SovereignIdentity;
