/**
 * @file contexts/store/index.ts
 * @description Centralized Zustand store assembler.
 * @version 6.2.0 (Chimera - Sentinel Control Implemented)
 * @author UltraMax Devs Team
 */
import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // 1. IMPORT middleware
import { AppStore, SentinelSetState, SentinelStateCreator } from './store.types';
import { traceAction } from '../../lib/sentinelLogger';

// Import all slice creators and their notification connectors
import { createSettingsSlice, connectSettingsSliceNotification } from './slices/settings.slice';
import { createCartSlice, connectCartSliceNotification } from './slices/cart.slice';
import { createShiftSlice } from './slices/shift.slice';
import { createMenuSlice, connectMenuSliceNotification } from './slices/menu.slice';
import { createStaffSlice } from './slices/staff.slice';
import { createSessionSlice, connectSessionSliceNotification } from './slices/session.slice';
import { createPromotionsSlice } from './slices/promotions.slice';
import { createInventorySlice } from './slices/inventory.slice';
import { createRecipesSlice } from './slices/recipes.slice';
import { createOrdersSlice } from './slices/orders.slice';
import { createReportsSlice } from './slices/reports.slice';
import { createDevicesSlice } from './slices/devices.slice';
import { createKitchenSlice } from './slices/kitchen.slice';
import { createMembersSlice } from './slices/members.slice';

// --- NOTIFICATION BRIDGE (Moved from legacy store.ts) ---
export const useNotificationInStore = (showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void) => {
   connectSettingsSliceNotification(showNotification);
   connectCartSliceNotification(showNotification);
   connectMenuSliceNotification(showNotification);
   connectSessionSliceNotification(showNotification);
};

// FIX: Added a generic constraint to ensure `shopSettings` exists on the state type `T`.
const sentinelMiddleware = <T extends { shopSettings: { isSentinelLoggerEnabled?: boolean } }>(
    config: SentinelStateCreator<T, T>
): StateCreator<T, [], []> => (set, get, api) => {
    const newSet: SentinelSetState<T> = (partial, replace, actionName) => {
        const stateBefore = get();
        const startTime = performance.now();

        if (replace === true) {
            set(partial as T | ((state: T) => T), true);
        } else {
            set(partial, false);
        }
        
        const isLoggingEnabled = get().shopSettings.isSentinelLoggerEnabled;
        if (!isLoggingEnabled) {
            return; 
        }

        const stateAfter = get();
        const endTime = performance.now();
        const durationMs = endTime - startTime;
        const payload = typeof partial === 'function' ? { action: 'function update' } : { partial };
        
        let slice = 'monolith';
        let parsedActionName = actionName || 'anonymousAction';

        if (actionName && actionName.includes('/')) {
            const parts = actionName.split('/');
            slice = parts[0];
            parsedActionName = parts.slice(1).join('/');
        }
        
        traceAction({ actionName: parsedActionName, slice, payload, stateBefore, stateAfter, level: 'info', durationMs }, isLoggingEnabled);
    };
    const newApi = { ...api, setState: newSet };
    return config(newSet, get, newApi);
};

// --- Store Creator with Persistence ---
export const useStore = create<AppStore>()(
    persist(
        sentinelMiddleware<AppStore>((set, get, api) => ({
            ...createSettingsSlice(set, get, api),
            ...createCartSlice(set, get, api),
            ...createShiftSlice(set, get, api),
            ...createMenuSlice(set, get, api),
            ...createSessionSlice(set, get, api),
            ...createStaffSlice(set, get, api),
            ...createPromotionsSlice(set, get, api),
            ...createInventorySlice(set, get, api),
            ...createRecipesSlice(set, get, api),
            ...createOrdersSlice(set, get, api),
            // [CRITICAL FIX] Nest the reports slice to ensure it has a valid initial state object.
            reports: createReportsSlice(set, get, api),
            ...createDevicesSlice(set, get, api),
            ...createKitchenSlice(set, get, api),
            ...createMembersSlice(set, get, api),
        })),
        {
            name: 'ultramax-pos-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                shopSettings: state.shopSettings, // [EON V2 HOTFIX] Persist all shop settings
                cart: state.cart,
                discount: state.discount,
                isVatEnabled: state.isVatEnabled,
                totalItems: state.totalItems,
                totalPrice: state.totalPrice,
            }),
        }
    )
);