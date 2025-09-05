// src/views/reports/ReceiptsHistory.tsx
import React, { useState, Fragment } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { useConfirmation } from '../../contexts/ConfirmationContext';

// [ULTRAMAX DEVS] No changes needed to this interface, it's already perfect.
interface SummaryData {
    totalRevenue: number;
    totalCashRevenue: number;
    totalQrRevenue: number;
    cancellationsTotal: number;
    cancellationsCount: number;
    netSales: number;
    totalDiscount: number;
}

interface ReceiptsHistoryProps {
    orders: Order[]; // This will now receive the pre-filtered orders from ReportsScreen
    summaryData: SummaryData; // This will also be pre-calculated for the date range
    BillDetailsComponent: React.FC<{ order: Order }>;
    onCancelBill: (order: Order) => Promise<void>;
    isAdminMode: boolean;
}

const formatSecondsToMinutes = (seconds: number | undefined) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
};

// [ULTRAMAX DEVS] No logic changes are needed here. The component now correctly displays
// whatever filtered data it receives from its parent.
const ReceiptsHistory: React.FC<ReceiptsHistoryProps> = ({ orders, summaryData, BillDetailsComponent, onCancelBill, isAdminMode }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const showConfirmation = useConfirmation();

    const handleCancelClick = async (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        const confirmed = await showConfirmation({
            title: 'ยืนยันการยกเลิกบิล',
            message: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบิล #${order.id}? การกระทำนี้จะสร้างบิลติดลบเพื่อปรับยอดขายและไม่สามารถย้อนกลับได้`
        });
        if (confirmed) {
            onCancelBill(order);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* The main header is now in ReportsScreen.tsx, so we don't need one here. */}
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                <table className="report-table">
                    <thead><tr><th>เลขที่บิล</th><th>เวลา</th><th>ยอดรวม</th><th>ส่วนลด</th><th>เวลาที่ใช้</th><th>การชำระเงิน</th><th>สถานะ</th><th></th></tr></thead>
                    <tbody>
                        {orders.length === 0 && (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีข้อมูลใบเสร็จในช่วงวันที่ที่เลือก</td></tr>
                        )}
                        {orders.map(order => (
                            <Fragment key={order.id}>
                                <tr className={`expandable-row ${order.status === 'cancelled' ? 'cancelled-bill' : ''} ${order.total < 0 ? 'reversal-bill' : ''}`} onClick={() => order.status !== 'cancelled' && setExpandedId(prev => prev === order.id ? null : order.id)}>
                                    <td>{order.id} <span className={`chevron ${expandedId === order.id ? 'expanded' : ''}`}></span></td>
                                    <td>{new Date(order.timestamp).toLocaleString('th-TH')}</td>
                                    <td>฿{formatCurrency(order.total)}</td>
                                    <td className="discount-value">
                                        {order.discountValue > 0 ? `-฿${formatCurrency(order.discountValue)}` : '-'}
                                    </td>
                                    <td>{formatSecondsToMinutes(order.preparationTimeInSeconds)}</td>
                                    <td>{order.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}</td>
                                    <td style={{ display: 'flex', gap: '0.25rem' }}>
                                    <span className={`status-tag status-${order.status}`}>
                                        {order.status === 'completed' ? (order.reversalOf ? 'คืนเงิน' : 'สำเร็จ') : 'ยกเลิก'}
                                    </span>
                                    {order.discountValue > 0 && <span className="status-tag status-discount">ส่วนลด</span>}
                                    </td>
                                    <td>
                                        {isAdminMode && order.status === 'completed' && order.total > 0 && (
                                            <button className="delete-bill-btn" title="ยกเลิกบิล" onClick={(e) => handleCancelClick(e, order)}>
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {expandedId === order.id && <tr><td colSpan={8}><BillDetailsComponent order={order} /></td></tr>}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="report-summary-footer">
                <div className="report-summary-footer-inner">
                    <div className="summary-item-v2">
                        <span className="summary-label">ยอดขาย QR Code</span>
                        <span className="summary-value qr-sales">฿{formatCurrency(summaryData.totalQrRevenue)}</span>
                    </div>
                    <div className="summary-item-v2">
                        <span className="summary-label">ยอดขายเงินสด</span>
                        <span className="summary-value cash-sales">฿{formatCurrency(summaryData.totalCashRevenue)}</span>
                    </div>
                     <div className="summary-item-v2">
                        <span className="summary-label">ยอดส่วนลด</span>
                        <span className="summary-value" style={{ color: 'var(--danger-color)' }}>฿{formatCurrency(summaryData.totalDiscount)}</span>
                    </div>
                    <div className="summary-item-v2">
                        <span className="summary-label">ยอดบิลยกเลิก{summaryData.cancellationsCount > 0 && (<span className="cancellation-badge-v2" title={`${summaryData.cancellationsCount} บิล`}>{summaryData.cancellationsCount}</span>)}</span>
                        <span className="summary-value" style={{ color: 'var(--danger-color)' }}>฿{formatCurrency(summaryData.cancellationsTotal)}</span>
                    </div>
                    <div className="summary-item-v2">
                        <span className="summary-label">ยอดขายสุทธิ</span>
                        <span className="summary-value" style={{ color: 'var(--success-color)' }}>฿{formatCurrency(summaryData.netSales)}</span>
                    </div>
                </div>
            </footer>
        </div>
    )
};

export default ReceiptsHistory;