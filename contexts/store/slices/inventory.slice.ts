/** @file contexts/store/slices/inventory.slice.ts */
// FIX: Corrected import path for store types.
import { SentinelStateCreator, AppStore } from '../store.types';
import { StockItem } from '../../../types';

export interface InventorySlice {
  stockItems: StockItem[];
  deductStock: (itemId: number, amount: number) => void;
}

export const createInventorySlice: SentinelStateCreator<AppStore,InventorySlice> = (set, get) => ({
  stockItems: [
    { id: 101, name: 'แป้งทาโกะยากิ (g)', supplier: 'Supplier A', costPerUnit: 0.1, unit: 'g', quantity: 5000 },
    { id: 102, name: 'ปลาหมึกยักษ์ (g)', supplier: 'Supplier B', costPerUnit: 0.5, unit: 'g', quantity: 2000 },
    { id: 103, name: 'ซอสทาโกะยากิ (ml)', supplier: 'Supplier A', costPerUnit: 0.2, unit: 'ml', quantity: 1000 },
  ],
  deductStock: (itemId: number, amount: number) => {
    set((state) => ({
      stockItems: state.stockItems.map(item =>
        item.id === itemId ? { ...item, quantity: item.quantity - amount } : item
      ),
    }), false, `inventory/deductStock`);
  },
});