/** @file contexts/store/slices/orders.slice.ts */
// FIX: Corrected import path for store types.
import { SentinelStateCreator, AppStore } from '../store.types';
import { Order } from '../../../types';

export interface OrdersSlice {
  orders: Order[];
  createOrderFromCart: () => Order | null;
  updateOrderStatus: (orderId: string, status: 'cooking' | 'ready' | 'completed' | 'cancelled') => void;
}

export const createOrdersSlice: SentinelStateCreator<AppStore,OrdersSlice> = (set, get) => ({
  orders: [],
  createOrderFromCart: () => {
    const { cart, totalPrice } = get();
    if (cart.length === 0) return null;
    
    // Create a new order object that matches the existing, more complex Order type
    const newOrder: Order = { 
        id: `ord_${Date.now()}`, 
        items: cart, 
        status: 'cooking', 
        total: totalPrice,
        subtotal: totalPrice, // Placeholder
        tax: 0, // Placeholder
        serviceChargeValue: 0, // Placeholder
        discountValue: 0, // Placeholder
        timestamp: new Date(),
        paymentMethod: 'cash', // Placeholder
        vatRate: 0, // Placeholder
        syncStatus: 'pending' // Default
    };
    
    set(state => ({ orders: [...state.orders, newOrder] }), false, 'orders/createOrderFromCart');
    get().clearCart(); // Important: Clear cart after creating order
    console.log(`[Chimera] Created order ${newOrder.id}`);
    return newOrder;
  },
  updateOrderStatus: (orderId, status) => {
    set(state => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
    }), false, 'orders/updateOrderStatus');
  },
});