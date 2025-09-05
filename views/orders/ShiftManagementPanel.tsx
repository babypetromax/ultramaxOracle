import React, { useMemo } from 'react';
import { formatCurrency, getYYYYMMDD } from '../../helpers';
import { MAX_SHIFTS_PER_DAY } from '../../constants';
import { useApp } from '../../contexts/AppContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import OpenDrawerButton from '../pos/components/OpenDrawerButton';

const ShiftManagementPanel: React.FC = () => {
    const { setShowStartShiftModal, setShowPaidInOutModal, setShowEndShiftModal } = useApp();
    
    // Atomic selectors are already a best practice here.
    const currentShift = useStore(state => state.dailyData?.currentShift);
    const completedOrders = useStore(state => state.dailyData?.completedOrders);
    const shiftHistory = useStore(state => state.shiftHistory);

    const shiftSummaryData = useMemo(() => {
        // 1. DEPENDENCY REFINEMENT: The calculation now directly depends on the refined state variables.
        if (!currentShift) return null;
   
        const summary = {
            totalSales: 0,
            totalCashSales: 0,
            totalQrSales: 0,
            totalCancellationsValue: 0,
            netSales: 0,
            totalPaidIn: 0,
            totalPaidOut: 0,
            expectedCashInDrawer: currentShift.openingFloatAmount,
        };

        const shiftOrderIds = new Set(currentShift.activities.filter(a => a.type === 'SALE').map(a => a.orderId));
        const shiftCancelledOrderIds = new Set(currentShift.activities.filter(a => a.type === 'REFUND').map(a => a.orderId));

        // Use the completedOrders selector which is more stable than the whole dailyData object.
        const shiftOrders = (completedOrders || []).filter(o => shiftOrderIds.has(o.id) || shiftCancelledOrderIds.has(o.id));

        for (const order of shiftOrders) {
             if (order.status === 'cancelled') {
                summary.totalCancellationsValue += order.total;
            } else if (!order.reversalOf) {
                 summary.totalSales += order.total;
                if (order.paymentMethod === 'cash') {
                    summary.totalCashSales += order.total;
                } else {
                    summary.totalQrSales += order.total;
                }
            }
        }
        summary.netSales = summary.totalSales;

        for (const act of currentShift.activities) {
            switch (act.type) {
                case 'PAID_IN':
                    summary.totalPaidIn += act.amount;
                    break;
                case 'PAID_OUT':
                    summary.totalPaidOut += act.amount;
                    break;
                case 'REFUND':
                    if (act.paymentMethod === 'cash') {
                        summary.totalPaidOut += act.amount;
                    }
                    break;
            }
        }
        
        summary.expectedCashInDrawer = currentShift.openingFloatAmount
                                     + summary.totalCashSales
                                     + summary.totalPaidIn
                                     - summary.totalPaidOut;

        return summary;
    // 2. The dependency array is now more specific, preventing re-calculation if other parts of dailyData change.
    }, [currentShift, completedOrders]);

    const todaysShifts = useMemo(() => {
        const todayStr = getYYYYMMDD(new Date());
        return shiftHistory.filter(s => s.id.startsWith(todayStr));
    }, [shiftHistory]);

    if (!currentShift && todaysShifts.length >= MAX_SHIFTS_PER_DAY) {
         return (
            <div className="shift-management-panel">
                <div className="shift-start-screen">
                    <span className="material-symbols-outlined">event_busy</span>
                    <p>เปิดกะการขายสำหรับวันนี้ครบจำนวนสูงสุดแล้ว</p>
                </div>
            </div>
        )
    }

    if (!currentShift) {
        return (
            <div className="shift-management-panel">
                <div className="shift-start-screen">
                    <span className="material-symbols-outlined">storefront</span>
                    <p>ยังไม่มีการเปิดกะการขายสำหรับวันนี้</p>
                    <button className="action-button" onClick={() => setShowStartShiftModal(true)}>
                        <span className="material-symbols-outlined">play_circle</span> เปิดกะที่ {todaysShifts.length + 1}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="shift-management-grid">
            <div className="current-shift-summary">
                <div className="shift-header-info">
                    <h3><span className="material-symbols-outlined">monitoring</span> กะปัจจุบัน: <strong>{currentShift.id.slice(-2)}</strong></h3>
                    <p>เริ่มเมื่อ: <strong>{new Date(currentShift.startTime).toLocaleTimeString('th-TH')}</strong></p>
                </div>

                <h4 style={{marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>สรุปยอดขาย (เฉพาะกะนี้)</h4>
                <div className="summary-item-list">
                    <div className="summary-item"><span>ยอดขายรวม</span> <span>฿{formatCurrency(shiftSummaryData?.netSales + shiftSummaryData?.totalCancellationsValue || 0)}</span></div>
                    <div className="summary-item"><span>ยอดขาย QR</span> <span className="qr-sales">฿{formatCurrency(shiftSummaryData?.totalQrSales || 0)}</span></div>
                    <div className="summary-item"><span>ยอดขายเงินสด</span> <span className="cash-sales">฿{formatCurrency(shiftSummaryData?.totalCashSales || 0)}</span></div>
                    <div className="summary-item"><span>ยอดบิลยกเลิก</span> <span style={{color: 'var(--danger-color)'}}>-฿{formatCurrency(Math.abs(shiftSummaryData?.totalCancellationsValue || 0))}</span></div>
                    <div className="summary-item total" style={{color: 'var(--success-color)'}}><span>ยอดขายสุทธิ (กะนี้)</span> <span>฿{formatCurrency(shiftSummaryData?.netSales || 0)}</span></div>
                </div>

                <h4 style={{marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>ลิ้นชักเงินสด</h4>
                 <div className="summary-item-list">
                    <div className="summary-item"><span>เงินทอนเริ่มกะ</span> <span>฿{formatCurrency(currentShift.openingFloatAmount)}</span></div>
                    <div className="summary-item"><span>นำเงินเข้า/ออก</span> <span>฿{formatCurrency((shiftSummaryData?.totalPaidIn || 0) - (shiftSummaryData?.totalPaidOut || 0))}</span></div>
                    <div className="summary-item total"><span>เงินสดที่ควรมี (คาดการณ์)</span> <span>฿{formatCurrency(shiftSummaryData?.expectedCashInDrawer || 0)}</span></div>
                </div>

                <div className="shift-actions">
                    <OpenDrawerButton />
                    <button className="action-button" onClick={() => setShowPaidInOutModal(true)}>
                       <span className="material-symbols-outlined">swap_horiz</span> นำเงินเข้า/ออก
                    </button>
                    <button className="action-button danger-button" onClick={() => setShowEndShiftModal(true)}>
                       <span className="material-symbols-outlined">stop_circle</span> ปิดกะการขาย
                    </button>
                </div>
            </div>
            <div className="shift-history-grid">
                {Array.from({ length: MAX_SHIFTS_PER_DAY }, (_, i) => {
                    const shiftNumber = i + 1;
                    const shiftIdSuffix = `-S${shiftNumber}`;
                    const closedShift = todaysShifts.find(s => s.id.endsWith(shiftIdSuffix));
                    const isActive = currentShift.id.endsWith(shiftIdSuffix);

                    if (isActive) {
                        return (
                            <div key={shiftNumber} className="shift-history-card active">
                                <div className="card-header">
                                    <h4>กะ {shiftNumber} (กำลังดำเนินการ)</h4>
                                    <span>{new Date(currentShift.startTime).toLocaleTimeString('th-TH')} - ปัจจุบัน</span>
                                </div>
                                <div className="card-body">
                                    <div><span>เงินทอนเริ่มกะ:</span> <span>฿{formatCurrency(currentShift.openingFloatAmount)}</span></div>
                                    <div><span>ยอดขายเงินสด:</span> <span>฿{formatCurrency(shiftSummaryData?.totalCashSales || 0)}</span></div>
                                    <div><span>ยอดขาย QR:</span> <span>฿{formatCurrency(shiftSummaryData?.totalQrSales || 0)}</span></div>
                                    <div className="cancellation-summary"><span>ยอดคืนเงิน (เงินสด):</span> <span>-฿{formatCurrency(shiftSummaryData?.totalCancellationsValue || 0)}</span></div>
                                    <div className="total"><span>เงินสดคาดการณ์:</span> <span>฿{formatCurrency(shiftSummaryData?.expectedCashInDrawer || 0)}</span></div>
                                </div>
                            </div>
                        );
                    }

                    if (closedShift) {
                        return (
                            <div key={shiftNumber} className="shift-history-card closed">
                                <div className="card-header">
                                    <h4>กะ {shiftNumber} (ปิดแล้ว)</h4>
                                    <span>{new Date(closedShift.startTime).toLocaleTimeString('th-TH')} - {closedShift.endTime ? new Date(closedShift.endTime).toLocaleTimeString('th-TH') : ''}</span>
                                </div>
                                <div className="card-body">
                                    <div><span>เงินเริ่มต้น:</span> <span>฿{formatCurrency(closedShift.openingFloatAmount)}</span></div>
                                    <div><span>ยอดขายเงินสด:</span> <span>฿{formatCurrency(closedShift.totalCashSales || 0)}</span></div>
                                    <div><span>ยอดขาย QR:</span> <span>฿{formatCurrency(closedShift.totalQrSales || 0)}</span></div>
                                    <div className="cancellation-summary"><span>ยอดบิลยกเลิก:</span> <span>-฿{formatCurrency((closedShift as any).totalCancellationsValue || 0)}</span></div>
                                    <div className="total"><span>เงินสดที่นับได้:</span> <span>฿{formatCurrency(closedShift.closingCashCounted || 0)}</span></div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={shiftNumber} className="shift-history-card placeholder">
                            <div className="card-header"><h4>กะ {shiftNumber}</h4></div>
                            <div className="card-body"><p>ยังไม่เปิด</p></div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
};

export default ShiftManagementPanel;