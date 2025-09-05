/** @file contexts/store/slices/devices.slice.ts */
// FIX: Corrected import path for store types.
import { SentinelStateCreator, AppStore } from '../store.types';
import { Printer } from '../../../types';

export interface DevicesSlice {
  printers: Printer[];
  cashDrawerStatus: 'open' | 'closed';
  openCashDrawer: () => void;
  printReceipt: (orderId: string) => void;
}

export const createDevicesSlice: SentinelStateCreator<AppStore,DevicesSlice> = (set) => ({
  printers: [],
  cashDrawerStatus: 'closed',
  openCashDrawer: () => {
    set({ cashDrawerStatus: 'open' }, false, 'devices/openCashDrawer');
    console.log('[Chimera] COMMAND: OPEN CASH DRAWER');
    setTimeout(() => set({ cashDrawerStatus: 'closed' }, false, 'devices/autoCloseDrawer'), 5000);
  },
  printReceipt: (orderId) => {
    console.log(`[Chimera] COMMAND: PRINTING RECEIPT for order ${orderId}`);
  },
});