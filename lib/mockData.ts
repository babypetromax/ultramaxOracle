import { MenuItem, Order, CartItem } from '../types';

// =================================================================
// [CEO DIRECTIVE - DEEP FREEZE]
// The entire Demo System is now deprecated and frozen.
// This function is permanently disabled to prevent accidental data generation.
// =================================================================
/*
// Helper to get a random element from an array
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a random number in a range
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

// A simple ID generator for the mock orders
const generateOrderId = (date: Date, sequence: number): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}-${String(sequence).padStart(4, '0')}`;
};

// --- START: DEMO DATA GENERATION ENGINE ---
// This engine provides realistic-looking sales data for the past 90 days (excluding today).

export const generateMockSalesData = (menuItems: MenuItem[]): Order[] => {
    if (!menuItems || menuItems.length === 0) {
        return [];
    }

    const mockOrders: Order[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the beginning of the day

    // Generate data for the last 90 days, starting from yesterday
    for (let i = 1; i <= 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dailyTargetRevenue = randomInt(5000, 20000);
        let currentDailyRevenue = 0;
        let dailyOrderCount = 1;

        while (currentDailyRevenue < dailyTargetRevenue) {
            const itemsInOrderCount = randomInt(1, 5);
            const cart: CartItem[] = [];

            for (let k = 0; k < itemsInOrderCount; k++) {
                const menuItem = getRandom(menuItems);
                const existingItem = cart.find(item => item.id === menuItem.id);
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({ ...menuItem, quantity: randomInt(1, 2) });
                }
            }

            const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            
            // 15% chance of a discount
            const hasDiscount = Math.random() < 0.15; 
            const discountValue = hasDiscount ? parseFloat((subtotal * (randomInt(5, 15) / 100)).toFixed(2)) : 0;
            const discountedSubtotal = subtotal - discountValue;
            
            const vatRate = 0.07;
            const tax = parseFloat((discountedSubtotal * vatRate).toFixed(2));
            const total = discountedSubtotal + tax;

            // Simulate a timestamp within the working hours of that day (9 AM to 9 PM)
            const timestamp = new Date(date);
            timestamp.setHours(randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));
            
            const readyAt = new Date(timestamp.getTime() + randomInt(90, 600) * 1000); // 1.5 to 10 minutes prep time
            const preparationTimeInSeconds = (readyAt.getTime() - timestamp.getTime()) / 1000;

            const isCancelled = Math.random() < 0.05; // 5% chance of being cancelled

            const order: Order = {
                id: generateOrderId(date, dailyOrderCount++),
                items: cart,
                subtotal,
                tax,
                serviceChargeValue: 0,
                discountValue,
                total,
                timestamp,
                paymentMethod: Math.random() > 0.4 ? 'cash' : 'qr',
                vatRate,
                status: isCancelled ? 'cancelled' : 'completed',
                cancelledAt: isCancelled ? new Date(timestamp.getTime() + randomInt(300, 1800) * 1000) : undefined,
                syncStatus: 'synced',
                readyAt: isCancelled ? undefined : readyAt,
                preparationTimeInSeconds: isCancelled ? undefined : preparationTimeInSeconds,
            };

            mockOrders.push(order);
            currentDailyRevenue += isCancelled ? 0 : total;
        }
    }

    return mockOrders;
};
*/