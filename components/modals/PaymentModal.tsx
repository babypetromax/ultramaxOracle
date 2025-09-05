import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useNotification } from '../../contexts/NotificationContext';

// --- ULTRAMAX DEVS EDIT START: Smart Suggestion Logic ---
// This world-class, offline-first algorithm generates smart cash suggestions
// based on the total amount, mirroring common payment scenarios and Thai banknotes.
const getCashSuggestions = (total: number): number[] => {
    if (total <= 0) return [];
    const suggestions = new Set<number>();
    const ceiledTotal = Math.ceil(total);

    // 1. Always suggest the exact amount for quick entry
    suggestions.add(ceiledTotal);

    // 2. Suggest the next logical rounded numbers and common banknotes
    const roundingTargets = total < 100 
        ? [10, 50, 100, 500] 
        : total < 1000 
            ? [50, 100, 500, 1000] 
            : [100, 500, 1000];

    for (const target of roundingTargets) {
        if (suggestions.size >= 5) break; // Collect a few more to ensure we have enough unique ones
        const roundedUp = Math.ceil(ceiledTotal / target) * target;
        if (roundedUp >= ceiledTotal) {
            suggestions.add(roundedUp);
        }
    }
    
    // 3. For larger amounts, ensure the next thousand is an option
    if (total > 1000) {
        const nextThousand = Math.ceil(ceiledTotal / 1000) * 1000;
        suggestions.add(nextThousand > ceiledTotal ? nextThousand : nextThousand + 1000);
    }

    // 4. Clean up, sort, and return up to 4 of the best suggestions
    const finalSuggestions = Array.from(suggestions).filter(s => s >= ceiledTotal);
    return finalSuggestions.sort((a, b) => a - b).slice(0, 4);
};
// --- ULTRAMAX DEVS EDIT END ---


const PaymentModal: React.FC = () => {
    // AppContext is still used for controlling UI state (modals)
    const { setShowPaymentModal, setReceiptData, setShowReceiptModal } = useApp();
    const { showNotification } = useNotification();
    
    // === ULTRAMAX DEVS FIX: Use atomic selectors to prevent infinite loops ===
    const cart = useStore(state => state.cart);
    const discount = useStore(state => state.discount);
    const isVatEnabled = useStore(state => state.isVatEnabled);
    const handlePlaceOrder = useStore(state => state.handlePlaceOrder);
    const shopSettings = useStore(state => state.shopSettings);


    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
    // Calculations are now derived from the store's state
    const cartCalculations = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
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
    }, [cart, discount, isVatEnabled, shopSettings]);

    const { total } = cartCalculations;
    const change = parseFloat(cashReceived) - total;

    // --- ULTRAMAX DEVS EDIT START: Memoize suggestions ---
    const cashSuggestions = useMemo(() => getCashSuggestions(total), [total]);
    // --- ULTRAMAX DEVS EDIT END ---

    const handleConfirm = async () => {
        setIsPlacingOrder(true);
        try {
            const newOrder = await handlePlaceOrder(paymentMethod, cashReceived ? parseFloat(cashReceived) : undefined);

            if (newOrder) {
                // [PROJECT CLARITY & PRECISION] - Add notification
                if (paymentMethod === 'cash' && cashReceived) {
                    const receivedNum = parseFloat(cashReceived);
                    showNotification(
                        `รับเงิน: ฿${receivedNum.toFixed(2)}, ทอน: ฿${change.toFixed(2)}`,
                        'info',
                        12000
                    );
                } else if (paymentMethod === 'qr') {
                     showNotification(
                        `ยอดชำระ QR: ฿${total.toFixed(2)}`,
                        'success',
                        12000
                    );
                }

                setShowPaymentModal(false);
                setReceiptData({ ...newOrder, cashReceived: cashReceived ? parseFloat(cashReceived) : undefined });
                setShowReceiptModal(true);
            }
        } finally {
            setIsPlacingOrder(false);
        }
    }
    
    return (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content payment-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">การชำระเงิน</h2>
                    <button className="close-modal-btn" onClick={() => setShowPaymentModal(false)}>&times;</button>
                </div>

                <div className="payment-modal-body">
                    <div className="payment-total">
                        <p>ยอดที่ต้องชำระ</p>
                        <h3>฿{total.toFixed(2)}</h3>
                    </div>
                    <div className="payment-methods">
                        <button className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}><span className="material-symbols-outlined">payments</span> เงินสด</button>
                        <button className={`payment-method-btn ${paymentMethod === 'qr' ? 'active' : ''}`} onClick={() => setPaymentMethod('qr')}><span className="material-symbols-outlined">qr_code_2</span> QR Code</button>
                    </div>
                    
                    {paymentMethod === 'cash' && (
                        <div className="cash-input-area">
                            <label htmlFor="cashReceived">รับเงินสด</label>
                            {cashSuggestions.length > 0 && (
                                <div className="cash-suggestion-pills">
                                    {cashSuggestions.map(amount => (
                                        <button
                                            key={amount}
                                            className="cash-pill"
                                            onClick={() => setCashReceived(String(amount))}
                                        >
                                            ฿{new Intl.NumberFormat('th-TH').format(amount)}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <input id="cashReceived" type="number" className="cash-input" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="0.00" autoFocus />
                        </div>
                    )}
                    
                    <div className="main-display-area">
                        {paymentMethod === 'qr' && (
                            <div className="qr-area">
                                <span className="material-symbols-outlined" style={{fontSize: '4rem'}}>qr_code_2</span>
                                <p>สแกน QR code เพื่อชำระเงิน</p>
                            </div>
                        )}
                        {paymentMethod === 'cash' && (
                            <div className="change-display">
                                <p>เงินทอน</p>
                                <span className="change-amount">
                                    {(change >= 0 && cashReceived) ? `฿${change.toFixed(2)}` : '฿0.00'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="payment-modal-footer">
                    <button className="confirm-payment-btn" onClick={handleConfirm} disabled={isPlacingOrder || (paymentMethod === 'cash' && (change < 0 || cashReceived === ''))}>
                        ยืนยันการชำระเงิน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;