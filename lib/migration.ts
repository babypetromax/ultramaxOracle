import { db } from './posDB';
// Corrected: Import SystemLog to be used in migration mapping.
import { DailyData, Shift, ShopSettings, SystemLog } from '../types';
// FIX: Import Dexie to use for type casting, resolving transaction method error.
import Dexie from 'dexie';
import { 
    INDEXEDDB_MIGRATED_KEY,
    LOCAL_STORAGE_MENU_CACHE_KEY, 
    DAILY_DATA_KEY_PREFIX, 
    LOCAL_STORAGE_SHIFT_HISTORY_KEY,
    LOCAL_STORAGE_SHOP_SETTINGS_KEY,
    LOCAL_STORAGE_FAVORITES_KEY
} from '../constants';

// This is a special interface that matches the old, now-removed MenuCache type.
// This prevents compile errors and clearly defines the expected old structure.
interface OldMenuCache {
    timestamp: number;
    menuItems: any[]; // Use `any[]` as we don't need to enforce the old Menu structure here.
    categories: string[];
}

export async function runMigration() {
    const isMigrated = localStorage.getItem(INDEXEDDB_MIGRATED_KEY);
    if (isMigrated) {
        return;
    }

    try {
        console.log('Starting data migration from localStorage to IndexedDB...');
        
        // Fix (Best Practice): Grouped all tables into an array for the Dexie transaction
        // to handle any number of tables robustly, preventing potential transaction source limits.
        const allTables = [db.menus, db.orders, db.shifts, db.settings, db.favorites, db.systemLogs, db.keyValueStore, db.dailySummary];
        
        // FIX: Cast db to Dexie to resolve transaction method typing issue.
        await (db as Dexie).transaction('rw', allTables, async () => {
            
            // 1. Migrate Menu
            const oldMenuData = localStorage.getItem(LOCAL_STORAGE_MENU_CACHE_KEY);
            if (oldMenuData) {
                const menuCache: OldMenuCache = JSON.parse(oldMenuData);
                if (menuCache.menuItems && menuCache.menuItems.length > 0) {
                    await db.menus.bulkAdd(menuCache.menuItems);
                    console.log(`Migrated ${menuCache.menuItems.length} menu items.`);
                }
            }

            // 2. Migrate Shift History
            const oldShiftHistory = localStorage.getItem(LOCAL_STORAGE_SHIFT_HISTORY_KEY);
            if (oldShiftHistory) {
                const shifts: Shift[] = JSON.parse(oldShiftHistory);
                if (shifts.length > 0) {
                    // Fix (Efficiency): Use bulkAdd for a clean insert into an empty table.
                    await db.shifts.bulkAdd(shifts);
                    console.log(`Migrated ${shifts.length} historical shifts.`);
                }
            }

            // 3. Migrate Daily Data (Orders and Logs)
            const dailyDataKeys = Object.keys(localStorage).filter(k => k.startsWith(DAILY_DATA_KEY_PREFIX));
            let totalOrders = 0;
            let totalLogs = 0;

            for (const key of dailyDataKeys) {
                const dailyDataStr = localStorage.getItem(key);
                if (dailyDataStr) {
                    const dailyData: DailyData = JSON.parse(dailyDataStr);
                    const ordersToMigrate: any[] = [];
                    if (dailyData.completedOrders) ordersToMigrate.push(...dailyData.completedOrders);
                    if (dailyData.kitchenOrders) ordersToMigrate.push(...dailyData.kitchenOrders);
                    
                    if (ordersToMigrate.length > 0) {
                        await db.orders.bulkAdd(ordersToMigrate);
                        totalOrders += ordersToMigrate.length;
                    }

                    // Fix (Critical): Correctly map old log data to the new SystemLog structure.
                    if (dailyData.activityLog && dailyData.activityLog.length > 0) {
                        const logsToMigrate: Omit<SystemLog, 'id'>[] = (dailyData.activityLog as any[]).map(log => ({
                            timestamp: new Date(log.timestamp).toISOString(),
                            type: 'ACTION' as const, // Default to 'ACTION' type for old logs
                            level: 'INFO' as const,   // Default to 'INFO' level
                            message: log.action,      // Map the old 'action' property to 'message'
                            details: { migrated: true } // Add a detail to signify it's a migrated log
                        }));
                        await db.systemLogs.bulkAdd(logsToMigrate);
                        totalLogs += logsToMigrate.length;
                    }
                    if (dailyData.currentShift) {
                        await db.shifts.put(dailyData.currentShift); // 'put' is correct here as it might be an ongoing shift.
                        console.log(`Migrated a current shift from dailyData: ${dailyData.currentShift.id}`);
                    }
                }
            }
            console.log(`Migrated ${totalOrders} orders and ${totalLogs} activity logs from all dailyData entries.`);

            // 4. Migrate Settings
            const oldSettings = localStorage.getItem(LOCAL_STORAGE_SHOP_SETTINGS_KEY);
            if(oldSettings) {
                const settings: ShopSettings = JSON.parse(oldSettings);
                // Fix: Use the key 'current' as expected by the store's initializeData function.
                await db.settings.put({ key: 'current', value: settings });
                console.log('Migrated shop settings.');
            }

            // 5. Migrate Favorites
            const oldFavorites = localStorage.getItem(LOCAL_STORAGE_FAVORITES_KEY);
            if(oldFavorites) {
                const favs: number[] = JSON.parse(oldFavorites);
                 // Fix: Use the key 'favoriteIds' as expected by the store's initializeData function.
                await db.favorites.put({ key: 'favoriteIds', value: favs });
                console.log('Migrated favorites.');
            }

            // 6. Migrate Offline Images
            const offlineLogo = localStorage.getItem('offline_receipt_logo');
            if(offlineLogo) await db.keyValueStore.put({ key: 'offline_receipt_logo', value: offlineLogo });
            const offlinePromo = localStorage.getItem('offline_receipt_promo');
            if(offlinePromo) await db.keyValueStore.put({ key: 'offline_receipt_promo', value: offlinePromo });
        });

        localStorage.setItem(INDEXEDDB_MIGRATED_KEY, 'true');
        console.log('Migration to IndexedDB successful! The app will now use IndexedDB.');

    } catch (error) {
        console.error('CRITICAL: Data migration failed. To prevent data corruption, the app will not mark the migration as complete. Please report this error with the details below.', error);
    }
}
