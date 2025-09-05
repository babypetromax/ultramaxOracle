// lib/menuRepository.ts

import { MenuItem } from '../types';
// [NEXUS/FLUX FIX] - Changed import to the new, stateless service to break circular dependency.
import { googleSheetApiService } from './googleSheetApiService';
import { GOOGLE_SHEET_WEB_APP_URL } from '../constants';
import { fetchAndCacheImage } from './imageStore';
import { db } from './posDB';
// FIX: Import Dexie to use for type casting, resolving transaction method error.
import Dexie from 'dexie';

/**
 * @description Repository to manage menu data, acting as a Single Source of Truth.
 * Handles caching (in IndexedDB) and fetching data from the API service.
 */
class MenuRepository {
    /**
     * Fetches menu data, automatically handling caching within IndexedDB.
     * @param force - If true, always fetch new data from the server.
     * @param webAppUrl - The Google Sheet Web App URL to use.
     * @returns { menuItems: MenuItem[], categories: string[], source: 'cache' | 'network' }
     */
    async getMenu(force: boolean = false, webAppUrl?: string): Promise<{ menuItems: MenuItem[], categories: string[], source: 'cache' | 'network' }> {
        if (!force) {
            // FIX: Explicitly type cachedItems to resolve type inference issue.
            const cachedItems: MenuItem[] = await db.menus.toArray();
            if (cachedItems.length > 0) {
                const categories = [...new Set(cachedItems.map(item => item.category))].sort();
                // Pre-cache images in the background for a faster UI experience
                cachedItems.forEach(item => { if (item.image) fetchAndCacheImage(item.id, item.image); });
                return { menuItems: cachedItems, categories, source: 'cache' };
            }
        }

        // If no cache, or if a refresh is forced
        const url = webAppUrl || GOOGLE_SHEET_WEB_APP_URL;
        const responseData = await googleSheetApiService.getMenuData(url);

        // --- [CRITICAL HOTFIX] DATA INTEGRITY VALIDATION ---
        // Validate the structure of the API response before processing.
        // This prevents crashes if the Google Sheet or API script returns unexpected data.
        if (
            !responseData ||
            responseData.status !== 'success' ||
            !responseData.data ||
            !Array.isArray(responseData.data.menuItems) ||
            !Array.isArray(responseData.data.categories)
        ) {
            console.error("CRITICAL ERROR: Invalid menu data structure received from API.", responseData);
            throw new Error("Received invalid or corrupt data from the menu source. Please check the Google Sheet's structure and API script.");
        }
        // --- END OF HOTFIX ---
        
        const formattedMenuItems: MenuItem[] = responseData.data.menuItems.map((item: any) => ({
            ...item,
            id: Number(item.id),
            price: parseFloat(item.price) || 0
        }));
        
        // Use a transaction to clear old data and add new data atomically
        // FIX: Cast db to Dexie to resolve transaction method typing issue and wrap table in an array.
        await (db as Dexie).transaction('rw', db.menus, async () => {
            await db.menus.clear();
            await db.menus.bulkAdd(formattedMenuItems);
        });

        // Pre-cache images for the newly fetched items
        formattedMenuItems.forEach(item => { if (item.image) fetchAndCacheImage(item.id, item.image); });

        return { menuItems: formattedMenuItems, categories: responseData.data.categories, source: 'network' };
    }
}

export const menuRepository = new MenuRepository();