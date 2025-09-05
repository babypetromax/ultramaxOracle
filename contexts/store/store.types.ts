/**
 * @file contexts/store/types.ts
 * @description TypeScript types for the Sliced Zustand store.
 * @version 6.0.0 (Chimera - Ascension Refactor)
 * @author UltraMax Devs Team
 */
import { GoogleGenAI } from "@google/genai";
import { StateCreator } from 'zustand';
// Import all necessary types from the central types file
import { 
  ShopSettings, CartItem, MenuItem, Shift, Order, KitchenOrder, StaffMember, Promotion, 
  StockItem, Recipe, Printer, KitchenTicket, DailyData
} from '../../types';

// Sentinel Middleware Integration
export type SentinelSetState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean,
  actionName?: string
) => void;
export type SentinelStateCreator<T, U> = (set: SentinelSetState<T>, get: () => T, api: any) => U;

// --- SLICE INTERFACE IMPORTS ---
// FIX: Import slice interfaces directly from their source files to prevent circular dependencies.
import { CartSlice } from './slices/cart.slice';
import { ShiftSlice } from './slices/shift.slice';
import { SettingsSlice } from './slices/settings.slice';
import { MenuSlice } from './slices/menu.slice';
import { StaffSlice } from './slices/staff.slice';
import { SessionSlice } from './slices/session.slice';
import { PromotionsSlice } from './slices/promotions.slice';
import { InventorySlice } from './slices/inventory.slice';
import { RecipesSlice } from './slices/recipes.slice';
import { OrdersSlice } from './slices/orders.slice';
import { ReportsSlice } from './slices/reports.slice';
import { DevicesSlice } from './slices/devices.slice';
import { KitchenSlice } from './slices/kitchen.slice';
import { MembersSlice } from './slices/members.slice';

// Combine all slices into the main AppStore type
export type AppStore = SettingsSlice & CartSlice & ShiftSlice & MenuSlice & StaffSlice & SessionSlice & PromotionsSlice
  & InventorySlice & RecipesSlice & OrdersSlice & { reports: ReportsSlice } & DevicesSlice & KitchenSlice & MembersSlice;