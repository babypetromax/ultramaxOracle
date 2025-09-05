/**
 * @file contexts/store/slices/cart.slice.ts
 * @description State management for the Point of Sale (POS) cart.
 * @version 2.4.0 (Chimera - Sentinel Integrity Check)
 * @author UltraMax Devs Team
 */
import { AppStore, SentinelStateCreator } from '../store.types';
import { CartItem, MenuItem, Order, CashDrawerActivity } from '../../../types';
import { Logger } from '../../../services/loggingService';
import { db } from '../../../lib/posDB';
import { updateDailySummary } from '../../../services/summaryService';
import Dexie from 'dexie';
import { formatCurrency } from '../../../helpers';
import { traceAction } from '../../../lib/sentinelLogger';

export interface CartSlice {
    cart: CartItem[];
    discount: string;
    isVatEnabled: boolean;
    totalItems: number;
    totalPrice: number;
    setDiscount: (discount: string) => void;
    setIsVatEnabled: (enabled: boolean) => void;
    addToCart: (item: MenuItem) => void;
    removeFromCart: (itemId: number) => void;
    updateQuantity: (itemId: number, delta: number) => void;
    clearCart: () => void;
    handlePlaceOrder: (paymentMethod: 'cash' | 'qr', cashReceived?: number) => Promise<Order | null>;
}

let _showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void = (msg, type) => console.log(`[CART_SLICE_LOG] [${type?.toUpperCase()}] ${msg}`);
export const connectCartSliceNotification = (showNotification: any) => {
   _showNotification = showNotification;
};

const calculateTotals = (cart: CartItem[]) => {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { totalItems, totalPrice };
};

export const createCartSlice: SentinelStateCreator<AppStore, CartSlice> = (set, get) => ({
    cart: [],
    discount: '',
    isVatEnabled: true,
    totalItems: 0,
    totalPrice: 0,

    setDiscount: (discountInput) => {
        const subtotal = get().totalPrice;
        const originalDiscount = get().discount;
        let correctedDiscount = discountInput.trim();
        let notificationMessage: string | null = null;

        if (subtotal <= 0 && discountInput.trim() !== "") {
            _showNotification('ไม่สามารถให้ส่วนลดได้เนื่องจากตะกร้าสินค้าว่าง', 'warning');
            if (originalDiscount !== '') {
                set({ discount: '' }, false, 'cart/setDiscount');
            }
            return;
        }

        if (subtotal > 0) {
            if (correctedDiscount.endsWith('%')) {
                const percentageValue = parseFloat(correctedDiscount.slice(0, -1));
                if (!isNaN(percentageValue) && percentageValue > 100) {
                    notificationMessage = `ส่วนลดเปอร์เซ็นต์สูงสุดคือ 100%! ระบบปรับค่าให้โดยอัตโนมัติ`;
                    correctedDiscount = '100%';
                    Logger.warn('ACTION', 'Attempted to apply excessive percentage discount', {
                        enteredDiscount: discountInput,
                        correctedTo: '100%'
                    });
                }
            } else if (correctedDiscount) { 
                const numericValue = parseFloat(correctedDiscount);
                if (!isNaN(numericValue) && numericValue > subtotal) {
                    const maxDiscountFormatted = formatCurrency(subtotal);
                    notificationMessage = `ส่วนลดเกินยอดรวม! ระบบปรับส่วนลดสูงสุดให้เหลือ ฿${maxDiscountFormatted}`;
                    correctedDiscount = String(subtotal);
                     Logger.warn('ACTION', 'Attempted to apply excessive fixed discount', {
                        enteredDiscount: discountInput,
                        subtotal: subtotal,
                        correctedTo: correctedDiscount,
                    });
                }
            }
        }
        
        if (notificationMessage) {
            _showNotification(notificationMessage, 'error');
        }

        if (originalDiscount !== correctedDiscount) {
            set({ discount: correctedDiscount }, false, 'cart/setDiscount');
        }
    },
    setIsVatEnabled: (enabled) => set({ isVatEnabled: enabled }, false, 'cart/setIsVatEnabled'),
    
    addToCart: (item: MenuItem) => {
        Logger.action('Add to cart', { name: item.name, id: item.id });
        const existingItem = get().cart.find(cartItem => cartItem.id === item.id);
        if (!existingItem) {
            _showNotification(`เพิ่ม '${item.name}' ลงในตะกร้า`, 'success');
        }
        
        let updatedCart: CartItem[];
        if (existingItem) {
            updatedCart = get().cart.map(cartItem => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem);
        } else {
            updatedCart = [...get().cart, { ...item, quantity: 1 }];
        }
        
        const totals = calculateTotals(updatedCart);

        const recipe = get().getRecipeForMenuItem(item.id);
        if (recipe) {
          recipe.ingredients.forEach(ingredient => {
            get().deductStock(ingredient.stockItemId, ingredient.quantity);
          });
        }

        set({ cart: updatedCart, ...totals }, false, 'cart/addToCart');
    },

    removeFromCart: (itemId: number) => {
        Logger.action('Remove from cart', { id: itemId });
        const updatedCart = get().cart.filter(item => item.id !== itemId);
        const totals = calculateTotals(updatedCart);
        set({ cart: updatedCart, ...totals }, false, 'cart/removeFromCart');
    },

    updateQuantity: (itemId, delta) => {
        const itemInCart = get().cart.find(i => i.id === itemId);
        if (!itemInCart) return;
        
        Logger.action(delta > 0 ? 'Increase quantity' : 'Decrease quantity', { name: itemInCart.name });
        
        const newQuantity = itemInCart.quantity + delta;
        
        let updatedCart: CartItem[];
        if (newQuantity <= 0) {
            updatedCart = get().cart.filter(item => item.id !== itemId);
        } else {
            updatedCart = get().cart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
            if (delta > 0) {
                const recipe = get().getRecipeForMenuItem(itemId);
                if (recipe) {
                  recipe.ingredients.forEach(ingredient => {
                    get().deductStock(ingredient.stockItemId, ingredient.quantity);
                  });
                }
            }
        }
        
        const totals = calculateTotals(updatedCart);
        set({ cart: updatedCart, ...totals }, false, 'cart/updateQuantity');
    },

    clearCart: () => {
        Logger.action('Clear cart');
        set({ cart: [], discount: '', totalItems: 0, totalPrice: 0 }, false, 'cart/clearCart');
    },
    
    handlePlaceOrder: async (paymentMethod, cashReceived) => {
        const { cart, discount, isVatEnabled, shopSettings, dailyData } = get();
        if (cart.length === 0 || !dailyData?.currentShift) {
            _showNotification('ไม่สามารถบันทึกออเดอร์ได้: ตะกร้าว่างหรือกะยังไม่ถูกเปิด', 'error');
            return null;
        }
        const subtotal = get().totalPrice;
        const discountValue = discount.endsWith('%') ? subtotal * (parseFloat(discount.slice(0, -1)) / 100) : parseFloat(discount) || 0;
        const discountedSubtotal = subtotal - discountValue;
        const serviceChargeRate = shopSettings.isServiceChargeEnabled ? shopSettings.serviceChargeRatePercent / 100 : 0;
        const serviceChargeValue = discountedSubtotal * serviceChargeRate;
        const taxableAmount = discountedSubtotal + serviceChargeValue;
        const vatRate = isVatEnabled ? shopSettings.vatRatePercent / 100 : 0;
        const tax = taxableAmount * vatRate;
        const total = discountedSubtotal + serviceChargeValue + tax;
        const timestamp = new Date();
        const newOrder: Order = {
            id: await get().generateNewDailyId(),
            items: cart,
            subtotal, tax, discountValue, serviceChargeValue, total, timestamp, paymentMethod, vatRate, cashReceived,
            status: 'cooking',
            syncStatus: 'pending',
        };
        const saleActivity: CashDrawerActivity = {
            id: `act-${Date.now()}`,
            timestamp,
            type: 'SALE',
            amount: total,
            paymentMethod,
            description: `Sale for order #${newOrder.id}`,
            orderId: newOrder.id,
        };
        const updatedShift = {
            ...dailyData.currentShift,
            activities: [...dailyData.currentShift.activities, saleActivity],
        };
        try {
            // [DEEP FREEZE] The demo mode logic has been removed. All new orders now write to the production `db.orders` table.
            const dbTable = db.orders;
            
            await (db as Dexie).transaction('rw', [dbTable, db.shifts, db.dailySummary], async () => {
                await dbTable.add(newOrder);
                await db.shifts.put(updatedShift);
                await updateDailySummary(newOrder);
            });
            
            traceAction({
                slice: 'orders',
                actionName: 'handlePlaceOrder/success',
                level: 'info',
                payload: {
                    orderId: newOrder.id,
                    total: newOrder.total,
                    targetTable: 'orders'
                }
            }, get().shopSettings.isSentinelLoggerEnabled);
            
            set((state) => ({
                dailyData: {
                    ...state.dailyData!,
                    kitchenOrders: [...state.dailyData!.kitchenOrders, newOrder as any],
                    currentShift: updatedShift,
                    dataSync: new Date(),
                },
                reports: {
                    ...state.reports,
                    allOrders: [...state.reports.allOrders, newOrder],
                },
                cart: [],
                discount: '',
                totalItems: 0,
                totalPrice: 0,
            }), false, 'placeOrder');
            _showNotification(`สร้างออเดอร์ #${newOrder.id} สำเร็จ!`, 'success');
            Logger.action(`Create Order`, { total: newOrder.total, method: paymentMethod }, { transactionId: newOrder.id, shiftId: updatedShift.id });
            if (get().shopSettings.isAutoSyncEnabled) {
                get().syncOrders();
            }
            return newOrder;
        } catch (error) {
            _showNotification('เกิดข้อผิดพลาดในการบันทึกออเดอร์', 'error');
            Logger.error(`Failed to place order`, { error }, { transactionId: newOrder.id });
            return null;
        }
    },
});