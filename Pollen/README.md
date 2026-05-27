# 🌸 Pollen Wallet

**Sovereign Wallet for the Terracare Ecosystem - Australian Market**

Pollen is a native cryptocurrency wallet designed specifically for the Terracare regenerative ecosystem, built for the Australian market. Named after the natural carrier of genetic information, Pollen carries value and identity across the Terracare network, enabling users to participate in the bloom cycle, manage Pot_Assets, and engage with the decentralized mesh network.

## 🇦🇺 Australian Market Features

- **AUD Currency**: All transactions and balances displayed in Australian Dollars
- **Google Pay & Apple Pay**: Seamless mobile payments
- **PayID/Osko**: Real-time Australian bank transfers
- **BPAY**: Bill payment integration
- **POLi**: Direct bank transfer via POLi
- **Crypto Payments**: ETH, BTC, and other cryptocurrencies
- **Bank Transfer**: Direct BSB/Account transfers
# 🌸 Pollen Wallet

**Sovereign Wallet for the Terracare Ecosystem - Australian Market**

Pollen is a native cryptocurrency wallet designed specifically for the Terracare regenerative ecosystem, built for the Australian market. Named after the natural carrier of genetic information, Pollen carries value and identity across the Terracare network, enabling users to participate in the bloom cycle, manage Pot_Assets, and engage with the decentralized mesh network.

## 🇦🇺 Australian Market Features

- **AUD Currency**: All transactions and balances displayed in Australian Dollars
- **Google Pay & Apple Pay**: Seamless mobile payments
- **PayID/Osko**: Real-time Australian bank transfers
- **BPAY**: Bill payment integration
- **POLi**: Direct bank transfer via POLi
- **Crypto Payments**: ETH, BTC, and other cryptocurrencies
- **Bank Transfer**: Direct BSB/Account transfers

## ✨ Features

### Core Wallet Features
- **Multi-chain Support**: Ethereum, Polygon, Solana compatibility
- **Secure Storage**: Encrypted mnemonic and private key storage
- **Transaction History**: Full ledger-integrated transaction tracking
- **Send/Receive**: Easy token transfers with QR code support

### Terracare Ecosystem Integration
- **Sovereign Identity**: Cryptographic identity linked to your wallet
- **Bloom Cycle Protocol**: Participate in 6 daily bloom windows
- **Pot_Assets**: Manage and harvest from bloom-capable assets
- **P2P Mesh Network**: Decentralized transaction broadcasting
- **Ledger Integration**: All activities recorded on Terracare Ledger

### Wellness Features
- **Activity Rewards**: Earn tokens from ecosystem participation
- **Social Impact Tracking**: Monitor your regenerative contributions
- **Marketplace Integration**: Seamless purchases with 6% platform fee

## 🏗️ Architecture

```
Pollen Wallet
├── App.js                          # Main application entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
└── src/
    ├── services/
    │   ├── SovereignIdentity.js    # Identity management & signing
    │   ├── LedgerBridge.js         # Terracare Ledger connectivity
    │   ├── P2PBridge.js            # WebRTC mesh networking
    │   └── index.js                # Services export
    └── domain/
        ├── BloomDecayProtocol.js   # Bloom windows & Pot_Assets
        └── index.js                # Domain export
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS/Android device or simulator

### Installation

1. **Clone the repository**
   ```bash
   cd Pollen
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

4. **Run on your device**
   - Scan the QR code with Expo Go app
   - Or press `a` for Android emulator, `i` for iOS simulator

## 📱 Usage

### Creating a Wallet
1. Launch the app
2. Tap "Create Pollen Wallet"
3. **IMPORTANT**: Write down your seed phrase and store it securely
4. Your wallet is created and linked to a Sovereign Identity

### Using Bloom Cycle
1. Navigate to the "Bloom" tab
2. Check current bloom window status
3. During active bloom (first hour of each 4-hour window), tap "Harvest"
4. Earn POLLEN tokens based on your Pot_Asset capacity

### Managing Pot_Assets
- Pot_Assets have 5 tiers with capacities: 20, 10, 5, 3, 1 POLLEN/day
- Assets decay with a 72-hour half-life
- Harvest during bloom windows for maximum yield
- New assets can spawn during active bloom windows

### P2P Mesh Network
- Automatically connects to nearby peers
- Transactions broadcast through mesh for resilience
- Works offline with store-and-forward capability

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
TERRACARE_LEDGER_URL=http://localhost:5000/api/ledger
P2P_SIGNALING_URL=http://localhost:5000/api/p2p
```

### Bloom Window Schedule
| Window | Time (Local) | Name |
|--------|--------------|------|
| 1 | 00:00 - 04:00 | Dawn Bloom |
| 2 | 04:00 - 08:00 | Morning Bloom |
| 3 | 08:00 - 12:00 | Noon Bloom |
| 4 | 12:00 - 16:00 | Afternoon Bloom |
| 5 | 16:00 - 20:00 | Evening Bloom |
| 6 | 20:00 - 24:00 | Night Bloom |

Each window has a 1-hour bloom period at the start when harvesting is active.

## 🔐 Security

### Private Key Management
- Keys stored in Expo SecureStore (encrypted)
- Mnemonic never leaves the device
- All transactions signed locally

### Sovereign Identity
- Ed25519-style keypair generation
- All activities cryptographically signed
- Identity registered on Terracare Ledger

### P2P Security
- Messages signed before broadcasting
- ICE candidate exchange via signaling server
- WebRTC encryption for data channels

## 📊 Token Economics

### POLLEN Token
- **Symbol**: POLLEN
- **Type**: ERC-20 (multi-chain)
- **Decimals**: 18
- **Initial Distribution**: Airdrop to early adopters

### Earning POLLEN
1. **Bloom Harvesting**: Harvest from Pot_Assets during bloom windows
2. **Activity Rewards**: Tag fauna, participate in AR activities
3. **Staking**: Stake tokens for additional rewards
4. **Governance**: Participate in ecosystem decisions

### Platform Fees
- Marketplace purchases: 6% platform fee
- Token swaps: 0.3% swap fee
- Fees support ecosystem development

## 🛠️ Development

### Project Structure
```
Pollen/
├── App.js                    # Main React Native app
├── app.json                  # Expo configuration
├── package.json              # Dependencies & scripts
├── README.md                 # This file
├── assets/                   # Images & icons
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
└── src/
    ├── services/             # External integrations
    │   ├── SovereignIdentity.js
    │   ├── LedgerBridge.js
    │   ├── P2PBridge.js
    │   └── index.js
    └── domain/               # Business logic
        ├── BloomDecayProtocol.js
        └── index.js
```

### Available Scripts
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run in web browser
npm test           # Run tests
```

### Building for Production
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌍 Ecosystem Links

- **Terracare**: Main ecosystem platform
- **Oriana**: Companion wellness app
- **Terracare Ledger**: Decentralized activity ledger
- **P2P Mesh**: Decentralized communication network

## 🙏 Acknowledgments

- The Terracare community for the regenerative vision
- Oriana team for wellness ecosystem integration
- WebRTC contributors for P2P technology
- Expo team for the amazing React Native framework

## 📞 Support

For support and questions:
- GitHub Issues: [Report a bug](https://github.com/DudeAdrian/Oriana/issues)
- Discord: Join the Terracare community
- Documentation: [Terracare Docs](https://docs.terracare.eco)

---

**🌸 Pollen Wallet - Carrying value like nature carries life**