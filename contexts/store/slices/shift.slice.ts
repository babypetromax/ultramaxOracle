/**
 * @file contexts/store/slices/shift.slice.ts
 * @description State management for work shifts and historical order data.
 * @version 1.5.0 (Oracle - Consolidation Fix)
 * @author UltraMax Devs Team
 */
// FIX: Corrected import path for store types.
import { AppStore, SentinelStateCreator } from '../store.types';
import { Shift, Order, KitchenOrder, CashDrawerActivity, ShopSettings, DailyData } from '../../../types';
import { db } from '../../../lib/posDB';
import { Logger } from '../../../services/loggingService';
import { getYYYYMMDD } from '../../../helpers';
// Fix: Corrected the import path for googleSheetApiService to point to the new location in `lib/` instead of the deprecated `services/data/`.
import { googleSheetApiService } from '../../../lib/googleSheetApiService';
// FIX: Import the missing DEFAULT_SYNC_INTERVAL_MINUTES constant.
import { GOOGLE_SHEET_WEB_APP_URL, DAILY_DATA_KEY_PREFIX, DEFAULT_SYNC_INTERVAL_MINUTES } from '../../../constants';
import { traceAction } from '../../../lib/sentinelLogger';
import { GoogleGenAI } from '@google/genai';
import Dexie from 'dexie';

export interface ShiftSlice {
    dailyData: DailyData | null;
    shiftHistory: Shift[];
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncOrders: () => Promise<void>;
    handleUpdateOrderStatus: (orderId: string, status: 'ready') => Promise<void>;
    handleCompleteOrder: (orderId: string) => Promise<void>;
    handleCancelBill: (orderToCancel: Order) => Promise<void>;
    handleStartShift: (openingFloat: number) => Promise<void>;
    handlePaidInOut: (args: { type: 'PAID_IN' | 'PAID_OUT'; amount: number; description: string }) => Promise<void>;
    handleManualDrawerOpen: (description: string) => Promise<void>;
    handleEndShift: (endShiftData: { counted: number; nextShift: number }) => Promise<void>;
    generateNewDailyId: () => Promise<string>;
    initializeData: () => Promise<void>;
}

export const createShiftSlice: SentinelStateCreator<AppStore, ShiftSlice> = (set, get) => ({
    dailyData: null,
    shiftHistory: [],
    isSyncing: false,
    lastSyncTime: null,
    
    syncOrders: async () => {
         set({ isSyncing: true }, false, 'shift/syncOrders/start');

        try {
            const pendingOrders = await db.orders.where('syncStatus').equals('pending').toArray();
            if (pendingOrders.length === 0) {
                set({ lastSyncTime: new Date() }, false, 'shift/syncOrders/no-pending');
                return;
            }

            const webAppUrl = get().shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
            await googleSheetApiService.postData(webAppUrl, 'logBatchData', { salesData: pendingOrders });

            const updatedOrders = pendingOrders.map(o => ({ ...o, syncStatus: 'synced' as const }));
            await db.orders.bulkPut(updatedOrders);
            
            set(state => ({
                dailyData: {
                    ...state.dailyData!,
                    completedOrders: state.dailyData!.completedOrders.map(o => {
                        const synced = updatedOrders.find(uo => uo.id === o.id);
                        return synced || o;
                    })
                },
                lastSyncTime: new Date()
            }), false, 'shift/syncOrders/success');

        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            set({ isSyncing: false }, false, 'shift/syncOrders/end');
        }
    },
    handleUpdateOrderStatus: async (orderId, status) => {
        const order = get().dailyData?.kitchenOrders.find(o => o.id === orderId);
        if(!order) return;
        const updatedOrder = { ...order, status };
        await db.orders.put(updatedOrder);
         set(state => ({
            dailyData: { ...state.dailyData!, kitchenOrders: state.dailyData!.kitchenOrders.map(o => o.id === orderId ? updatedOrder : o), dataSync: new Date() },
            reports: { ...state.reports, allOrders: state.reports.allOrders.map(o => o.id === orderId ? updatedOrder : o) }
        }), false, 'shift/updateOrderStatus');
        Logger.action(`Update Order Status`, { status }, { transactionId: orderId });
    },
    
    handleCompleteOrder: async (orderId) => {
        const order = get().dailyData?.kitchenOrders.find(o => o.id === orderId);
        if(!order) return;

        const readyAt = new Date();
        const prepTime = (readyAt.getTime() - new Date(order.timestamp).getTime()) / 1000;
        const updatedOrder: Order = { ...order, status: 'completed', readyAt, preparationTimeInSeconds: prepTime };
        
        const currentShift = get().dailyData?.currentShift;
        let updatedShift = currentShift;
        if (currentShift && !currentShift.activities.some(act => act.orderId === orderId && act.type === 'SALE')) {
            const saleActivity: CashDrawerActivity = {
                id: `act-${Date.now()}`,
                timestamp: new Date(),
                type: 'SALE',
                amount: updatedOrder.total,
                paymentMethod: updatedOrder.paymentMethod,
                description: `Sale from KDS for order #${updatedOrder.id}`,
                orderId: updatedOrder.id
            };
            updatedShift = { ...currentShift, activities: [...currentShift.activities, saleActivity] };
        }

        try {
            await (db as Dexie).transaction('rw', [db.orders, db.shifts], async () => {
                await db.orders.put(updatedOrder);
                if (updatedShift && updatedShift !== currentShift) {
                    await db.shifts.put(updatedShift);
                }
            });

            set(state => ({
                dailyData: {
                    ...state.dailyData!,
                    kitchenOrders: state.dailyData!.kitchenOrders.filter(o => o.id !== orderId),
                    completedOrders: [updatedOrder, ...state.dailyData!.completedOrders],
                    currentShift: updatedShift || state.dailyData!.currentShift,
                    dataSync: new Date()
                },
                reports: { ...state.reports, allOrders: state.reports.allOrders.map(o => o.id === orderId ? updatedOrder : o) }
            }), false, 'shift/completeOrder');
            Logger.action(`Complete Order from KDS`, { prepTime }, { transactionId: orderId });
            await db.keyValueStore.put({ key: `${DAILY_DATA_KEY_PREFIX}${getYYYYMMDD(new Date())}`, value: get().dailyData });

            if (get().shopSettings.isAutoSyncEnabled) {
                get().syncOrders();
            }
        } catch (error) {
            console.error("UltraMax Devs Log: Failed to save completed order and shift.", error);
            return;
        }
    },
    
    handleCancelBill: async (orderToCancel) => {
        const currentShift = get().dailyData?.currentShift;
        if (!currentShift) return;

        const cancelledOrder: Order = { ...orderToCancel, status: 'cancelled', cancelledAt: new Date() };
        const reversalOrder: Order = {
            ...orderToCancel, id: `R-${orderToCancel.id}`, total: -orderToCancel.total, subtotal: -orderToCancel.subtotal, tax: -orderToCancel.tax, discountValue: -orderToCancel.discountValue, serviceChargeValue: -orderToCancel.serviceChargeValue, items: orderToCancel.items.map(item => ({ ...item, quantity: -item.quantity })), reversalOf: orderToCancel.id, timestamp: new Date(), syncStatus: 'pending'
        };
        const refundActivity: CashDrawerActivity = {
            id: `act-${Date.now()}`, timestamp: new Date(), type: 'REFUND', amount: orderToCancel.total, paymentMethod: orderToCancel.paymentMethod, description: `Refund for cancelled order #${orderToCancel.id}`, orderId: orderToCancel.id,
        };
        const updatedShift = { ...currentShift, activities: [...currentShift.activities, refundActivity]};
        
        try {
          await (db as Dexie).transaction('rw', [db.orders, db.shifts], async () => {
              await db.orders.put(cancelledOrder);
              await db.orders.add(reversalOrder);
              await db.shifts.put(updatedShift);
          });
        } catch (error) {
          console.error("UltraMax Devs Log: Failed to cancel bill.", error);
          return;
        }

        set(state => ({
            dailyData: {
                ...state.dailyData!,
                completedOrders: state.dailyData!.completedOrders.map(o => o.id === orderToCancel.id ? cancelledOrder : o).concat(reversalOrder),
                currentShift: updatedShift,
                dataSync: new Date()
            },
            reports: { ...state.reports, allOrders: state.reports.allOrders.map(o => o.id === orderToCancel.id ? cancelledOrder : o).concat(reversalOrder) }
        }), false, 'shift/cancelBill');
        Logger.action(`Cancel Bill`, { originalTotal: orderToCancel.total }, { transactionId: orderToCancel.id, shiftId: updatedShift.id });

        await db.keyValueStore.put({ key: `${DAILY_DATA_KEY_PREFIX}${getYYYYMMDD(new Date())}`, value: get().dailyData });

        if (get().shopSettings.isAutoSyncEnabled) {
            get().syncOrders();
        }
    },
    handleStartShift: async (openingFloat) => {
        const todayStr = getYYYYMMDD(new Date());
        const todayShifts = get().shiftHistory.filter(s => s.id.startsWith(todayStr));
        const newShiftId = `${todayStr}-S${todayShifts.length + 1}`;
        const startTime = new Date();
        const newShift: Shift = {
            id: newShiftId, status: 'OPEN', startTime, openingFloatAmount: openingFloat, activities: [{ id: `act-${Date.now()}`, timestamp: startTime, type: 'SHIFT_START', amount: openingFloat, paymentMethod: 'cash', description: 'Opening float' }]
        };
        
        // =================================================================
        // [CEO DIRECTIVE - DEEP FREEZE]
        // The entire Demo System is now deprecated and frozen.
        // The generation of demo orders has been PERMANENTLY DISABLED.
        // =================================================================
        // if (get().shopSettings.isDemoModeEnabled) {
        //   await generateDemoOrders();
        // }
        // =================================================================

        await db.shifts.add(newShift);
        set(state => ({ dailyData: { ...state.dailyData!, currentShift: newShift } }), false, 'shift/startShift');
        Logger.action(`Start Shift`, { openingFloat }, { shiftId: newShiftId });
    },
    handlePaidInOut: async ({ type, amount, description }) => {
        const currentShift = get().dailyData?.currentShift;
        if (!currentShift) return;
        const activity: CashDrawerActivity = {
            id: `act-${Date.now()}`, timestamp: new Date(), type, amount, paymentMethod: 'cash', description,
        };
        const updatedShift = { ...currentShift, activities: [...currentShift.activities, activity] };
        await db.shifts.put(updatedShift);
        set(state => ({ dailyData: { ...state.dailyData!, currentShift: updatedShift } }), false, `shift/${type}`);
        Logger.action(type, { amount, description }, { shiftId: currentShift.id });

        if (get().shopSettings.isAutoSyncEnabled) {
            get().syncOrders();
        }
    },
    handleManualDrawerOpen: async (description) => {
        const currentShift = get().dailyData?.currentShift;
        if (!currentShift) return;
        const activity: CashDrawerActivity = {
            id: `act-${Date.now()}`, timestamp: new Date(), type: 'MANUAL_OPEN', amount: 0, paymentMethod: 'none', description,
        };
        const updatedShift = { ...currentShift, activities: [...currentShift.activities, activity] };
        await db.shifts.put(updatedShift);
        set(state => ({ dailyData: { ...state.dailyData!, currentShift: updatedShift } }), false, 'shift/manualDrawerOpen');
        Logger.warn('ACTION', `Manual Drawer Open`, { description }, { shiftId: currentShift.id });
    },
    handleEndShift: async (endShiftData) => {
        const { currentShift } = get().dailyData!;
        if(!currentShift) return;
        const closedShift: Shift = { ...currentShift, status: 'CLOSED', endTime: new Date(), closingCashCounted: endShiftData.counted, cashForNextShift: endShiftData.nextShift }; // simplified
        await db.shifts.put(closedShift);
        set(state => ({
            dailyData: { ...state.dailyData!, currentShift: null },
            shiftHistory: [...state.shiftHistory, closedShift]
        }), false, 'shift/endShift');
        Logger.action(`End Shift`, { counted: endShiftData.counted }, { shiftId: closedShift.id });
    },
    generateNewDailyId: async () => {
        const prefix = getYYYYMMDD(new Date());
        const todayOrdersCount = await db.orders.where('id').startsWith(prefix).count();
        return `${prefix}-${String(todayOrdersCount + 1).padStart(4, '0')}`;
    },
    initializeData: async () => {
        traceAction({ actionName: 'initializeData:start', stateBefore: get(), level: 'lifecycle' });
        
        const favsResult = await db.favorites.get('favoriteIds');
        if (favsResult) set({ favoriteIds: new Set<number>(favsResult.value) }, false, 'initialize/loadFavorites');

        // [V9.95] Load Pinned Categories
        const pinnedResult = await db.keyValueStore.get('pinnedCategories');
        if (pinnedResult) {
            set({ pinnedCategories: pinnedResult.value }, false, 'initialize/loadPinned');
        }

        const closedShifts = await db.shifts.where('status').equals('CLOSED').toArray();
        set({ shiftHistory: closedShifts }, false, 'initialize/loadShiftHistory');

        const defaultSettings: ShopSettings = {
            shopName: 'UltraMax Takoyaki', address: '123 Main St, Bangkok', phone: '081-234-5678', taxId: '1234567890123', isVatDefaultEnabled: false, vatRatePercent: 7, isServiceChargeEnabled: false, serviceChargeRatePercent: 10, cookingTimeThresholdMinutes: 3, delayedTimeThresholdMinutes: 5, logoUrl: '', promoUrl: '', headerText: 'ขอบคุณที่ใช้บริการ', footerText: 'โอกาสหน้าเชิญใหม่นะครับ', logoSizePercent: 80, promoSizePercent: 100, receiptTopMargin: 4, receiptBottomMargin: 4, receiptLineSpacing: 1.2, interactionMode: 'touch', isKeyboardNavEnabled: false, googleSheetUrl: GOOGLE_SHEET_WEB_APP_URL, syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES, isAutoSyncEnabled: true, showDecimalsInPos: false, isDemoModeEnabled: false, adminPin: '1111', menuGridColumns: 'auto', theme: 'theme-original', isSentinelLoggerEnabled: true,
        };
        const settingsResult = await db.settings.get('current');
        if (settingsResult) {
            const loadedSettings = { ...defaultSettings, ...settingsResult.value };
            get().setShopSettings(loadedSettings);
            if (loadedSettings.categoryOrder) {
                set({ categoryOrder: loadedSettings.categoryOrder }, false, 'initialize/loadCategoryOrder');
            }
        } else {
            get().setShopSettings(defaultSettings);
        }

        const offlineLogoResult = await db.keyValueStore.get('offline_receipt_logo');
        if (offlineLogoResult) {
            set({ offlineReceiptLogo: offlineLogoResult.value }, false, 'initialize/loadOfflineLogo');
        }

        const offlinePromoResult = await db.keyValueStore.get('offline_receipt_promo');
        if (offlinePromoResult) {
            set({ offlineReceiptPromo: offlinePromoResult.value }, false, 'initialize/loadOfflinePromo');
        }

        const todayStr = getYYYYMMDD(new Date());
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        
        const todayOrders = await db.orders.where('timestamp').aboveOrEqual(startOfDay).toArray();
        const completedOrders = todayOrders.filter(o => o.status === 'completed' || o.status === 'cancelled');
        const kitchenOrders = todayOrders.filter(o => o.status === 'cooking' || o.status === 'ready') as KitchenOrder[];

        const currentShift = await db.shifts.get({ status: 'OPEN' });
        const activityLog = await db.systemLogs.where('timestamp').aboveOrEqual(startOfDay.toISOString()).reverse().toArray();

        set({ dailyData: { date: todayStr, completedOrders, kitchenOrders, activityLog, currentShift: currentShift || null } }, false, 'initialize/loadDailyData');
        
        if (process.env.API_KEY) {
            set({ ai: new GoogleGenAI({apiKey: process.env.API_KEY}) }, false, 'initialize/ai');
        }
        
        get().fetchMenuData();

        traceAction({ actionName: 'initializeData:end', stateAfter: get(), level: 'lifecycle' });
    },
});