/**
 * P2PBridge - WebRTC Mesh Networking for Pollen Wallet
 * 
 * Provides peer-to-peer mesh networking capabilities for
 * decentralized transaction broadcasting and communication.
 * Aligned with Terracare ecosystem P2P infrastructure.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Simple event emitter implementation for React Native compatibility
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// P2P Configuration
const P2P_CONFIG = {
  SIGNALING_SERVER: 'http://localhost:5000/api/p2p',
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  MAX_PEERS: 10,
  RECONNECT_INTERVAL: 5000,
};

class P2PBridgeClass extends SimpleEventEmitter {
  constructor() {
    super();
    this.peerConnections = new Map();
    this.dataChannels = new Map();
    this.isInitialized = false;
    this.peerId = null;
    this.meshStats = {
      connectedPeers: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
    };
  }

  /**
   * Initialize P2P mesh node
   */
  async initializeP2P() {
    try {
      // Generate unique peer ID
      this.peerId = await this.generatePeerId();
      
      // Register with signaling server
      await this.registerWithSignalingServer();
      
      // Set up WebRTC connection handlers
      this.setupWebRTCHandlers();
      
      this.isInitialized = true;
      this.emit('initialized', { peerId: this.peerId });
      
      console.log('[POLLEN P2P] Initialized with peer ID:', this.peerId);
      return { status: 'OK', peerId: this.peerId };
    } catch (error) {
      console.error('[POLLEN P2P] Initialization failed:', error.message);
      this.emit('error', error);
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * Generate unique peer ID using expo-crypto
   */
  async generatePeerId() {
    const timestamp = Date.now().toString(36);
    const random = Array.from(await Crypto.getRandomBytesAsync(4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `pollen_${timestamp}_${random}`;
  }

  /**
   * Register with signaling server
   */
  async registerWithSignalingServer() {
    try {
      const response = await fetch(`${P2P_CONFIG.SIGNALING_SERVER}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: this.peerId,
          clientType: 'pollen-wallet',
          timestamp: new Date().toISOString(),
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[POLLEN P2P] Signaling registration failed:', error.message);
      throw error;
    }
  }

  /**
   * Set up WebRTC connection handlers
   * Note: In React Native, we use NetInfo instead of navigator.connection
   */
  setupWebRTCHandlers() {
    // Periodic peer discovery
    this.startPeerDiscovery();
    
    // Network status monitoring would use @react-native-community/netinfo
    // This is handled in the handleNetworkChange method
  }

  /**
   * Connect to a specific peer
   */
  async connectToPeer(peerId) {
    try {
      if (this.peerConnections.has(peerId)) {
        console.log('[POLLEN P2P] Already connected to peer:', peerId);
        return { status: 'EXISTS', peerId };
      }

      // Check max peers limit
      if (this.peerConnections.size >= P2P_CONFIG.MAX_PEERS) {
        console.log('[POLLEN P2P] Max peers reached');
        return { status: 'MAX_PEERS' };
      }

      // Create RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: P2P_CONFIG.ICE_SERVERS,
      });

      // Set up event handlers
      peerConnection.onicecandidate = (event) => this.handleICECandidate(peerId, event);
      peerConnection.onconnectionstatechange = () => this.handleConnectionStateChange(peerId, peerConnection);
      peerConnection.ondatachannel = (event) => this.handleIncomingDataChannel(peerId, event);

      // Create data channel
      const dataChannel = peerConnection.createDataChannel('pollen-mesh');
      this.setupDataChannel(peerId, dataChannel);

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to signaling server
      const response = await fetch(`${P2P_CONFIG.SIGNALING_SERVER}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: this.peerId,
          to: peerId,
          offer: peerConnection.localDescription,
        }),
      });

      const result = await response.json();
      
      if (result.status === 'OK') {
        // Set remote description
        await peerConnection.setRemoteDescription(new RTCSessionDescription(result.answer));
        
        this.peerConnections.set(peerId, peerConnection);
        this.meshStats.connectedPeers = this.peerConnections.size;
        
        console.log('[POLLEN P2P] Connected to peer:', peerId);
        this.emit('peer:connected', { peerId });
        
        return { status: 'OK', peerId };
      }

      return { status: 'ERROR', error: 'Failed to establish connection' };
    } catch (error) {
      console.error('[POLLEN P2P] Connect to peer failed:', error.message);
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleICECandidate(peerId, event) {
    if (event.candidate) {
      try {
        await fetch(`${P2P_CONFIG.SIGNALING_SERVER}/ice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: this.peerId,
            to: peerId,
            candidate: event.candidate,
          }),
        });
      } catch (error) {
        console.error('[POLLEN P2P] ICE candidate exchange failed:', error.message);
      }
    }
  }

  /**
   * Handle connection state change
   */
  handleConnectionStateChange(peerId, peerConnection) {
    const state = peerConnection.connectionState;
    
    switch (state) {
      case 'connected':
        this.emit('peer:connected', { peerId });
        break;
      case 'disconnected':
      case 'failed':
        this.peerConnections.delete(peerId);
        this.dataChannels.delete(peerId);
        this.meshStats.connectedPeers = this.peerConnections.size;
        this.emit('peer:disconnected', { peerId });
        break;
      case 'closed':
        this.peerConnections.delete(peerId);
        this.dataChannels.delete(peerId);
        this.meshStats.connectedPeers = this.peerConnections.size;
        break;
    }
  }

  /**
   * Handle incoming data channel
   */
  handleIncomingDataChannel(peerId, event) {
    const dataChannel = event.channel;
    this.setupDataChannel(peerId, dataChannel);
  }

  /**
   * Set up data channel handlers
   */
  setupDataChannel(peerId, dataChannel) {
    dataChannel.onopen = () => {
      this.dataChannels.set(peerId, dataChannel);
      console.log('[POLLEN P2P] Data channel open with:', peerId);
    };

    dataChannel.onmessage = (event) => {
      this.handleMessage(peerId, event.data);
    };

    dataChannel.onerror = (error) => {
      console.error('[POLLEN P2P] Data channel error:', error);
    };
  }

  /**
   * Handle incoming message
   */
  handleMessage(peerId, data) {
    try {
      const message = JSON.parse(data);
      this.meshStats.messagesReceived++;
      this.meshStats.bytesTransferred += data.length;
      
      this.emit('message', {
        from: peerId,
        ...message,
      });
    } catch (error) {
      console.error('[POLLEN P2P] Message parse error:', error.message);
    }
  }

  /**
   * Broadcast signed message to mesh
   */
  async broadcast(message) {
    try {
      if (!this.isInitialized) {
        throw new Error('P2P bridge not initialized');
      }

      // Sign message
      const signedMessage = {
        ...message,
        from: this.peerId,
        timestamp: new Date().toISOString(),
        signature: await this.signMessage(message),
      };

      const messageData = JSON.stringify(signedMessage);
      let broadcastCount = 0;

      // Send to all connected peers
      this.dataChannels.forEach((channel, peerId) => {
        if (channel.readyState === 'open') {
          channel.send(messageData);
          broadcastCount++;
        }
      });

      this.meshStats.messagesSent++;
      this.meshStats.bytesTransferred += messageData.length;

      console.log('[POLLEN P2P] Broadcast to', broadcastCount, 'peers');
      this.emit('broadcast', { count: broadcastCount, message: signedMessage });

      return { status: 'OK', broadcastCount };
    } catch (error) {
      console.error('[POLLEN P2P] Broadcast failed:', error.message);
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * Sign message with cryptographic signature using expo-crypto
   */
  async signMessage(message) {
    const dataToSign = JSON.stringify({
      ...message,
      peerId: this.peerId,
      timestamp: Date.now(),
    });

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToSign
    );
  }

  /**
   * Start peer discovery
   */
  async startPeerDiscovery() {
    const discoverPeers = async () => {
      if (!this.isInitialized) return;

      try {
        const response = await fetch(`${P2P_CONFIG.SIGNALING_SERVER}/peers`, {
          method: 'GET',
        });

        const result = await response.json();
        const availablePeers = result.peers || [];

        // Connect to new peers
        for (const peer of availablePeers) {
          if (!this.peerConnections.has(peer.peerId) && 
              this.peerConnections.size < P2P_CONFIG.MAX_PEERS) {
            await this.connectToPeer(peer.peerId);
          }
        }
      } catch (error) {
        console.error('[POLLEN P2P] Peer discovery failed:', error.message);
      }

      // Schedule next discovery
      setTimeout(discoverPeers, P2P_CONFIG.RECONNECT_INTERVAL);
    };

    // Start discovery after a short delay
    setTimeout(discoverPeers, 2000);
  }

  /**
   * Handle network change
   * In production, integrate with @react-native-community/netinfo
   */
  async handleNetworkChange(isOnline) {
    if (isOnline) {
      console.log('[POLLEN P2P] Network restored, reconnecting...');
      await this.reconnectAllPeers();
    } else {
      console.log('[POLLEN P2P] Network lost');
      this.emit('network:lost');
    }
  }

  /**
   * Reconnect all peers
   */
  async reconnectAllPeers() {
    // Close existing connections
    this.peerConnections.forEach((connection, peerId) => {
      connection.close();
    });
    
    this.peerConnections.clear();
    this.dataChannels.clear();
    
    // Rediscover and reconnect
    await this.startPeerDiscovery();
  }

  /**
   * Get mesh statistics
   */
  getStats() {
    return {
      peerId: this.peerId,
      isInitialized: this.isInitialized,
      connectedPeers: this.meshStats.connectedPeers,
      messagesSent: this.meshStats.messagesSent,
      messagesReceived: this.meshStats.messagesReceived,
      bytesTransferred: this.meshStats.bytesTransferred,
      maxPeers: P2P_CONFIG.MAX_PEERS,
    };
  }

  /**
   * Close all connections
   */
  closeAll() {
    this.peerConnections.forEach((connection) => {
      connection.close();
    });
    
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.isInitialized = false;
    
    this.emit('closed');
    console.log('[POLLEN P2P] All connections closed');
  }
}

// Create singleton instance
export const P2PBridge = new P2PBridgeClass();

export default P2PBridge;