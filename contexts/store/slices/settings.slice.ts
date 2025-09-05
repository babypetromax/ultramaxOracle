/**
 * @file contexts/store/slices/settings.slice.ts
 * @description State management for all application settings.
 * @version 1.5.0 (Project Oracle - Data Integrity Fix)
 * @author UltraMax Devs Team
 */
import { GoogleGenAI } from "@google/genai";
import { ShopSettings } from "../../../types";
import { GOOGLE_SHEET_WEB_APP_URL, DEFAULT_SYNC_INTERVAL_MINUTES } from "../../../constants";
import { db } from '../../../lib/posDB';
import { googleSheetApiService } from '../../../lib/googleSheetApiService';
// FIX: Removed unused import for generateMockSalesData as the demo system is deprecated.
import { SentinelStateCreator, AppStore } from '../store.types';

export interface SettingsSlice {
    shopSettings: ShopSettings;
    ai: GoogleGenAI | null;
    offlineReceiptLogo: string | null;
    offlineReceiptPromo: string | null;
    setShopSettings: (settings: ShopSettings) => Promise<void>;
    setOfflineReceiptLogo: (logo: string | null) => Promise<void>;
    setOfflineReceiptPromo: (promo: string | null) => Promise<void>;
    createNewMonthlySheet: () => Promise<boolean>;
    switchToNewSheet: (newUrl: string) => Promise<boolean>;
    toggleDemoMode: (enable: boolean) => Promise<void>;
    setTheme: (theme: string) => void;
    toggleSentinelLogger: (enable: boolean) => void;
}

let _showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void = (msg, type) => console.log(`[SETTINGS_SLICE_LOG] [${type?.toUpperCase()}] ${msg}`);
export const connectSettingsSliceNotification = (showNotification: any) => {
    _showNotification = showNotification;
};

export const createSettingsSlice: SentinelStateCreator<AppStore, SettingsSlice> = (set, get) => ({
    shopSettings: {
        shopName: 'ทาโกะหมึกแดง Takoyaki',
        address: 'Jpark Sriracha Chonburi 20110',
        phone: '062-878-9654',
        taxId: '',
        isVatDefaultEnabled: false,
        vatRatePercent: 7,
        isServiceChargeEnabled: false,
        serviceChargeRatePercent: 10,
        cookingTimeThresholdMinutes: 5,
        delayedTimeThresholdMinutes: 10,
        logoUrl: '',
        promoUrl: '',
        headerText: 'โปรดระวัง ทาโกะยากิร้อนมาก และแซลมอนอาจมีก้างนะครับ',
        footerText: 'ออกบูธ จัดเลี้ยง ชุดเบรค งานเลี้ยงพนักงาน เริ่มต้น 59.-9jv=6f',
        logoSizePercent: 80,
        promoSizePercent: 100,
        receiptTopMargin: 4,
        receiptBottomMargin: 4,
        receiptLineSpacing: 1.2,
        interactionMode: 'touch',
        isKeyboardNavEnabled: false,
        googleSheetUrl: '',
        syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
        isAutoSyncEnabled: true,
        showDecimalsInPos: false,
        // [CEO DIRECTIVE - DEEP FREEZE] Demo mode is permanently hard-coded to false.
        isDemoModeEnabled: false,
        adminPin: '1111',
        menuGridColumns: 'auto',
        theme: 'theme-original',
        posViewMode: 'grid', // [PROJECT EON V2] Default view mode
        isSentinelLoggerEnabled: true,
    },
    ai: null,
    offlineReceiptLogo: null,
    offlineReceiptPromo: null,
    setShopSettings: async (settings) => {
        await db.settings.put({ key: 'current', value: settings });
        set({ shopSettings: settings }, false, 'setShopSettings');
        get().setIsVatEnabled(settings.isVatDefaultEnabled);
    },
    setTheme: (theme) => {
        const newSettings = { ...get().shopSettings, theme };
        get().setShopSettings(newSettings);
        set({ shopSettings: newSettings }, false, 'settings/setTheme');
    },
    toggleSentinelLogger: (enable: boolean) => {
        const newSettings = { ...get().shopSettings, isSentinelLoggerEnabled: enable };
        get().setShopSettings(newSettings);
        _showNotification(`Sentinel Logger has been ${enable ? 'ENABLED' : 'DISABLED'}.`, 'info');
    },
    setOfflineReceiptLogo: async (logo) => {
        if (logo) {
            await db.keyValueStore.put({ key: 'offline_receipt_logo', value: logo });
        } else {
            await db.keyValueStore.delete('offline_receipt_logo');
        }
        set({ offlineReceiptLogo: logo }, false, 'setOfflineReceiptLogo');
    },
    setOfflineReceiptPromo: async (promo) => {
        if (promo) {
            await db.keyValueStore.put({ key: 'offline_receipt_promo', value: promo });
        } else {
            await db.keyValueStore.delete('offline_receipt_promo');
        }
        set({ offlineReceiptPromo: promo }, false, 'setOfflineReceiptPromo');
    },
    createNewMonthlySheet: async () => {
        _showNotification('กำลังส่งคำสั่งสร้างชีทใหม่...', 'info');
        try {
            const currentUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            const result = await googleSheetApiService.postData(currentUrl, 'createNewMonthlySheet', {});
            if (result.newUrl) {
                await get().switchToNewSheet(result.newUrl);
                return true;
            }
            throw new Error(result.message || 'No new URL returned from script.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            _showNotification(`สร้างชีทใหม่ล้มเหลว: ${message}`, 'error');
            return false;
        }
    },
    switchToNewSheet: async (newUrl) => {
        _showNotification('กำลังตรวจสอบและสลับไปยังชีทใหม่...', 'info');
        try {
            const testResult = await googleSheetApiService.postData(newUrl, 'ping', {});
            if (testResult && testResult.status === 'success') {
                const newSettings = { ...get().shopSettings, googleSheetUrl: newUrl };
                await get().setShopSettings(newSettings);
                _showNotification('สลับไปยังชีทใหม่สำเร็จ!', 'success');
                return true;
            }
            throw new Error('Ping to new URL failed.');
        } catch (error) {
            _showNotification('URL ของชีทใหม่ไม่ถูกต้องหรือไม่สามารถเชื่อมต่อได้', 'error');
            return false;
        }
    },
    toggleDemoMode: async () => {
        // [CEO DIRECTIVE - DEEP FREEZE] This action is disabled.
        console.warn("Attempted to toggle deprecated Demo Mode. This action has been neutralized.");
        _showNotification('โหมดสาธิตถูกปิดใช้งานอย่างถาวร', 'warning');
        // The action now does nothing and does not change state.
    },
});