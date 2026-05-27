# 🌸 Pollen Wallet - Quick Start Guide

## Running the App Locally

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI (will be installed automatically)
- Expo Go app on your phone (for testing)

### Installation & Running

1. **Navigate to Pollen directory**
   ```bash
   cd Pollen
   ```

2. **Install dependencies** (currently running)
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your device**
   - **Option A**: Scan the QR code with Expo Go app (iOS/Android)
   - **Option B**: Press `a` for Android emulator
   - **Option C**: Press `i` for iOS simulator
   - **Option D**: Press `w` for web browser

### What You'll See

When the app loads, you'll see:

1. **Welcome Screen**
   - Pollen Wallet logo
   - "Create Pollen Wallet" button
   - Terracare ecosystem branding

2. **After Creating Wallet**
   - Balance card showing POLLEN tokens + AUD equivalent
   - Action buttons: Send, Receive, Bloom, Hive
   - Bloom window status
   - Transaction history

3. **Bottom Navigation**
   - Wallet tab (main balance)
   - Bloom tab (bloom cycle & Pot_Assets)
   - Hive tab (P2P network status)
   - Settings tab (wallet settings)

### Key Features to Test

- **Create a wallet** - Generates mnemonic and address
- **View balance** - Shows POLLEN + AUD conversion ($0.65 AUD/POLLEN)
- **Bloom tab** - See current bloom window and Pot_Assets
- **Hive tab** - Check P2P mesh network status
- **Settings** - Explore wallet options

### Australian Market Features

- All amounts displayed in **AUD** (Australian Dollars)
- Payment methods include Google Pay, Apple Pay, PayID, BPAY, POLi
- 6% platform fee on marketplace transactions
- Australian English throughout

### Troubleshooting

If you encounter issues:

1. **Dependency conflicts**: Use `npm install --legacy-peer-deps`
2. **Metro bundler errors**: Clear cache with `expo start -c`
3. **Device connection**: Ensure phone and computer on same WiFi
4. **Port issues**: Expo uses port 8081, make sure it's available

### Next Steps

After testing locally:

1. **Set up backend**: Configure Terracare Ledger API endpoint
2. **Configure environment**: Create `.env` file with API URLs
3. **Test payment methods**: Integrate with payment gateways
4. **Build for production**: `expo build:ios` or `expo build:android`

### Support

- Check `README.md` for detailed documentation
- See `IMPLEMENTATION_SUMMARY.md` for technical details
- Review `AUSTRALIAN_MARKET_IMPLEMENTATION.md` for AU-specific features
- Read `TERRACARE_ECOSYSTEM_ALIGNMENT.md` for ecosystem integration

---

**🌸 Enjoy your Pollen Wallet experience!**