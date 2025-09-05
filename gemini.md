# Gemini CLI - Project Technical Documentation: ultramax-pos-v9.82

This document serves as a technical reference and analysis of the **ultramax-pos-v9.82** project. It is intended to provide deep context into the architecture, data flow, and core systems for future development and debugging.

---

## 1. Project Overview & Key Technologies

This project is a sophisticated **Point-of-Sale (POS) system** built as a modern web application.

*   **Core Technologies:**
    *   **UI Framework:** React v18+ (using TypeScript)
    *   **State Management:** Zustand
    *   **Local Database:** Dexie.js (IndexedDB wrapper)
    *   **Charting:** Chart.js
    *   **AI Integration:** @google/genai

---

## 2. In-Depth System Analysis

### 2.1. State Management (`Zustand`)

The application employs **Zustand** for centralized, hook-based state management. The architecture is clean and modular.

*   **Store Assembly (`contexts/store/index.ts`):** A single `useStore` hook provides access to the entire application state. This central file assembles multiple "slices" into one store.
*   **Slice Pattern:** State is organized into domain-specific slices (e.g., `cart.slice.ts`, `session.slice.ts`, `reports.slice.ts`). Each slice defines its own state and the actions that can modify it. This is an excellent pattern for scalability and separation of concerns.
*   **State Immutability:** Zustand encourages immutability. Actions typically return a new state object (`{...state, ...newState}`) rather than mutating the state directly.

### 2.2. Sentinel Logging System

The project features a powerful, custom-built client-side logging system named **Sentinel**.

*   **Core File:** `lib/sentinelLogger.ts`
*   **Database:** Logs are **not** stored in the main application database. They are persisted to a separate IndexedDB database via `lib/sentinelDB.ts` to avoid polluting application data.
*   **`sentinelMiddleware`:** This Zustand middleware is the heart of the system. It automatically intercepts **every action** dispatched to the store.
    *   For each action, it logs:
        *   `actionName` and `slice`
        *   `payload` (the data sent with the action)
        *   `stateBefore` and `stateAfter` (as stringified JSON)
        *   `durationMs` (performance of the state update)
        *   `level` (info, error, etc.)
*   **`traceAction` Function:** This is the primary interface for manual logging. It allows any component to send structured log data to the Sentinel database. This was used effectively in the `ReportsScreen` to trace the data fetching lifecycle.
*   **Utility:** This system is invaluable for debugging complex state interactions and understanding the application's behavior without relying solely on breakpoints.

### 2.3. IndexedDB Schema (`posDB.ts`)

Data is persisted locally using Dexie.js, a wrapper that simplifies IndexedDB operations. The database (`UltraMaxPOSDB_v1`) is versioned, allowing for schema migrations.

*   **Database Class:** `POSDatabase` in `lib/posDB.ts`
*   **Key Tables (Object Stores) in v3:**
    *   `menus`: Stores `MenuItem` objects. Keyed by `&id`.
    *   `orders`: Stores `Order` objects for real transactions. Keyed by `&id` (likely a UUID string). Indexed by `timestamp`, `status`.
    *   `demoOrders`: **Identical structure to `orders`**. Used specifically when `isDemoModeEnabled` is true. This separation is key to preventing data contamination.
    *   `shifts`: Stores `Shift` objects. Keyed by `&id`.
    *   `settings`: A key-value store for application settings, likely holding a single `ShopSettings` object.
    *   `systemLogs`: Stores `SentinelLogEntry` objects for the logging system.
    *   `dailySummary`: Caches aggregated report data for performance. Keyed by `&date`.

---

## 3. Application Workflows & Data Flow

### 3.1. Core POS Workflow (`PosView.tsx`)

This workflow is **State-Driven** and relies on Zustand as the central communication hub.

1.  **Guard Condition:** The view first checks `dailyData.currentShift` from the store. If no shift is active, it renders a `ShiftStartOverlay`, blocking all other UI.
2.  **Component Interaction (Implicit Data Flow):**
    *   `CategoryColumn` -> sets active category in `menu.slice`.
    *   `MenuGrid` -> reads active category from `menu.slice`, displays items. When an item is clicked, it calls an action in `cart.slice`.
    *   `OrderPanel` -> reads the `cart.slice` and re-renders to show the current bill.
    *   `PaymentModal` -> triggered from `OrderPanel`, processes payment, and calls an action in `orders.slice` to save the final order to IndexedDB.
3.  **Data Persistence:** The `orders.slice` is responsible for writing the completed `Order` object to the `db.orders` table in IndexedDB.

### 3.2. Reporting Workflow (`ReportsScreen.tsx`)

This workflow is **Props-Driven** and demonstrates a clear separation of concerns.

1.  **Data Ownership:** `ReportsScreen.tsx` is the single source of truth for all reporting data.
2.  **Data Fetching:**
    *   A `useEffect` hook triggers on component mount or when `shopSettings.isDemoModeEnabled` changes.
    *   It fetches **all** orders from either `db.orders` or `db.demoOrders` based on the demo flag.
    *   The raw data is stored in a local state variable `allOrders`.
3.  **Data Processing & Filtering:**
    *   A `useMemo` hook is used for performance. It takes `allOrders` and the user-selected `dateRange` as input.
    *   It returns a `filteredOrders` array.
    *   A second `useMemo` hook calculates `summaryDataForRange` based on the `filteredOrders`.
4.  **Data Distribution (Props Drilling):**
    *   `ReportsScreen` renders the active report component (e.g., `SummaryReport`).
    *   It passes the processed data (`filteredOrders`, `summaryDataForRange`) down as props.
5.  **Child Component Rendering:** The child components (`SummaryReport`, etc.) are "dumb" components. They receive the data via props and render it without any knowledge of where the data came from. This makes them highly reusable and easy to test.

**Visual Data Flow (Reports):**

```
[IndexedDB] -> (db.orders / db.demoOrders)
     |
     V
[ReportsScreen.tsx] (Fetches data into `allOrders` state)
     |
     V
[ReportsScreen.tsx] (Filters data into `filteredOrders` via useMemo)
     |
     V
[SummaryReport.tsx] (Receives `filteredOrders` as props and renders charts)
```

---

## 4. Session Log: Bug Fix (2024-09-02)

*   **Problem:** Reports screen was not displaying data.
*   **Root Cause:** A redundant component, `DemoReportsScreen.tsx`, was created as a copy of `ReportsScreen.tsx`. This introduced a conflicting and unnecessary data flow, which caused state management issues and prevented the primary report from rendering correctly.
*   **Solution:** The duplicated component and all references to it were removed from `ReportsScreen.tsx`, consolidating the logic into a single, correct data flow that was already capable of handling demo mode.

---

## 5. Future Recommendations

*   **Avoid Code Duplication:** The bug was a direct result of duplicating a complex component. Future development should avoid this and leverage existing logic (like the `isDemoModeEnabled` flag).
*   **Review `useEffect` Dependencies:** The data fetching `useEffect` in `ReportsScreen.tsx` depends on `dailyData`. This could cause the component to re-fetch all orders more often than necessary. This dependency should be reviewed to see if it can be made more specific or removed.
