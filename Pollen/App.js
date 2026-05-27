import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { AppRegistry } from 'react-native';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Circle, Rect, Path, Line, Polygon, Polyline } from 'react-native-svg';

// Import Terracare services for ecosystem integration
import { SovereignIdentity } from './src/services/SovereignIdentity';
import { LedgerBridge } from './src/services/LedgerBridge';
import { BloomDecayProtocol } from './src/domain/BloomDecayProtocol';
import { P2PBridge } from './src/services/P2PBridge';
import { PaymentGateway } from './src/services/PaymentGateway';

// Wallet State Management
const WALLET_STORAGE_KEYS = {
  MNEMONIC: 'pollen_wallet_mnemonic',
  ADDRESS: 'pollen_wallet_address',
  PRIVATE_KEY: 'pollen_wallet_private_key',
  BALANCE: 'pollen_wallet_balance',
  TRANSACTIONS: 'pollen_transactions',
};

// Mock wallet data for demonstration
const generateWalletMnemonic = async () => {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const mnemonic = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
    .slice(0, 47); // 12 words
  return mnemonic;
};

const generateWalletAddress = async (mnemonic) => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    mnemonic
  );
  return `0x${hash.slice(0, 40)}`;
};

// Icons - Using react-native-svg for cross-platform compatibility
const PollenIcon = ({ color = '#D4AF37', size = 24 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="3" fill={color} opacity="0.3"/>
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" fill="none"/>
      <Line x1="12" y1="2" x2="12" y2="4" stroke={color} strokeWidth="2"/>
      <Line x1="12" y1="20" x2="12" y2="22" stroke={color} strokeWidth="2"/>
      <Line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke={color} strokeWidth="2"/>
      <Line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke={color} strokeWidth="2"/>
      <Line x1="2" y1="12" x2="4" y2="12" stroke={color} strokeWidth="2"/>
      <Line x1="20" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2"/>
      <Line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke={color} strokeWidth="2"/>
      <Line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke={color} strokeWidth="2"/>
    </Svg>
  </View>
);

const WalletIcon = ({ color = '#D4AF37', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" fill="none"/>
      <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2"/>
      <Circle cx="17" cy="14" r="2" fill={color}/>
    </Svg>
  </View>
);

const BloomIcon = ({ color = '#39FF14', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
      <Line x1="12" y1="6" x2="12" y2="18" stroke={color} strokeWidth="2" opacity="0.5"/>
      <Line x1="6" y1="12" x2="18" y2="12" stroke={color} strokeWidth="2" opacity="0.5"/>
      <Circle cx="12" cy="12" r="3" fill={color} opacity="0.3"/>
    </Svg>
  </View>
);

const SendIcon = ({ color = '#D4AF37', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="2"/>
      <Polygon points="22,2 15,22 11,13 2,9 22,2" stroke={color} strokeWidth="2" fill="none"/>
    </Svg>
  </View>
);

const ReceiveIcon = ({ color = '#39FF14', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="22,12 16,12 16,17" stroke={color} strokeWidth="2" fill="none"/>
      <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke={color} strokeWidth="2" fill="none"/>
    </Svg>
  </View>
);

const HistoryIcon = ({ color = '#D4AF37', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
      <Polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="2" fill="none"/>
    </Svg>
  </View>
);

const SettingsIcon = ({ color = '#7E8FA7', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/>
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="2" fill="none"/>
    </Svg>
  </View>
);

const HiveIcon = ({ color = '#D4AF37', size = 20 }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l4 2.3v4.6l-4 2.3-4-2.3V4.3L12 2z" fill={color} opacity="0.2" stroke={color} strokeWidth="1"/>
      <Path d="M6 11.5l4 2.3v4.6l-4 2.3-4-2.3v-4.6l4-2.3z" fill={color} opacity="0.2" stroke={color} strokeWidth="1"/>
      <Path d="M18 11.5l4 2.3v4.6l-4 2.3-4-2.3v-4.6l4-2.3z" fill={color} opacity="0.2" stroke={color} strokeWidth="1"/>
    </Svg>
  </View>
);

export default function App() {
  const [currentTab, setCurrentTab] = useState('WALLET');
  const [walletCreated, setWalletCreated] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState([]);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [bloomStatus, setBloomStatus] = useState(null);
  const [p2pStatus, setP2pStatus] = useState('disconnected');
  const [notification, setNotification] = useState(null);

  // Initialize wallet on load
  useEffect(() => {
    loadWallet();
    initializeBloomProtocol();
    initializeP2P();
  }, []);

  const loadWallet = async () => {
    try {
      const mnemonic = await AsyncStorage.getItem(WALLET_STORAGE_KEYS.MNEMONIC);
      const address = await AsyncStorage.getItem(WALLET_STORAGE_KEYS.ADDRESS);
      const balanceStr = await AsyncStorage.getItem(WALLET_STORAGE_KEYS.BALANCE);
      const transactionsStr = await AsyncStorage.getItem(WALLET_STORAGE_KEYS.TRANSACTIONS);

      if (mnemonic && address) {
        setWalletData({ mnemonic, address });
        setWalletCreated(true);
        setBalance(balanceStr || '0.00');
        setTransactions(transactionsStr ? JSON.parse(transactionsStr) : []);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const createWallet = async () => {
    try {
      const mnemonic = await generateWalletMnemonic();
      const address = await generateWalletAddress(mnemonic);
      
      const newWalletData = { mnemonic, address };
      
      await AsyncStorage.setItem(WALLET_STORAGE_KEYS.MNEMONIC, mnemonic);
      await AsyncStorage.setItem(WALLET_STORAGE_KEYS.ADDRESS, address);
      await AsyncStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, '0.00');
      await AsyncStorage.setItem(WALLET_STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      
      setWalletData(newWalletData);
      setWalletCreated(true);
      showNotification('🌸 Pollen Wallet Created Successfully!');
      
      // Register sovereign identity
      await registerSovereignIdentity(address);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      showNotification('❌ Failed to create wallet');
    }
  };

  const registerSovereignIdentity = async (walletAddress) => {
    try {
      const identity = await SovereignIdentity.initialize({
        handle: `pollen_${walletAddress.slice(0, 8)}`,
        displayName: 'Pollen User',
        bio: 'Terracare ecosystem participant',
      });
      
      if (identity) {
        // Link wallet to sovereign identity
        await SovereignIdentity.linkWallet(walletAddress, 'signature_placeholder');
        console.log('Sovereign identity linked to wallet');
      }
    } catch (error) {
      console.error('Failed to register sovereign identity:', error);
    }
  };

  const initializeBloomProtocol = async () => {
    try {
      const bloomInfo = await BloomDecayProtocol.getCurrentBloomWindow();
      setBloomStatus(bloomInfo);
    } catch (error) {
      console.error('Failed to initialize bloom protocol:', error);
    }
  };

  const initializeP2P = async () => {
    try {
      await P2PBridge.initializeP2P();
      setP2pStatus('connected');
      
      P2PBridge.on('message', (msg) => {
        console.log('P2P message received:', msg);
      });
    } catch (error) {
      console.error('Failed to initialize P2P:', error);
      setP2pStatus('error');
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSend = async (toAddress, amount) => {
    try {
      // Record transaction to ledger
      const txResult = await LedgerBridge.recordActivity('TOKEN_TRANSFER', {
        from: walletData.address,
        to: toAddress,
        amount,
        timestamp: new Date().toISOString(),
      });

      if (txResult.status === 'OK') {
        // Update local balance
        const newBalance = (parseFloat(balance) - parseFloat(amount)).toFixed(2);
        setBalance(newBalance);
        await AsyncStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, newBalance);

        // Add to transactions
        const newTx = {
          id: `tx_${Date.now()}`,
          type: 'send',
          to: toAddress,
          amount,
          timestamp: new Date().toISOString(),
          hash: txResult.eventId,
        };
        
        const updatedTransactions = [newTx, ...transactions];
        setTransactions(updatedTransactions);
        await AsyncStorage.setItem(WALLET_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

        // Broadcast to P2P mesh
        await P2PBridge.broadcast({
          type: 'transaction',
          hash: txResult.eventId,
          from: walletData.address,
          amount,
        });

        showNotification(`✅ Sent ${amount} POLLEN successfully!`);
        setShowSendModal(false);
      } else {
        showNotification('❌ Transaction failed');
      }
    } catch (error) {
      console.error('Send failed:', error);
      showNotification('❌ Send failed');
    }
  };

  const handleReceive = () => {
    setShowReceiveModal(true);
  };

  const renderWelcomeScreen = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeContent}>
        <View style={styles.logoContainer}>
          <PollenIcon size={80} color="#D4AF37" />
        </View>
        <Text style={styles.welcomeTitle}>Pollen Wallet</Text>
        <Text style={styles.welcomeSubtitle}>Sovereign Wallet for Terracare Ecosystem</Text>
        <Text style={styles.welcomeDescription}>
          Your gateway to the regenerative economy. 
          Store value, connect with nature, and participate in the bloom cycle.
        </Text>
        <TouchableOpacity style={styles.createWalletButton} onPress={createWallet}>
          <Text style={styles.createWalletButtonText}>Create Pollen Wallet</Text>
        </TouchableOpacity>
        <Text style={styles.welcomeFooter}>
          Powered by Terracare Ledger • Sovereign Identity • P2P Mesh
        </Text>
      </View>
    </View>
  );

  const renderWalletScreen = () => (
    <ScrollView style={styles.walletScreen}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{balance}</Text>
        <Text style={styles.balanceCurrency}>POLLEN</Text>
        <Text style={styles.balanceUSD}>≈ ${parseFloat((parseFloat(balance) * 0.65).toFixed(2))} AUD</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
          <SendIcon color="#D4AF37" size={24} />
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleReceive}>
          <ReceiveIcon color="#39FF14" size={24} />
          <Text style={styles.actionButtonText}>Receive</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setCurrentTab('BLOOM')}>
          <BloomIcon color="#39FF14" size={24} />
          <Text style={styles.actionButtonText}>Bloom</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setCurrentTab('HIVE')}>
          <HiveIcon color="#D4AF37" size={24} />
          <Text style={styles.actionButtonText}>Hive</Text>
        </TouchableOpacity>
      </View>

      {/* Bloom Status */}
      {bloomStatus && (
        <View style={styles.bloomStatusCard}>
          <View style={styles.bloomStatusHeader}>
            <BloomIcon size={18} />
            <Text style={styles.bloomStatusTitle}>Bloom Window Status</Text>
          </View>
          <View style={styles.bloomInfoRow}>
            <Text style={styles.bloomInfoLabel}>Current Window:</Text>
            <Text style={styles.bloomInfoValue}>{bloomStatus.windowName}</Text>
          </View>
          <View style={styles.bloomInfoRow}>
            <Text style={styles.bloomInfoLabel}>Active Until:</Text>
            <Text style={styles.bloomInfoValue}>{bloomStatus.endTime}</Text>
          </View>
          <View style={styles.bloomInfoRow}>
            <Text style={styles.bloomInfoLabel}>Pot Assets:</Text>
            <Text style={styles.bloomInfoValue}>{bloomStatus.activeAssets} active</Text>
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <HistoryIcon size={18} />
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        
        {transactions.length === 0 ? (
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.slice(0, 5).map((tx) => (
            <View key={tx.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                {tx.type === 'send' ? (
                  <SendIcon size={16} color="#FF6B6B" />
                ) : (
                  <ReceiveIcon size={16} color="#39FF14" />
                )}
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionType}>
                  {tx.type === 'send' ? 'Sent' : 'Received'}
                </Text>
                <Text style={styles.transactionAddress}>
                  {tx.type === 'send' ? tx.to : walletData?.address}
                </Text>
                <Text style={styles.transactionTime}>
                  {new Date(tx.timestamp).toLocaleString()}
                </Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: tx.type === 'send' ? '#FF6B6B' : '#39FF14' }
              ]}>
                {tx.type === 'send' ? '-' : '+'}{tx.amount} POLLEN
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderBloomScreen = () => (
    <ScrollView style={styles.bloomScreen}>
      <View style={styles.bloomHeader}>
        <BloomIcon size={32} />
        <Text style={styles.bloomTitle}>Bloom Cycle Protocol</Text>
      </View>

      <View style={styles.bloomInfoCard}>
        <Text style={styles.bloomInfoTitle}>Current Bloom Window</Text>
        {bloomStatus ? (
          <>
            <Text style={styles.bloomWindowName}>{bloomStatus.windowName}</Text>
            <Text style={styles.bloomWindowTime}>
              {bloomStatus.startTime} - {bloomStatus.endTime}
            </Text>
            <View style={styles.bloomProgressBar}>
              <View style={[
                styles.bloomProgressFill,
                { width: `${bloomStatus.progress}%` }
              ]} />
            </View>
            <Text style={styles.bloomProgressText}>
              {bloomStatus.progress}% complete
            </Text>
          </>
        ) : (
          <Text style={styles.bloomLoadingText}>Loading bloom status...</Text>
        )}
      </View>

      <View style={styles.potAssetsSection}>
        <Text style={styles.sectionTitle}>Your Pot Assets</Text>
        <View style={styles.potAssetCard}>
          <Text style={styles.potAssetName}>Terracare Pot Asset #001</Text>
          <Text style={styles.potAssetCapacity}>Capacity: 20 POLLEN/day</Text>
          <Text style={styles.potAssetDecay}>Decay: 72h half-life</Text>
          <TouchableOpacity style={styles.harvestButton}>
            <Text style={styles.harvestButtonText}>Harvest</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bloomEducationalCard}>
        <Text style={styles.educationalTitle}>🌸 Bloom Cycle Guide</Text>
        <Text style={styles.educationalText}>
          Bloom windows open 6 times daily (4-hour intervals). During bloom,
          your Pot Assets generate POLLEN tokens. Harvest during active bloom
          windows for maximum yield!
        </Text>
      </View>
    </ScrollView>
  );

  const renderHiveScreen = () => (
    <ScrollView style={styles.hiveScreen}>
      <View style={styles.hiveHeader}>
        <HiveIcon size={32} />
        <Text style={styles.hiveTitle}>Hive Network</Text>
      </View>

      <View style={styles.p2pStatusCard}>
        <Text style={styles.p2pStatusTitle}>P2P Mesh Status</Text>
        <View style={styles.p2pStatusIndicator}>
          <View style={[
            styles.p2pStatusDot,
            { backgroundColor: p2pStatus === 'connected' ? '#39FF14' : '#FF6B6B' }
          ]} />
          <Text style={styles.p2pStatusText}>
            {p2pStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.hiveStatsCard}>
        <Text style={styles.hiveStatsTitle}>Network Statistics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Connected Peers:</Text>
          <Text style={styles.statValue}>12</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Messages Relayed:</Text>
          <Text style={styles.statValue}>847</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Network Uptime:</Text>
          <Text style={styles.statValue}>99.7%</Text>
        </View>
      </View>

      <View style={styles.sovereignIdentityCard}>
        <Text style={styles.sovereignIdentityTitle}>Sovereign Identity</Text>
        <Text style={styles.sovereignIdentityText}>
          Your wallet is linked to your sovereign identity, ensuring
          cryptographic proof of all your ecosystem activities.
        </Text>
        <TouchableOpacity style={styles.viewIdentityButton}>
          <Text style={styles.viewIdentityButtonText}>View Identity Proof</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSettingsScreen = () => (
    <ScrollView style={styles.settingsScreen}>
      <View style={styles.settingsHeader}>
        <SettingsIcon size={32} />
        <Text style={styles.settingsTitle}>Settings</Text>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Wallet</Text>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Backup Seed Phrase</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Change PIN</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Connected Wallets</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Security</Text>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Biometric Authentication</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Auto-lock Timer</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Network</Text>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>P2P Mesh Settings</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Ledger Connection</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>About</Text>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Pollen Wallet Version</Text>
          <Text style={styles.settingsItemValue}>1.0.0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Terracare Ledger</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Open Source Licenses</Text>
          <Text style={styles.settingsItemArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderReceiveModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Receive POLLEN</Text>
        <Text style={styles.modalSubtitle}>Share your wallet address to receive tokens</Text>
        
        <View style={styles.addressContainer}>
          <Text style={styles.walletAddress}>{walletData?.address}</Text>
        </View>

        <TouchableOpacity 
          style={styles.copyAddressButton}
          onPress={() => {
            // Copy to clipboard functionality would go here
            showNotification('📋 Address copied to clipboard!');
          }}
        >
          <Text style={styles.copyAddressButtonText}>Copy Address</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.closeModalButton}
          onPress={() => setShowReceiveModal(false)}
        >
          <Text style={styles.closeModalButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSendModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Send POLLEN</Text>
        
        <Text style={styles.inputLabel}>Recipient Address</Text>
        <TextInput 
          style={styles.inputField}
          placeholder="0x..."
          placeholderTextColor="#7E8FA7"
          onChangeText={(text) => {/* Handle address input */}}
        />

        <Text style={styles.inputLabel}>Amount (POLLEN)</Text>
        <TextInput 
          style={styles.inputField}
          placeholder="0.00"
          placeholderTextColor="#7E8FA7"
          keyboardType="numeric"
          onChangeText={(text) => {/* Handle amount input */}}
        />

        <View style={styles.modalButtonRow}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setShowSendModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, styles.sendButton]}
            onPress={() => handleSend('0x123...', '10.00')}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderNotification = () => (
    notification && (
      <View style={styles.notificationOverlay}>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>{notification}</Text>
        </View>
      </View>
    )
  );

  return (
    <View style={styles.container}>
      {renderNotification()}
      
      {!walletCreated ? (
        renderWelcomeScreen()
      ) : (
        <>
          {currentTab === 'WALLET' && renderWalletScreen()}
          {currentTab === 'BLOOM' && renderBloomScreen()}
          {currentTab === 'HIVE' && renderHiveScreen()}
          {currentTab === 'SETTINGS' && renderSettingsScreen()}
          
          {showReceiveModal && renderReceiveModal()}
          {showSendModal && renderSendModal()}
          
          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => setCurrentTab('WALLET')}
            >
              <WalletIcon color={currentTab === 'WALLET' ? '#D4AF37' : '#7E8FA7'} />
              <Text style={[
                styles.navButtonText,
                { color: currentTab === 'WALLET' ? '#D4AF37' : '#7E8FA7' }
              ]}>Wallet</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => setCurrentTab('BLOOM')}
            >
              <BloomIcon color={currentTab === 'BLOOM' ? '#39FF14' : '#7E8FA7'} />
              <Text style={[
                styles.navButtonText,
                { color: currentTab === 'BLOOM' ? '#39FF14' : '#7E8FA7' }
              ]}>Bloom</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => setCurrentTab('HIVE')}
            >
              <HiveIcon color={currentTab === 'HIVE' ? '#D4AF37' : '#7E8FA7'} />
              <Text style={[
                styles.navButtonText,
                { color: currentTab === 'HIVE' ? '#D4AF37' : '#7E8FA7' }
              ]}>Hive</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => setCurrentTab('SETTINGS')}
            >
              <SettingsIcon color={currentTab === 'SETTINGS' ? '#D4AF37' : '#7E8FA7'} />
              <Text style={[
                styles.navButtonText,
                { color: currentTab === 'SETTINGS' ? '#D4AF37' : '#7E8FA7' }
              ]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B1A',
  },
  
  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  logoContainer: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#D4AF37',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#39FF14',
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  createWalletButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  createWalletButtonText: {
    color: '#060B1A',
    fontSize: 16,
    fontWeight: '900',
  },
  welcomeFooter: {
    fontSize: 11,
    color: '#7E8FA7',
    marginTop: 24,
    textAlign: 'center',
  },

  // Wallet Screen
  walletScreen: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  balanceCard: {
    backgroundColor: '#0A1128',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#7E8FA7',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#D4AF37',
  },
  balanceCurrency: {
    fontSize: 18,
    color: '#39FF14',
    fontWeight: '700',
    marginTop: 4,
  },
  balanceUSD: {
    fontSize: 14,
    color: '#7E8FA7',
    marginTop: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  actionButtonText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  bloomStatusCard: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  bloomStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bloomStatusTitle: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  bloomInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bloomInfoLabel: {
    color: '#7E8FA7',
    fontSize: 12,
  },
  bloomInfoValue: {
    color: '#39FF14',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyTransactions: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    color: '#7E8FA7',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionAddress: {
    color: '#7E8FA7',
    fontSize: 12,
    marginTop: 2,
  },
  transactionTime: {
    color: '#7E8FA7',
    fontSize: 10,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Bloom Screen
  bloomScreen: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  bloomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  bloomTitle: {
    color: '#D4AF37',
    fontSize: 28,
    fontWeight: '900',
    marginLeft: 12,
  },
  bloomInfoCard: {
    backgroundColor: '#0A1128',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  bloomInfoTitle: {
    color: '#7E8FA7',
    fontSize: 14,
    marginBottom: 12,
  },
  bloomWindowName: {
    color: '#39FF14',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  bloomWindowTime: {
    color: '#D4AF37',
    fontSize: 14,
    marginBottom: 16,
  },
  bloomProgressBar: {
    height: 8,
    backgroundColor: 'rgba(57, 255, 20, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bloomProgressFill: {
    height: '100%',
    backgroundColor: '#39FF14',
    borderRadius: 4,
  },
  bloomProgressText: {
    color: '#39FF14',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  bloomLoadingText: {
    color: '#7E8FA7',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  potAssetsSection: {
    marginBottom: 20,
  },
  potAssetCard: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  potAssetName: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  potAssetCapacity: {
    color: '#39FF14',
    fontSize: 14,
    marginBottom: 4,
  },
  potAssetDecay: {
    color: '#7E8FA7',
    fontSize: 12,
    marginBottom: 12,
  },
  harvestButton: {
    backgroundColor: '#39FF14',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  harvestButtonText: {
    color: '#060B1A',
    fontSize: 14,
    fontWeight: '900',
  },
  bloomEducationalCard: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  educationalTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  educationalText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 20,
  },

  // Hive Screen
  hiveScreen: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  hiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  p2pStatusCard: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  p2pStatusTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
  },
  p2pStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  p2pStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  p2pStatusText: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: '600',
  },
  hiveStatsCard: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  hiveStatsTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    color: '#7E8FA7',
    fontSize: 14,
  },
  statValue: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
  sovereignIdentityCard: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  sovereignIdentityTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sovereignIdentityText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  viewIdentityButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewIdentityButtonText: {
    color: '#060B1A',
    fontSize: 14,
    fontWeight: '900',
  },

  // Settings Screen
  settingsScreen: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsTitle: {
    color: '#D4AF37',
    fontSize: 28,
    fontWeight: '900',
    marginLeft: 12,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    color: '#7E8FA7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  settingsItem: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingsItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  settingsItemValue: {
    color: '#7E8FA7',
    fontSize: 14,
  },
  settingsItemArrow: {
    color: '#7E8FA7',
    fontSize: 20,
    fontWeight: '300',
  },

  // Modals
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 11, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#0A1128',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  modalTitle: {
    color: '#D4AF37',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#7E8FA7',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  addressContainer: {
    backgroundColor: '#060B1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  walletAddress: {
    color: '#39FF14',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  copyAddressButton: {
    backgroundColor: '#39FF14',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  copyAddressButtonText: {
    color: '#060B1A',
    fontSize: 16,
    fontWeight: '900',
  },
  closeModalButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7E8FA7',
  },
  closeModalButtonText: {
    color: '#7E8FA7',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#060B1A',
    borderRadius: 8,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7E8FA7',
  },
  cancelButtonText: {
    color: '#7E8FA7',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#D4AF37',
  },
  sendButtonText: {
    color: '#060B1A',
    fontSize: 16,
    fontWeight: '900',
  },

  // Notification
  notificationOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 2000,
  },
  notificationContent: {
    backgroundColor: '#0A1128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  notificationText: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#0A1128',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  // Icon Container
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Platform-specific exports for web and native compatibility
if (Platform.OS === 'web') {
  // For web: AppRegistry not needed
} else {
  // For native: register with AppRegistry
  AppRegistry.registerComponent('main', () => App);
}
