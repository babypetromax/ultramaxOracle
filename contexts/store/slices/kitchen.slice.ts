/** @file contexts/store/slices/kitchen.slice.ts */
// FIX: Corrected import path for store types.
import { SentinelStateCreator, AppStore } from '../store.types';
import { KitchenTicket, Order } from '../../../types';

export interface KitchenSlice {
  kitchenTickets: KitchenTicket[];
  sendToKitchen: (order: Order) => void;
  updateTicketStatus: (ticketId: string, status: 'new' | 'preparing' | 'ready') => void;
}

export const createKitchenSlice: SentinelStateCreator<AppStore,KitchenSlice> = (set) => ({
  kitchenTickets: [],
  sendToKitchen: (order) => {
    const ticket: KitchenTicket = { id: `k_${order.id}`, orderId: order.id, items: order.items, status: 'new' };
    set(state => ({ kitchenTickets: [...state.kitchenTickets, ticket] }), false, 'kitchen/sendToKitchen');
    console.log(`[Chimera] Sent ticket ${ticket.id} to kitchen.`);
  },
  updateTicketStatus: (ticketId, status) => {
     set(state => ({
       kitchenTickets: state.kitchenTickets.map(t => t.id === ticketId ? { ...t, status } : t)
     }), false, 'kitchen/updateTicketStatus');
  },
});