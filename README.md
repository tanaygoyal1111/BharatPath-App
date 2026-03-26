# 🇮🇳 BharatPath — The Intelligent Offline Rail Companion

**BharatPath** is a high-performance, "Offline-First" React Native application designed to assist Indian Railway passengers in low-connectivity zones. From automated emergency SOS reporting to multi-leg connecting journey routing, BharatPath ensures that travel intelligence is never out of reach.

---

## 🚀 Key Features

### 🛡️ One-Touch SOS & Help System
*   **Offline Complaint Engine**: Generate standardized IRCTC "MADAD" compliant complaint strings.
*   **Native Integration**: Triggers phone’s native SMS/Dialer automatically, ensuring 100% functionality even in zero-network areas.
*   **Dual-Flow SOS**: Supports both Medical and General/Security emergencies.

### 🗺️ Offline BFS Routing Engine
*   **Intelligent Pathfinding**: Uses a Breadth-First Search (BFS) algorithm to calculate connecting routes between 500+ Indian junctions.
*   **Zero-Network Bound**: The entire routing logic and a 539KB junction map are bundled locally, making search near-instant and connection-independent.
*   **Temporal Validation**: Automatic layover buffer calculation to ensure connection feasibility.

### 🔄 Advanced Data Management
*   **TanStack Query Integration**: Sophisticated server state management with automatic retry logic and background synchronization.
*   **Hybrid Caching Engine**: Implements a two-layer cache (In-memory via TanStack + Persistent on-disk via AsyncStorage) for a seamless "Offline-First" UX.

---

## 🛠️ Tech Stack & Architecture

*   **Core**: [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)
*   **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
*   **Persistence**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) (Optimized for React Native Bridgeless Architecture)
*   **Navigation**: [React Navigation](https://reactnavigation.org/) (Native Stack)
*   **Iconography**: [@expo/vector-icons](https://icons.expo.fyi/)
*   **Design System**: Modern "Gold Standard" UI with emphasis on reliability (Deep Indigo) and speed.

---

## 🧑‍💻 Architecture Highlights (Viva Grade)

- **Modern Hook Patterns**: Global refactoring to use Direct Named Imports for better tree-shaking and cleaner codebases.
- **Failover Logic**: `useJourneyData` custom hook implementing a robust "API First, Cache Fallback" synchronization pattern.
- **Performance Optimization**: Use of `useMemo` for memoization of expensive JSON processing, ensuring 60FPS UI interactions.

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go (on mobile) or iOS/Android Simulator

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/[YOUR-USERNAME]/BharatPath.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the project:
   ```bash
   npx expo start
   ```

---

## 📜 Project Vision
BharatPath was built with the singular vision of making rail travel safe and intelligent for the millions of Indians traveling through areas with inconsistent mobile network coverage.

**Developed with 💙 for the Indian Rails.**
