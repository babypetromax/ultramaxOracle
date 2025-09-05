import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';

interface CancelledBillsReportProps {
    orders: Order[];
}

const CancelledBillsReport: React.FC<CancelledBillsReportProps> = ({ orders }) => {
    const cancelled = useMemo(() => orders.filter(o => o.status === 'cancelled').sort((a,b) => (b.cancelledAt ? new Date(b.cancelledAt).getTime() : 0) - (a.cancelledAt ? new Date(a.cancelledAt).getTime() : 0)), [orders]);

    const totalCancelledValue = useMemo(() => cancelled.reduce((sum, order) => sum + order.total, 0), [cancelled]);

    return (
        <div>
            <div className="report-header"><h1>รายงานการลบบิล</h1></div>
            {/* ULTRAMAX DEVS: "PROJECT CLARITY" FIX START --- */}
            {/* Adding summary cards for a clear overview */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-title">ยอดรวมที่ยกเลิก</div>
                    <div className="summary-card-value" style={{color: 'var(--danger-color)'}}>฿{formatCurrency(totalCancelledValue)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">จำนวนบิลที่ยกเลิก</div>
                    <div className="summary-card-value">{cancelled.length}</div>
                </div>
            </div>
            {/* ULTRAMAX DEVS: "PROJECT CLARITY" FIX END --- */}
            <table className="report-table">
                <thead><tr><th>เลขที่บิล</th><th>เวลาที่สร้าง</th><th>เวลายกเลิก</th><th>ยอดรวม</th></tr></thead>
                <tbody>
                    {cancelled.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center'}}>ไม่มีบิลที่ถูกยกเลิก</td></tr>}
                    {cancelled.map(order => (
                        <tr key={order.id} className="cancelled-bill">
                            <td>{order.id}</td>
                            <td>{new Date(order.timestamp).toLocaleString('th-TH')}</td>
                            <td>{order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('th-TH') : 'N/A'}</td>
                            <td>฿{formatCurrency(order.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CancelledBillsReport;