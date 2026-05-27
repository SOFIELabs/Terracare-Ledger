/**
 * BloomDecayProtocol - Bloom Cycle & Decay System for Pollen Wallet
 * 
 * Implements the Terracare bloom window timing system aligned with Oriana:
 * - 6 bloom windows per day (4-hour intervals)
 * - 1-hour bloom duration at window start
 * - 72-hour half-life decay for Pot_Assets
 * - Pot_Asset capacities: common(20), uncommon(10), rare(5), epic(3), legendary(1)
 * 
 * This implementation is fully aligned with the Terracare ecosystem and Oriana.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Bloom Configuration - Aligned with Oriana and Terracare ecosystem
const BLOOM_CONFIG = {
  // 6 bloom windows per day (every 4 hours)
  BLOOM_WINDOWS: [0, 4, 8, 12, 16, 20],
  WINDOWS_PER_DAY: 6,
  WINDOW_DURATION_HOURS: 4,
  BLOOM_DURATION_HOURS: 1,
  BLOOM_DURATION_MINUTES: 60,
  DECAY_HALF_LIFE_HOURS: 72,
  DECAY_CHECK_INTERVAL_MINUTES: 30,
  
  // Pot_Asset Capacities - Aligned with Oriana rarity system
  POT_ASSET_CAPACITIES: {
    common: 20,
    uncommon: 10,
    rare: 5,
    epic: 3,
    legendary: 1,
  },
  // Legacy tier-based capacities (for backward compatibility)
  TIER_CAPACITIES: [20, 10, 5, 3, 1],
  
  // Asset Types
  ASSET_TYPES: {
    FRUIT: 'Fruit',
    CRITTER: 'Critter',
  },
  
  STORAGE_KEYS: {
    POT_ASSETS: 'pollen_pot_assets',
    BLOOM_HISTORY: 'pollen_bloom_history',
    HARVEST_LOG: 'pollenHarvest_log',
  },
};

// Bloom window names - Aligned with Terracare ecosystem
const BLOOM_WINDOW_NAMES = [
  'Dawn Bloom',      // 00:00 - 04:00
  'Morning Bloom',   // 04:00 - 08:00
  'Noon Bloom',      // 08:00 - 12:00
  'Afternoon Bloom', // 12:00 - 16:00
  'Evening Bloom',   // 16:00 - 20:00
  'Night Bloom',     // 20:00 - 24:00
];

// Australian Sectors - Aligned with Terracare's 8-sector system
const AUSTRALIAN_SECTORS = {
  VIC: { id: 'VIC', name: 'Victoria', region: 'Southeast' },
  NSW: { id: 'NSW', name: 'New South Wales', region: 'East' },
  SA: { id: 'SA', name: 'South Australia', region: 'Central' },
  WA: { id: 'WA', name: 'Western Australia', region: 'West' },
  TAS: { id: 'TAS', name: 'Tasmania', region: 'South' },
  CAN: { id: 'CAN', name: 'Canberra/ACT', region: 'Capital' },
  QLD: { id: 'QLD', name: 'Queensland', region: 'Northeast' },
  NT: { id: 'NT', name: 'Northern Territory', region: 'North' },
};

/**
 * PotAsset class representing a bloom-capable asset
 */
export class PotAsset {
  constructor(data) {
    this.id = data.id || `pot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.name = data.name || 'Terracare Pot Asset';
    this.tier = data.tier || 1; // 1-5 based on capacity
    this.capacity = data.capacity || BLOOM_CONFIG.POT_ASSET_CAPACITIES[this.tier - 1];
    this.spawnedAt = data.spawnedAt || new Date().toISOString();
    this.lastHarvest = data.lastHarvest || null;
    this.decayStartTime = data.decayStartTime || null;
    this.totalHarvested = data.totalHarvested || 0;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  /**
   * Harvest resources from this pot asset
   */
  harvest(currentBloomWindow) {
    if (!this.isActive) {
      return { success: false, error: 'Asset is not active' };
    }

    // Check if in bloom window
    if (!currentBloomWindow.isActive) {
      return { success: false, error: 'Not during bloom window' };
    }

    // Check if already harvested this bloom
    if (this.lastHarvest && new Date(this.lastHarvest) > currentBloomWindow.startTime) {
      return { success: false, error: 'Already harvested this bloom' };
    }

    // Calculate harvest amount based on decay
    const decayFactor = this.getDecayPercentage();
    const harvestAmount = Math.floor(this.capacity * decayFactor);

    if (harvestAmount <= 0) {
      return { success: false, error: 'Asset fully decayed' };
    }

    // Update state
    this.lastHarvest = new Date().toISOString();
    this.totalHarvested += harvestAmount;

    // Start decay if not already started
    if (!this.decayStartTime) {
      this.decayStartTime = new Date().toISOString();
    }

    return {
      success: true,
      harvestAmount,
      remainingCapacity: Math.floor(this.capacity * decayFactor) - harvestAmount,
    };
  }

  /**
   * Start decay process
   */
  startDecay() {
    this.decayStartTime = new Date().toISOString();
  }

  /**
   * Check if asset is fully decayed
   */
  isFullyDecayed() {
    if (!this.decayStartTime) return false;
    return this.getDecayPercentage() <= 0.01; // Less than 1% remaining
  }

  /**
   * Get decay percentage (0-1)
   */
  getDecayPercentage() {
    if (!this.decayStartTime) return 1.0;

    const decayStart = new Date(this.decayStartTime);
    const now = new Date();
    const hoursElapsed = (now - decayStart) / (1000 * 60 * 60);
    
    // Exponential decay: remaining = initial * (0.5)^(t/half_life)
    const decayFactor = Math.pow(0.5, hoursElapsed / BLOOM_CONFIG.DECAY_HALF_LIFE_HOURS);
    
    return Math.max(0, decayFactor);
  }

  /**
   * Serialize for ledger storage
   */
  toLedgerPayload() {
    return {
      id: this.id,
      name: this.name,
      tier: this.tier,
      capacity: this.capacity,
      spawnedAt: this.spawnedAt,
      lastHarvest: this.lastHarvest,
      decayStartTime: this.decayStartTime,
      totalHarvested: this.totalHarvested,
      isActive: this.isActive,
      currentDecayPercentage: this.getDecayPercentage(),
    };
  }
}

/**
 * Check if current time is within a bloom window
 * Aligned with Oriana's isBloomActive function
 */
export function isBloomActive(date = new Date()) {
  const currentHour = date.getHours();
  return BLOOM_CONFIG.BLOOM_WINDOWS.includes(currentHour);
}

/**
 * Get current bloom window information
 * Aligned with Oriana's getCurrentBloomWindow function
 */
export async function getCurrentBloomWindow(date = new Date()) {
  const now = date || new Date();
  const currentHour = now.getHours();
  
  // Check if currently in a bloom window
  if (!isBloomActive(now)) {
    // Find next bloom window
    const nextWindow = BLOOM_CONFIG.BLOOM_WINDOWS.find(h => h > currentHour);
    if (nextWindow !== undefined) {
      const nextBloom = new Date(now);
      nextBloom.setHours(nextWindow, 0, 0, 0);
      return {
        windowIndex: BLOOM_CONFIG.BLOOM_WINDOWS.indexOf(nextWindow),
        windowName: BLOOM_WINDOW_NAMES[BLOOM_CONFIG.BLOOM_WINDOWS.indexOf(nextWindow)] || 'Unknown',
        active: false,
        isActive: false,
        nextBloom: nextBloom,
        timeUntilBloom: nextBloom - now,
        startTime: nextBloom.toISOString(),
        endTime: new Date(nextBloom.getTime() + BLOOM_CONFIG.WINDOW_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
        progress: 0,
        activeAssets: await getActivePotAssetsCount(),
      };
    }
    return {
      windowIndex: -1,
      windowName: 'Unknown',
      active: false,
      isActive: false,
      nextBloom: null,
      timeUntilBloom: null,
      startTime: null,
      endTime: null,
      progress: 0,
      activeAssets: await getActivePotAssetsCount(),
    };
  }
  
  // Currently in a bloom window
  const windowIndex = BLOOM_CONFIG.BLOOM_WINDOWS.indexOf(currentHour);
  const windowStart = new Date(now);
  windowStart.setHours(currentHour, 0, 0, 0);
  
  const windowEnd = new Date(windowStart);
  windowEnd.setHours(windowStart.getHours() + BLOOM_CONFIG.WINDOW_DURATION_HOURS);
  
  const bloomStart = new Date(windowStart);
  bloomStart.setMinutes(bloomStart.getMinutes() + BLOOM_CONFIG.BLOOM_DURATION_MINUTES);
  
  const isActive = now >= windowStart && now < bloomStart;
  const totalWindowMinutes = BLOOM_CONFIG.WINDOW_DURATION_HOURS * 60;
  const elapsedMinutes = (now - windowStart) / (1000 * 60);
  const progress = Math.min(100, Math.max(0, (elapsedMinutes / totalWindowMinutes) * 100));
  
  return {
    windowIndex,
    windowName: BLOOM_WINDOW_NAMES[windowIndex],
    active: true,
    isActive,
    windowStart,
    windowEnd,
    startTime: windowStart.toISOString(),
    endTime: windowEnd.toISOString(),
    bloomStartTime: bloomStart.toISOString(),
    timeRemaining: windowEnd - now,
    progress: Math.round(progress),
    activeAssets: await getActivePotAssetsCount(),
  };
}

/**
 * Check if bloom is currently active (async wrapper)
 * This is kept for backward compatibility with the original API
 */
export async function checkBloomActive() {
  const bloomWindow = await getCurrentBloomWindow();
  return bloomWindow.isActive;
}

/**
 * Get active pot assets count
 */
async function getActivePotAssetsCount() {
  try {
    const assetsStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS);
    const assets = assetsStr ? JSON.parse(assetsStr) : [];
    return assets.filter(a => a.isActive && !new PotAsset(a).isFullyDecayed()).length;
  } catch {
    return 0;
  }
}

/**
 * Spawn bloom assets during active bloom window
 * Aligned with Oriana's spawnBloomAssets function with sector support
 */
export async function spawnBloomAssets(userId, count = 1, sectorId = 'VIC') {
  const bloomWindow = await getCurrentBloomWindow();
  
  if (!bloomWindow.isActive) {
    return { success: false, error: 'Cannot spawn assets outside bloom window' };
  }

  // Validate sector
  const sector = AUSTRALIAN_SECTORS[sectorId];
  if (!sector) {
    return { success: false, error: 'Invalid sector ID' };
  }

  try {
    const assetsStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS);
    const assets = assetsStr ? JSON.parse(assetsStr) : [];

    const newAssets = [];
    for (let i = 0; i < count; i++) {
      // Random rarity assignment (weighted towards common)
      const rarityRoll = Math.random();
      let rarity;
      if (rarityRoll < 0.5) rarity = 'common'; // 50% chance common
      else if (rarityRoll < 0.8) rarity = 'uncommon'; // 30% chance uncommon
      else if (rarityRoll < 0.95) rarity = 'rare'; // 15% chance rare
      else if (rarityRoll < 0.99) rarity = 'epic'; // 4% chance epic
      else rarity = 'legendary'; // 1% chance legendary

      const asset = new PotAsset({
        name: `Terracare Pot Asset #${assets.length + i + 1}`,
        rarity,
        tier: Object.keys(BLOOM_CONFIG.POT_ASSET_CAPACITIES).indexOf(rarity) + 1,
        capacity: BLOOM_CONFIG.POT_ASSET_CAPACITIES[rarity],
        sectorId: sector.id,
        type: Math.random() > 0.5 ? BLOOM_CONFIG.ASSET_TYPES.FRUIT : BLOOM_CONFIG.ASSET_TYPES.CRITTER,
        species: `${rarity}_${BLOOM_CONFIG.ASSET_TYPES.FRUIT}`,
      });

      newAssets.push(asset.toLedgerPayload());
    }

    const updatedAssets = [...assets, ...newAssets];
    await AsyncStorage.setItem(
      BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS,
      JSON.stringify(updatedAssets)
    );

    // Record bloom history
    await recordBloomEvent('ASSET_SPAWN', {
      userId,
      windowName: bloomWindow.windowName,
      sectorId: sector.id,
      count: newAssets.length,
      assets: newAssets,
    });

    return {
      success: true,
      spawned: newAssets.length,
      assets: newAssets,
      sector: sector,
      bloomWindow: bloomWindow,
    };
  } catch (error) {
    console.error('[POLLEN BLOOM] Spawn assets failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Harvest from a specific pot asset
 */
export async function harvestPotAsset(assetId, userId) {
  try {
    const assetsStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS);
    const assets = assetsStr ? JSON.parse(assetsStr) : [];
    
    const assetIndex = assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) {
      return { success: false, error: 'Asset not found' };
    }

    const asset = new PotAsset(assets[assetIndex]);
    const bloomWindow = await getCurrentBloomWindow();
    
    const harvestResult = asset.harvest(bloomWindow);
    
    if (harvestResult.success) {
      // Update asset in storage
      assets[assetIndex] = asset.toLedgerPayload();
      await AsyncStorage.setItem(
        BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS,
        JSON.stringify(assets)
      );

      // Record harvest
      await recordBloomEvent('HARVEST', {
        userId,
        assetId,
        amount: harvestResult.harvestAmount,
        windowName: bloomWindow.windowName,
      });

      return {
        success: true,
        amount: harvestResult.harvestAmount,
        asset: asset.toLedgerPayload(),
      };
    }

    return harvestResult;
  } catch (error) {
    console.error('[POLLEN BLOOM] Harvest failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active blooms for user
 */
export async function getActiveBlooms(userId) {
  try {
    const assetsStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS);
    const assets = assetsStr ? JSON.parse(assetsStr) : [];
    
    const activeAssets = assets
      .map(a => new PotAsset(a))
      .filter(a => a.isActive && !a.isFullyDecayed());

    return {
      success: true,
      activeAssets: activeAssets.map(a => a.toLedgerPayload()),
      totalCapacity: activeAssets.reduce((sum, a) => sum + a.capacity, 0),
    };
  } catch (error) {
    console.error('[POLLEN BLOOM] Get active blooms failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get bloom statistics
 */
export async function getBloomStats(userId) {
  try {
    const assetsStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS);
    const assets = assetsStr ? JSON.parse(assetsStr) : [];
    const potAssets = assets.map(a => new PotAsset(a));

    const activeAssets = potAssets.filter(a => a.isActive && !a.isFullyDecayed());
    const decayedAssets = potAssets.filter(a => a.isFullyDecayed());
    const totalHarvested = potAssets.reduce((sum, a) => sum + a.totalHarvested, 0);

    const tierDistribution = {};
    BLOOM_CONFIG.POT_ASSET_CAPACITIES.forEach((_, i) => {
      tierDistribution[i + 1] = potAssets.filter(a => a.tier === i + 1).length;
    });

    return {
      success: true,
      totalAssets: potAssets.length,
      activeAssets: activeAssets.length,
      decayedAssets: decayedAssets.length,
      totalHarvested,
      tierDistribution,
      averageDecay: activeAssets.length > 0
        ? activeAssets.reduce((sum, a) => sum + a.getDecayPercentage(), 0) / activeAssets.length
        : 0,
    };
  } catch (error) {
    console.error('[POLLEN BLOOM] Get stats failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Record bloom event to history
 */
async function recordBloomEvent(eventType, data) {
  try {
    const historyStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.BLOOM_HISTORY);
    const history = historyStr ? JSON.parse(historyStr) : [];
    
    history.push({
      eventType,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 events
    const trimmedHistory = history.slice(-100);
    
    await AsyncStorage.setItem(
      BLOOM_CONFIG.STORAGE_KEYS.BLOOM_HISTORY,
      JSON.stringify(trimmedHistory)
    );
  } catch (error) {
    console.error('[POLLEN BLOOM] Record event failed:', error.message);
  }
}

/**
 * Initialize bloom protocol for user
 */
export async function initializeBloomProtocol(userId) {
  try {
    // Check if user already has assets
    const existingAssets = await getActiveBlooms(userId);
    
    if (existingAssets.success && existingAssets.activeAssets.length === 0) {
      // Give new user a starter pot asset
      const starterAsset = new PotAsset({
        name: 'Starter Pot Asset',
        tier: 1,
        capacity: BLOOM_CONFIG.POT_ASSET_CAPACITIES[0],
      });

      const assetsStr = await AsyncStorage.getItem(BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS);
      const assets = assetsStr ? JSON.parse(assetsStr) : [];
      assets.push(starterAsset.toLedgerPayload());
      
      await AsyncStorage.setItem(
        BLOOM_CONFIG.STORAGE_KEYS.POT_ASSETS,
        JSON.stringify(assets)
      );

      return {
        success: true,
        message: 'Bloom protocol initialized with starter asset',
        asset: starterAsset.toLedgerPayload(),
      };
    }

    return {
      success: true,
      message: 'Bloom protocol already initialized',
      activeAssets: existingAssets.activeAssets.length,
    };
  } catch (error) {
    console.error('[POLLEN BLOOM] Initialize failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get decay information for display
 */
export function getDecayInfo(decayStartTime) {
  if (!decayStartTime) {
    return {
      percentage: 100,
      hoursElapsed: 0,
      halfLivesElapsed: 0,
      status: 'Fresh',
    };
  }

  const start = new Date(decayStartTime);
  const now = new Date();
  const hoursElapsed = (now - start) / (1000 * 60 * 60);
  const halfLivesElapsed = hoursElapsed / BLOOM_CONFIG.DECAY_HALF_LIFE_HOURS;
  const percentage = Math.pow(0.5, halfLivesElapsed) * 100;

  let status = 'Fresh';
  if (percentage < 1) status = 'Fully Decayed';
  else if (percentage < 25) status = 'Heavily Decayed';
  else if (percentage < 50) status = 'Decaying';
  else if (percentage < 75) status = 'Mature';

  return {
    percentage: Math.round(percentage * 100) / 100,
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
    halfLivesElapsed: Math.round(halfLivesElapsed * 100) / 100,
    status,
  };
}

/**
 * Get Australian sectors for sector-based bloom spawning
 */
export function getAustralianSectors() {
  return AUSTRALIAN_SECTORS;
}

/**
 * Get sector by ID
 */
export function getSectorById(sectorId) {
  return AUSTRALIAN_SECTORS[sectorId] || null;
}

export const BloomDecayProtocol = {
  // Core bloom functions
  getCurrentBloomWindow,
  isBloomActive,
  checkBloomActive,
  
  // Asset management
  spawnBloomAssets,
  harvestPotAsset,
  getActiveBlooms,
  getBloomStats,
  
  // Initialization
  initializeBloomProtocol,
  
  // Utilities
  getDecayInfo,
  
  // Sector registry (Australian market alignment)
  getAustralianSectors,
  getSectorById,
  AUSTRALIAN_SECTORS,
  
  // Direct access to PotAsset class
  PotAsset,
  
  // Configuration export
  BLOOM_CONFIG,
};

export default BloomDecayProtocol;
