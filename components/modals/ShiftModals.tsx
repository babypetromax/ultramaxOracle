import React, { useState, useMemo } from 'react';
import { DailyData, CashDrawerActivity } from '../../types';
import { getYYYYMMDD, formatCurrency } from '../../helpers';
import { useApp } from '../../contexts/AppContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useConfirmation } from '../../contexts/ConfirmationContext';

// --- StartShiftModal ---
export const StartShiftModal: React.FC = () => {
    const { setShowStartShiftModal } = useApp();
    
    // === ULTRAMAX DEVS FIX: Use atomic selectors to prevent infinite loops ===
    const shiftHistory = useStore(state => state.shiftHistory);
    const handleStartShift = useStore(state => state.handleStartShift);

    const [amount, setAmount] = useState('');
    const todayShifts = useMemo(() => {
        const todayStr = getYYYYMMDD(new Date());
        return shiftHistory.filter(s => s.id.startsWith(todayStr));
    }, [shiftHistory]);

    return (
        <div className="modal-overlay" onClick={() => setShowStartShiftModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2 className="modal-title">เปิดกะการขายที่ {todayShifts.length + 1}</h2><button type="button" className="close-modal-btn" onClick={() => setShowStartShiftModal(false)}>&times;</button></div>
                <form onSubmit={(e) => { e.preventDefault(); handleStartShift(parseFloat(amount) || 0); setShowStartShiftModal(false); }}>
                    <div className="form-group">
                        <label htmlFor="openingFloat">ยอดเงินสดเริ่มต้น (เงินทอน)</label>
                        <input type="number" id="openingFloat" value={amount} onChange={e => setAmount(e.target.value)} autoFocus required min="0" step="any" className="cash-input" />
                    </div>
                    <div className="modal-footer">
                       <button type="submit" className="action-button" disabled={!amount}>ยืนยันและเปิดกะ</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

// --- PaidInOutModal ---
export const PaidInOutModal: React.FC = () => {
    const { setShowPaidInOutModal } = useApp();
    const handlePaidInOut = useStore(state => state.handlePaidInOut);
    const [type, setType] = useState<'PAID_IN' | 'PAID_OUT'>('PAID_OUT');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handlePaidInOut({ type, amount: parseFloat(amount), description });
        setShowPaidInOutModal(false);
    };

    return (
        <div className="modal-overlay" onClick={() => setShowPaidInOutModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2 className="modal-title">นำเงินเข้า/ออก</h2><button type="button" className="close-modal-btn" onClick={() => setShowPaidInOutModal(false)}>&times;</button></div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>ประเภทรายการ</label>
                        <div className="payment-methods">
                            <button type="button" className={`payment-method-btn paid-in ${type === 'PAID_IN' ? 'active' : ''}`} onClick={() => setType('PAID_IN')}><span className="material-symbols-outlined">add_card</span> นำเงินเข้า</button>
                            <button type="button" className={`payment-method-btn paid-out ${type === 'PAID_OUT' ? 'active' : ''}`} onClick={() => setType('PAID_OUT')}><span className="material-symbols-outlined">payments</span> นำเงินออก</button>
                        </div>
                    </div>
                     <div className="form-group">
                        <label htmlFor="p_amount">จำนวนเงิน</label>
                        <input type="number" id="p_amount" value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="any" className="cash-input" />
                    </div>
                     <div className="form-group">
                        <label htmlFor="p_desc">หมายเหตุ (เช่น ซื้อน้ำแข็ง)</label>
                        <input type="text" id="p_desc" value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                     <div className="modal-footer">
                       <button type="submit" className="action-button" disabled={!amount || !description}>บันทึกรายการ</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

// --- EndShiftModal ---
export const EndShiftModal: React.FC = () => {
    const { setShowEndShiftModal } = useApp();
    
    // === ULTRAMAX DEVS FIX: Use atomic selectors to prevent infinite loops ===
    const currentShift = useStore(state => state.dailyData?.currentShift);
    const handleEndShift = useStore(state => state.handleEndShift);
    const showConfirmation = useConfirmation();
    
    // Shift summary logic is co-located here as it's only used for this modal.
    const shiftSummaryData = useMemo(() => {
        if (!currentShift) return null;
   
        const summary = {
            totalCashSales: 0,
            totalQrSales: 0,
            totalPaidIn: 0,
            totalPaidOut: 0,
            expectedCashInDrawer: currentShift.openingFloatAmount,
        };
   
        for (const act of currentShift.activities) {
            switch (act.type) {
                case 'SALE':
                    if (act.paymentMethod === 'cash') summary.totalCashSales += act.amount;
                    else if (act.paymentMethod === 'qr') summary.totalQrSales += act.amount;
                    break;
                case 'PAID_IN':
                    summary.totalPaidIn += act.amount;
                    break;
                case 'PAID_OUT':
                    summary.totalPaidOut += act.amount;
                    break;
                case 'REFUND':
                     if (act.paymentMethod === 'cash') summary.totalPaidOut += act.amount; // Refund amount is positive, add to total paid out
                     break;
            }
        }
       
        summary.expectedCashInDrawer = currentShift.openingFloatAmount
                                     + summary.totalCashSales
                                     + summary.totalPaidIn
                                     - summary.totalPaidOut;
   
        return summary;
    }, [currentShift]);

    const [counted, setCounted] = useState<string>('');
    const [nextShift, setNextShift] = useState<string>('');
    
    if (!shiftSummaryData || !currentShift) return null;
    
    const countedNum = parseFloat(counted) || 0;
    const overShort = countedNum - shiftSummaryData.expectedCashInDrawer;

    const handleConfirmClick = async () => {
        const confirmed = await showConfirmation({
            title: 'ยืนยันการปิดกะ',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการปิดกะการขาย? การกระทำนี้ไม่สามารถย้อนกลับได้',
        });
        if (confirmed) {
            handleEndShift({ counted: countedNum, nextShift: parseFloat(nextShift) || 0 });
            setShowEndShiftModal(false);
        }
    };

    const handleClose = () => setShowEndShiftModal(false);

    return (
         <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                 <div className="modal-header"><h2 className="modal-title">ปิดกะและสรุปยอด</h2><button type="button" className="close-modal-btn" onClick={handleClose}>&times;</button></div>
                 <div className="modal-content-body">
                    <h3>สรุปยอดจากระบบ</h3>
                    <div className="end-shift-summary-grid">
                       <div className="end-shift-summary-item"><span>เงินทอนเริ่มกะ</span><span>฿{formatCurrency(currentShift.openingFloatAmount || 0)}</span></div>
                       <div className="end-shift-summary-item"><span>ยอดขายเงินสด</span><span>฿{formatCurrency(shiftSummaryData.totalCashSales)}</span></div>
                       <div className="end-shift-summary-item"><span>นำเงินเข้า</span><span>฿{formatCurrency(shiftSummaryData.totalPaidIn)}</span></div>
                       <div className="end-shift-summary-item"><span>นำเงินออก/คืนเงิน (เงินสด)</span><span>-฿{formatCurrency(shiftSummaryData.totalPaidOut)}</span></div>
                    </div>
                    <div className="end-shift-summary-item total" style={{borderTop: '2px solid var(--primary-color)', paddingTop: '0.5rem'}}><span>เงินสดที่ควรมีในลิ้นชัก</span><span>฿{formatCurrency(shiftSummaryData.expectedCashInDrawer)}</span></div>
                    
                    <div style={{borderTop: '1px solid var(--border-color)', margin: '1.5rem 0'}}></div>

                    <h3>การนับและจัดการเงินสด</h3>
                    <div className="form-group">
                        <label htmlFor="countedCash">ยอดเงินสดที่นับได้จริง</label>
                        <input type="number" id="countedCash" value={counted} onChange={e => setCounted(e.target.value)} required min="0" step="any" className="cash-input" autoFocus/>
                    </div>
                     {counted && (
                        <div className="end-shift-summary-item">
                            <span>เงินขาด/เกิน</span>
                            <span className={`over-short-value ${overShort > 0 ? 'over' : overShort < 0 ? 'short' : 'even'}`}>
                                ฿{formatCurrency(overShort)}
                            </span>
                        </div>
                     )}

                     <div className="form-group">
                        <label htmlFor="nextShiftCash">เก็บเงินสดไว้สำหรับกะถัดไป</label>
                        <input type="number" id="nextShiftCash" value={nextShift} onChange={e => setNextShift(e.target.value)} required min="0" step="any" className="cash-input"/>
                    </div>
                    {counted && nextShift && (
                         <div className="end-shift-summary-item total"><span>ยอดเงินสดที่ต้องนำส่ง</span><span>฿{formatCurrency(countedNum - (parseFloat(nextShift) || 0))}</span></div>
                    )}
                 </div>

                 <div className="modal-footer">
                    <button type="button" className="action-button danger-button" onClick={handleConfirmClick} disabled={!counted.trim() || !nextShift.trim()}>ยืนยันและปิดกะ</button>
                 </div>
            </div>
        </div>
    )
};