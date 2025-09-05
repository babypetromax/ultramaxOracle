import Dexie, { Table } from 'dexie';
import { MenuItem, Order, Shift, ShopSettings, SystemLog, DailySummary } from '../types';

// Interfaces for key-value stores
export interface DBSetting {
    key: 'current'; // Enforce a single key for settings
    value: ShopSettings;
}

export interface DBFavorites {
    key: 'favoriteIds';
    value: number[];
}

export interface DBKeyValue {
    key: string;
    value: any;
}

export class POSDatabase extends Dexie {
    // Declare object stores
    public menus!: Table<MenuItem, number>;
    public orders!: Table<Order, string>;
    // [CEO DIRECTIVE - DEEP FREEZE] The demoOrders table is now deprecated and frozen.
    // public demoOrders!: Table<Order, string>;
    public shifts!: Table<Shift, string>;
    public settings!: Table<DBSetting, string>;
    public favorites!: Table<DBFavorites, string>;
    public systemLogs!: Table<SystemLog, number>;
    public keyValueStore!: Table<DBKeyValue, string>;
    public dailySummary!: Table<DailySummary, string>;

    constructor() {
        super('UltraMaxPOSDB_v1');
        // FIX: Cast 'this' to Dexie to resolve issue where 'version' method is not found on the subclass type.
        (this as Dexie).version(1).stores({
            menus: '&id, name, category',
            orders: '&id, timestamp, status, syncStatus',
            shifts: '&id, startTime, status',
            settings: '&key',
            favorites: '&key',
            activityLogs: '++id, timestamp',
            keyValueStore: '&key',
        });

        // Version 2: Introduces systemLogs for better traceability and dailySummary for performance.
        // This version correctly carries over all stores from v1 and makes the necessary changes.
        // FIX: Cast 'this' to Dexie to resolve issue where 'version' method is not found on the subclass type.
        (this as Dexie).version(2).stores({
            menus: '&id, name, category',
            orders: '&id, timestamp, status, syncStatus',
            shifts: '&id, startTime, status',
            settings: '&key',
            favorites: '&key',
            keyValueStore: '&key',
            activityLogs: null, // Explicitly remove the old log table
            systemLogs: '++id, timestamp, type, level', // Add new, more detailed log table
            dailySummary: '&date', // Add summary table for fast report generation
        });

        // Version 3: Introduces demoOrders table for the Demo Mode feature.
        (this as Dexie).version(3).stores({
            menus: '&id, name, category',
            orders: '&id, timestamp, status, syncStatus',
            // =================================================================
            // [CEO DIRECTIVE - DEEP FREEZE]
            // The 'demoOrders' table is now deprecated and frozen. DO NOT uncomment.
            // demoOrders: '&id, timestamp, status, syncStatus',
            // =================================================================
            shifts: '&id, startTime, status',
            settings: '&key',
            favorites: '&key',
            keyValueStore: '&key',
            systemLogs: '++id, timestamp, type, level',
            dailySummary: '&date',
        });

        // --- 1. LEVIATHAN UPGRADE: NEW VERSION WITH ADVANCED INDEXING ---
        (this as Dexie).version(4).stores({
            orders: '&id, timestamp, status, syncStatus, [status+timestamp], paymentMethod, *items.id',
            // =================================================================
            // [CEO DIRECTIVE - DEEP FREEZE]
            // The 'demoOrders' table is now deprecated and frozen. DO NOT uncomment.
            // demoOrders: '&id, timestamp, status, syncStatus, [status+timestamp], paymentMethod, *items.id'
            // =================================================================
            // หมายเหตุ: Dexie จะนำ stores ที่เหลือจากเวอร์ชันก่อนหน้ามาโดยอัตโนมัติ
            // เราจึงระบุเฉพาะตารางที่มีการเปลี่ยนแปลง Index เท่านั้น
        });
    }
}

export const db = new POSDatabase();