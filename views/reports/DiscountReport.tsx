import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';

interface DiscountReportProps {
    orders: Order[];
}

const DiscountReport: React.FC<DiscountReportProps> = ({ orders }) => {
    const discountedOrders = useMemo(() => orders.filter(o => o.discountValue > 0 && o.status !== 'cancelled'), [orders]);
    const totalDiscount = useMemo(() => discountedOrders.reduce((sum, o) => sum + o.discountValue, 0), [discountedOrders]);

    return (
        <div>
            <div className="report-header"><h1>รายงานส่วนลด</h1></div>
             <div className="summary-cards">
                <div className="summary-card"><div className="summary-card-title">ส่วนลดทั้งหมด</div><div className="summary-card-value">฿{formatCurrency(totalDiscount)}</div></div>
                <div className="summary-card"><div className="summary-card-title">จำนวนบิลที่ใช้ส่วนลด</div><div className="summary-card-value">{discountedOrders.length}</div></div>
            </div>
            <table className="report-table">
                <thead><tr><th>เลขที่บิล</th><th>เวลา</th><th>ยอดก่อนลด</th><th>ส่วนลด</th><th>ยอดสุทธิ</th></tr></thead>
                <tbody>
                    {discountedOrders.map(order => (
                        <tr key={order.id}>
                            <td>{order.id}</td>
                            <td>{new Date(order.timestamp).toLocaleString('th-TH')}</td>
                            <td>฿{formatCurrency(order.subtotal)}</td>
                            <td>-฿{formatCurrency(order.discountValue)}</td>
                            <td>฿{formatCurrency(order.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
};

export default DiscountReport;