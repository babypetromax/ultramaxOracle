export interface MenuItem {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    offlineImage?: string;
    cardGradient?: string; // [Elysium] For custom card backgrounds when no image is present.
}

export interface CartItem extends MenuItem {
    quantity: number;
}

export interface Order {
    id: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    serviceChargeValue: number;
    discountValue: number;
    total: number;
    timestamp: Date;
    paymentMethod: 'cash' | 'qr';
    cashReceived?: number;
    vatRate: number;
    status: 'cooking' | 'ready' | 'completed' | 'cancelled';
    cancelledAt?: Date;
    syncStatus: 'pending' | 'synced' | 'failed';
    reversalOf?: string;
    readyAt?: Date;
    preparationTimeInSeconds?: number;
    
    // --- LEVIATHAN UPGRADE: FUTURE-PROOFING FIELDS ---
    shiftId?: string;       // ID ของกะที่เกิดรายการขาย
    staffId?: string;       // ID ของพนักงานที่ทำรายการ
    customerId?: string;    // ID ของลูกค้า (สำหรับระบบสมาชิก)
}

export interface KitchenOrder extends Omit<Order, 'status'> {
    status: 'cooking' | 'ready';
}

export interface SystemLog {
    id?: number;
    timestamp: string; // ISO 8601 format
    type: 'PAGE_VIEW' | 'ACTION' | 'AI' | 'ERROR' | 'SYSTEM';
    level: 'INFO' | 'WARN' | 'CRITICAL';
    message: string;
    details?: object;
}

export interface ShopSettings {
    shopName: string;
    address: string;
    phone: string;
    taxId: string;
    isVatDefaultEnabled: boolean;
    vatRatePercent: number;
    isServiceChargeEnabled: boolean;
    serviceChargeRatePercent: number;
    cookingTimeThresholdMinutes: number;
    delayedTimeThresholdMinutes: number;
    logoUrl: string;
    promoUrl: string;
    headerText: string;
    footerText: string;
    logoSizePercent: number;
    promoSizePercent: number;
    receiptTopMargin: number;
    receiptBottomMargin: number;
    receiptLineSpacing: number;
    interactionMode: 'desktop' | 'touch';
    isKeyboardNavEnabled: boolean;
    googleSheetUrl?: string;
    syncIntervalMinutes: number;
    isAutoSyncEnabled: boolean;
    showDecimalsInPos?: boolean;
    isDemoModeEnabled?: boolean;
    adminPin: string;
    menuGridColumns?: number | 'auto';
    categoryOrder?: string[]; // [V9.95] For admin-defined category sorting
    posViewMode?: 'grid' | 'list'; // [PROJECT EON V2] For Desktop view switching
    // --- PROJECT CHROMA ADDITION ---
    theme: string; // e.g., 'theme-original', 'theme-zenith', 'theme-evergreen'
    isSentinelLoggerEnabled?: boolean;
}

export interface CashDrawerActivity {
    id: string;
    timestamp: Date;
    type: 'SHIFT_START' | 'SALE' | 'REFUND' | 'PAID_IN' | 'PAID_OUT' | 'SHIFT_END' | 'MANUAL_OPEN';
    amount: number;
    paymentMethod: 'cash' | 'qr' | 'none';
    description: string;
    orderId?: string;
}

export interface Shift {
    id: string;
    status: 'OPEN' | 'CLOSED';
    startTime: Date;
    endTime?: Date;
    openingFloatAmount: number;
    closingCashCounted?: number;
    expectedCashInDrawer?: number;
    cashOverShort?: number;
    totalSales?: number;
    totalCashSales?: number;
    totalQrSales?: number;
    totalPaidIn?: number;
    totalPaidOut?: number;
    cashToDeposit?: number;
    cashForNextShift?: number;
    activities: CashDrawerActivity[];
}

export interface DailySummary {
    date: string; // Primary key, format: 'YYYY-MM-DD'
    totalSales: number;
    transactionCount: number;
}

export interface DailyData {
    date: string;
    completedOrders: Order[];
    kitchenOrders: KitchenOrder[];
    activityLog: SystemLog[];
    currentShift: Shift | null;
    dataSync?: Date;
}

export type TraceLevel = 'info' | 'warn' | 'error' | 'lifecycle' | 'environment' | 'console';

export interface SentinelLogEntry {
    id: number;
    timestamp: Date;
    actionName: string;
    level: TraceLevel;
    payload?: string;
    stateBefore?: string;
    stateAfter?: string;
    componentStack?: string;
    durationMs?: number;
    slice?: string;
}

// --- HYDRA PROTOCOL TYPES ---
export interface StaffMember {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'manager' | 'supervisor' | 'cashier' | 'staff';
}

export interface Promotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_amount' | 'bogo';
  value: number;
  scope: 'order' | 'item';
  itemId?: number;
}

// --- LEVIATHAN PROTOCOL TYPES ---
export interface StockItem {
    id: number;
    name: string;
    supplier: string;
    quantity: number;
    unit: 'kg' | 'g' | 'litre' | 'ml' | 'piece';
    costPerUnit: number;
}

export interface Recipe {
    menuItemId: number;
    ingredients: {
        stockItemId: number;
        quantity: number;
    }[];
}

export interface Printer {
    id: string;
    name: string;
    type: 'receipt' | 'kitchen';
    ipAddress: string;
    status: 'online' | 'offline';
}

export interface KitchenTicket {
    id: string;
    orderId: string;
    items: CartItem[];
    status: 'new' | 'preparing' | 'ready';
}