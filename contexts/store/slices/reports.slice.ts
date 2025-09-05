/** 
 * @file contexts/store/slices/reports.slice.ts 
 * @description Project Chronos & Oracle: Centralized data provider for all reports.
 */
import { SentinelStateCreator, AppStore } from '../store.types';
import { Order } from '../../../types';
import { db } from '../../../lib/posDB';
import { traceAction } from '../../../lib/sentinelLogger';

export interface ReportsSlice {
  allOrders: Order[];
  isHistoryLoading: boolean;
  error: string | null;
  fetchAllOrderHistory: () => Promise<void>;
}

export const createReportsSlice: SentinelStateCreator<AppStore,ReportsSlice> = (set, get) => ({
  allOrders: [],
  isHistoryLoading: true, // Start in loading state
  error: null,

  fetchAllOrderHistory: async () => {
    traceAction({ slice: 'reports', actionName: 'fetchAllOrderHistoryStart', level: 'lifecycle' });
    set(state => ({
        reports: {
            ...state.reports,
            isHistoryLoading: true,
            error: null,
        }
    }), false, 'reports/fetchAllOrderHistory/loading');

    try {
      // [DEEP FREEZE] Demo mode logic is removed. Always fetch from live 'orders' table.
      const ordersFromDB = await db.orders.toArray();
      
      set(state => ({
        reports: {
            ...state.reports,
            allOrders: ordersFromDB,
            isHistoryLoading: false,
        }
      }), false, 'reports/fetchAllOrderHistory/success');

      traceAction({
        slice: 'reports',
        actionName: 'fetchAllOrderHistorySuccess',
        payload: { orderCount: ordersFromDB.length, demoMode: false },
        level: 'lifecycle'
      });
    } catch (error) {
      console.error("Project Oracle/Chronos: Failed to fetch report data:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      set(state => ({
        reports: {
            ...state.reports,
            isHistoryLoading: false,
            error: errorMessage,
        }
      }), false, 'reports/fetchAllOrderHistory/error');
      traceAction({ slice: 'reports', actionName: 'fetchAllOrderHistoryFailed', payload: { error }, level: 'error' });
    }
  },
});