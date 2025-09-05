/**
 * @file contexts/store/slices/menu.slice.ts
 * @description State management for product menu, categories, and favorites.
 * @version 2.3.0 (Chimera - Stability First Refactor)
 * @author UltraMax Devs Team
 */
// FIX: Removed MenuSlice from this import to break circular dependency. The interface is now defined and exported below.
// FIX: Corrected import path for store types.
import { AppStore, SentinelStateCreator } from '../store.types';
import { MenuItem } from '../../../types';
import { GOOGLE_SHEET_WEB_APP_URL } from '../../../constants';
import { menuRepository } from '../../../lib/menuRepository';
// [NEXUS/FLUX FIX] - Changed import to the new, stateless service to break circular dependency.
import { googleSheetApiService } from '../../../lib/googleSheetApiService';
import { db } from '../../../lib/posDB';
import { traceAction } from '../../../lib/sentinelLogger';

// FIX: Added and exported the MenuSlice interface.
export interface MenuSlice {
    menuItems: MenuItem[];
    categories: string[];
    activeCategory: string;
    favoriteIds: Set<number>;
    isMenuLoading: boolean;
    menuError: string | null;
    pinnedCategories: string[]; // [V9.95] For user-pinned categories
    categoryOrder: string[]; // [V9.95] For admin-defined sort order
    setActiveCategory: (category: string) => void;
    toggleFavorite: (itemId: number) => Promise<void>;
    fetchMenuData: (force?: boolean) => Promise<void>;
    handleSaveMenuItem: (itemToSave: (Omit<MenuItem, 'id'> & { id?: number }) | MenuItem, imageFile: File | null) => Promise<void>;
    handleDeleteItem: (itemId: number) => Promise<void>;
    handleAddCategory: (newCategoryName: string) => Promise<void>;
    handleDeleteCategory: (categoryToDelete: string) => Promise<void>;
    setPinnedCategories: (categories: string[]) => Promise<void>; // [V9.95] Action for pinning
    setCategoryOrder: (categories: string[]) => Promise<void>; // [V9.95] Action for ordering
}

// Notification connection logic
let _showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void = (msg, type) => console.log(`[MENU_SLICE_LOG] [${type?.toUpperCase()}] ${msg}`);
export const connectMenuSliceNotification = (showNotification: any) => {
    _showNotification = showNotification;
};

export const createMenuSlice: SentinelStateCreator<AppStore, MenuSlice> = (set, get) => ({
    menuItems: [],
    categories: [],
    activeCategory: 'รายการโปรด',
    favoriteIds: new Set<number>(),
    isMenuLoading: true,
    menuError: null,
    pinnedCategories: [],
    categoryOrder: [],
    setActiveCategory: (category) => set({ activeCategory: category }, false, 'menu/setActiveCategory'),
    toggleFavorite: async (itemId) => {
        // FIX: Explicitly type the new Set to avoid type inference issues from the database.
        const newFavs = new Set<number>(get().favoriteIds);
        if (newFavs.has(itemId)) newFavs.delete(itemId);
        else newFavs.add(itemId);
        await db.favorites.put({ key: 'favoriteIds', value: Array.from(newFavs) });
        set({ favoriteIds: newFavs }, false, 'menu/toggleFavorite');
    },
    fetchMenuData: async (force = false) => {
        traceAction({ actionName: 'fetchMenuData:start', payload: { force }, stateBefore: get(), level: 'lifecycle', slice: 'menu' });
        if (force) _showNotification('กำลังดึงข้อมูลเมนูล่าสุดจาก Google Sheet...', 'info');
        set({ isMenuLoading: true, menuError: null }, false, 'menu/fetchMenuData/loading');
        try {
            const webAppUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            const { menuItems, categories, source } = await menuRepository.getMenu(force, webAppUrl);
            set({ menuItems, categories, isMenuLoading: false }, false, 'menu/fetchMenuData/success');
            traceAction({ actionName: 'fetchMenuData:success', payload: { source }, stateBefore: get(), level: 'lifecycle', slice: 'menu' });
        } catch (error) {
            console.error("Failed to fetch menu data:", error);
            const errorMessage = "ไม่สามารถโหลดข้อมูลเมนูได้";
            set({ menuError: errorMessage, isMenuLoading: false }, false, 'menu/fetchMenuData/error');
            _showNotification(`${errorMessage}: ${error instanceof Error ? error.message : ''}`, 'error');
            traceAction({ actionName: 'fetchMenuData:error', payload: { error }, stateBefore: get(), level: 'error', slice: 'menu' });
        }
    },
    handleSaveMenuItem: async (itemToSave, imageFile) => {
        const isNew = !('id' in itemToSave) || itemToSave.id === 0;
        const originalOfflineImage = itemToSave.offlineImage;

        try {
            const webAppUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            // Create a version of the item to send to the API, without the local-only offlineImage
            const { offlineImage, ...itemForApi } = itemToSave;
            
            // 1. Send core data to Google Sheet
            await googleSheetApiService.postData(webAppUrl, 'saveMenuItem', itemForApi);

            const oldItems = get().menuItems;

            // 2. Refetch all data from the sheet to get the single source of truth (including new ID if created)
            await get().fetchMenuData(true);

            // 3. Re-apply the offline image to the correct item in the local DB
            if (originalOfflineImage) {
                const currentItems = get().menuItems;
                let targetItem;

                if (isNew) {
                    // Find the new item by finding an item in the new list that wasn't in the old one.
                    targetItem = currentItems.find(newItem => !oldItems.some(oldItem => oldItem.id === newItem.id));
                } else {
                    targetItem = currentItems.find(item => item.id === (itemToSave as MenuItem).id);
                }

                if (targetItem) {
                    const itemWithOfflineImage = { ...targetItem, offlineImage: originalOfflineImage };
                    await db.menus.put(itemWithOfflineImage);
                    const finalItems = await db.menus.toArray();
                    set({ menuItems: finalItems }, false, 'menu/saveMenuItem/applyOfflineImage');
                } else {
                     _showNotification('ไม่พบสินค้าที่ตรงกันเพื่อบันทึกรูปออฟไลน์', 'warning');
                }
            }
            _showNotification(`บันทึกสินค้า "${itemToSave.name}" สำเร็จ`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            _showNotification(`เกิดข้อผิดพลาดในการบันทึก: ${message}`, 'error');
            console.error(error);
        }
    },
    handleDeleteItem: async (itemId) => {
        try {
            const webAppUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            await googleSheetApiService.postData(webAppUrl, 'deleteMenuItem', { id: itemId });
            _showNotification('ลบสินค้าสำเร็จ', 'success');
            await get().fetchMenuData(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            _showNotification(`เกิดข้อผิดพลาดในการลบสินค้า: ${message}`, 'error');
            console.error(error);
        }
    },
     handleAddCategory: async (newCategoryName) => {
        try {
            const webAppUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            await googleSheetApiService.postData(webAppUrl, 'addCategory', { name: newCategoryName });
            _showNotification(`เพิ่มหมวดหมู่ "${newCategoryName}" สำเร็จ`, 'success');
            await get().fetchMenuData(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            _showNotification(`เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่: ${message}`, 'error');
            console.error(error);
        }
    },
    handleDeleteCategory: async (categoryToDelete) => {
        try {
            const webAppUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            await googleSheetApiService.postData(webAppUrl, 'deleteCategory', { name: categoryToDelete });
             _showNotification(`ลบหมวดหมู่ "${categoryToDelete}" สำเร็จ`, 'success');
            await get().fetchMenuData(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
             _showNotification(`เกิดข้อผิดพลาดในการลบหมวดหมู่: ${message}`, 'error');
            console.error(error);
        }
    },
    // [V9.95] New Actions
    setPinnedCategories: async (categories) => {
        await db.keyValueStore.put({ key: 'pinnedCategories', value: categories });
        set({ pinnedCategories: categories }, false, 'menu/setPinnedCategories');
    },
    setCategoryOrder: async (categories) => {
        const settings = get().shopSettings;
        const newSettings = { ...settings, categoryOrder: categories };
        await get().setShopSettings(newSettings);
        set({ categoryOrder: categories }, false, 'menu/setCategoryOrder');
    },
});