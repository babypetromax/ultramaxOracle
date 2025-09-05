import React, { useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useNotification } from '../../contexts/NotificationContext';
import { Logger } from '../../services/loggingService';
import { formatCurrency } from '../../helpers';

// [HYDRA V1.1 HOTFIX] Add className prop
const OrderPanel: React.FC<{ className?: string }> = ({ className }) => {
    const { isOrderPanelOpen, setIsOrderPanelOpen, setShowPaymentModal, setShowStartShiftModal } = useApp();
    const { showNotification } = useNotification();

    // === ULTRAMAX DEVS FIX: Use atomic selectors to prevent infinite loops ===
    const cart = useStore(state => state.cart);
    const discount = useStore(state => state.discount);
    const setDiscount = useStore(state => state.setDiscount);
    const isVatEnabled = useStore(state => state.isVatEnabled);
    const setIsVatEnabled = useStore(state => state.setIsVatEnabled);
    const clearCart = useStore(state => state.clearCart);
    const updateQuantity = useStore(state => state.updateQuantity);
    const currentShift = useStore(state => state.dailyData?.currentShift);
    const shopSettings = useStore(state => state.shopSettings);
    // [CHIMERA PHASE 4] Get new state from the independent cart slice
    const totalItems = useStore(state => state.totalItems);
    const subtotalFromStore = useStore(state => state.totalPrice);


    const cartCalculations = React.useMemo(() => {
        const subtotal = subtotalFromStore;
        
        // --- [PROJECT GUARDIAN FIX] START ---
        const potentialDiscount = (discount.endsWith('%')
            ? subtotal * (parseFloat(discount.slice(0, -1)) / 100)
            : parseFloat(discount) || 0);
        const discountValue = Math.max(0, Math.min(potentialDiscount, subtotal));
        // --- [PROJECT GUARDIAN FIX] END ---

        const discountedSubtotal = subtotal - discountValue;

        const serviceChargeRate = shopSettings.isServiceChargeEnabled ? shopSettings.serviceChargeRatePercent / 100 : 0;
        const serviceChargeValue = discountedSubtotal * serviceChargeRate;

        const taxableAmount = discountedSubtotal + serviceChargeValue;
        const vatRate = isVatEnabled ? shopSettings.vatRatePercent / 100 : 0;
        const tax = taxableAmount * vatRate;

        const total = discountedSubtotal + serviceChargeValue + tax;
        return { subtotal, tax, discountValue, serviceChargeValue, total: total < 0 ? 0 : total };
    }, [subtotalFromStore, discount, isVatEnabled, shopSettings]);
    
    const isShiftOpen = !!currentShift;

    return (
        <aside className={`order-panel ${isOrderPanelOpen ? 'is-open' : ''} ${className || ''}`}>
            <header className="order-header">
                {/* [CHIMERA PHASE 4] Display total item count from the store */}
                <h2>ตะกร้าสินค้า ({totalItems} รายการ)</h2>
                 <div className="order-header-actions">
                    {cart.length > 0 && <button className="clear-cart-btn" onClick={clearCart}>ล้างทั้งหมด</button>}
                    <button className="close-panel-btn" onClick={() => setIsOrderPanelOpen(false)}>&times;</button>
                </div>
            </header>
            <div className="cart-items-container">
                {cart.length === 0 ? (
                    <p className="cart-empty-message">คลิกที่สินค้าเพื่อเพิ่มลงในออเดอร์</p>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="cart-item">
                           <div className="cart-item-info">
                                <p className="cart-item-name">{item.name}</p>
                                <p className="cart-item-price">฿{item.price.toFixed(2)}</p>
                            </div>
                            <div className="cart-item-quantity">
                                <button className="quantity-btn" onClick={() => updateQuantity(item.id, -1)}>−</button>
                                <span className="quantity-value">{item.quantity}</span>
                                <button className="quantity-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                            </div>
                            <div className="cart-item-total">฿{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    ))
                )}
            </div>
            {(cart.length > 0 || !isShiftOpen) && (
                <div className="order-summary">
                    {isShiftOpen && cart.length > 0 && (
                        <>
                            <div className="summary-row"><span>ยอดรวม</span><span>฿{cartCalculations.subtotal.toFixed(2)}</span></div>
                            <div className="summary-row">
                                <label htmlFor="discount" className="discount-label">ส่วนลด</label>
                                <input type="text" id="discount" className="discount-input" placeholder="เช่น 50 หรือ 10%" value={discount} onChange={(e) => setDiscount(e.target.value)}/>
                            </div>
                            {cartCalculations.discountValue > 0 && <div className="summary-row"><span>ใช้ส่วนลดแล้ว</span><span>-฿{cartCalculations.discountValue.toFixed(2)}</span></div>}
                            
                            {shopSettings.isServiceChargeEnabled && (
                                <div className="summary-row">
                                    <span>ค่าบริการ ({shopSettings.serviceChargeRatePercent}%)</span>
                                    <span>฿{cartCalculations.serviceChargeValue.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="summary-row">
                                <div className="vat-toggle">
                                    <span>ภาษีมูลค่าเพิ่ม (VAT {shopSettings.vatRatePercent}%)</span>
                                    <label className="switch"><input type="checkbox" checked={isVatEnabled} onChange={() => setIsVatEnabled(!isVatEnabled)} /><span className="slider"></span></label>
                                </div>
                            </div>
                            {isVatEnabled && <div className="summary-row"><span>ภาษี ({shopSettings.vatRatePercent}%)</span><span>฿{cartCalculations.tax.toFixed(2)}</span></div>}
                            <div className="summary-row total"><span>ยอดสุทธิ</span><span>฿{cartCalculations.total.toFixed(2)}</span></div>
                        </>
                    )}
                    <button 
                        className="charge-btn" 
                        onClick={() => isShiftOpen ? setShowPaymentModal(true) : setShowStartShiftModal(true)} 
                        disabled={isShiftOpen && cart.length === 0}
                        style={{backgroundColor: isShiftOpen ? '' : 'var(--primary-color)'}}
                    >
                        {isShiftOpen 
                            ? `ชำระเงิน ฿${cartCalculations.total.toFixed(2)}` 
                            : 'เปิดกะการขาย'
                        }
                    </button>
                </div>
            )}
        </aside>
    );
};

export default OrderPanel;