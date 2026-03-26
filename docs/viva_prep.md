# BharatPath: Viva Preparation Guide 🎓

This guide summarizes the core technical decisions and flows of the BharatPath project. Study these points to confidently answer your examiner's questions.

---

## 1. Project Flow: The "Happy Path"
1.  **Entry**: User opens the app (Dashboard).
2.  **Identification**: User enters a 10-digit **PNR**.
3.  **Persistence**: The PNR is immediately saved to **AsyncStorage** (Local Disk).
4.  **Tracking**: The app uses **TanStack Query** to fetch live status. If successful, it updates the local cache.
5.  **Emergency**: If the user needs help, they use the **SOS Screen** which pulls the PNR from the cache and generates an **Offline SMS** via the `complaintEngine`.

---

## 2. Core Tech Stack (The "Why")

### 📦 Storage: AsyncStorage (Not MMKV)
*   **Decision**: Swapped MMKV for AsyncStorage for **Stability**.
*   **The Reason**: Newer React Native versions (0.81+) use the **Bridgeless Architecture**. MMKV (C++ based) had compatibility issues with this new bridge. AsyncStorage is 100% stable.

### 🔄 State & Data: TanStack Query (React Query)
*   **The Benefit**: It handles **Loading, Error, and Caching** states automatically.
*   **Offline Strategy**: We use a "Failover" pattern in `useJourneyData.ts`.
    *   *Try*: Fetch from API.
    *   *Then*: Save to Disk Cache.
    *   *Catch*: If Network fails, instantly return the Disk Cache.

### 🗺️ Routing: BFS Engine (Offline-Ready)
*   **Algorithm**: Breadth-First Search (BFS).
*   **Constraint**: Limited to **2 legs** (1 transfer) to ensure high performance (milliseconds).
*   **Data**: Uses a static 539KB JSON (`master_map.json`) bundled with the app.

---

## 3. Coding Standard: "Direct Hook Imports" 💎
*   **The Standard**: The entire codebase uses **Direct Named Imports** (e.g., `import { useState } from 'react'`).
*   **The Reason**: This is the modern industry standard for React development. It keeps components clean, explicit, and follows senior-level best practices.

---

## 4. Potential "Tricky" Questions 🚩

**Q: Why save a JSON file locally? Won't it be slow?**
*   *A*: No. The file is only 539KB. It's loaded into RAM once, making searches nearly instant. Our BFS algorithm is also depth-limited to 2 legs.

**Q: Why use SMS for complaints instead of an API?**
*   *A*: In India, train tracks often go through "no-network" zones. SMS (`139`) is much more reliable than 4G/5G on a moving train.

**Q: Why use TanStack Query if you are already using AsyncStorage?**
*   *A*: They do different jobs. **AsyncStorage** is the "Storage." **TanStack Query** is the "Manager" who decides when to fetch data and how to handle errors.

---
**Luck is what happens when preparation meets opportunity. You're prepared!** 🚀
