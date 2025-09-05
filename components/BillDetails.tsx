import React from 'react';
import { Order } from '../types';
import { formatCurrency } from '../helpers';

interface BillDetailsProps {
    order: Order;
}

const BillDetails: React.FC<BillDetailsProps> = ({ order }) => (
    <td colSpan={8} className="receipt-details-cell">
        <div className="receipt-details-content">
            <ul className="receipt-item-list">
                {order.items.map(item => (
                    <li key={item.id}>
                        <span>{item.quantity} x {item.name}</span>
                        <span>฿{formatCurrency(item.quantity * item.price)}</span>
                    </li>
                ))}
            </ul>
            <div className="receipt-summary">
                <div><span>ยอดรวม</span> <span>฿{formatCurrency(order.subtotal)}</span></div>
                {order.discountValue > 0 && <div><span>ส่วนลด</span> <span>-฿{formatCurrency(order.discountValue)}</span></div>}
                {order.serviceChargeValue > 0 && <div><span>ค่าบริการ</span> <span>฿{formatCurrency(order.serviceChargeValue)}</span></div>}
                {order.tax > 0 && <div><span>ภาษี ({(order.vatRate * 100).toFixed(0)}%)</span> <span>฿{formatCurrency(order.tax)}</span></div>}
                <div className="receipt-total"><span>ยอดสุทธิ</span> <span>฿{formatCurrency(order.total)}</span></div>
                
                {/* === ULTRAMAX DEVS FIX: RESTORE CASH TRANSACTION DETAILS === */}
                {order.paymentMethod === 'cash' && typeof order.cashReceived === 'number' && (
                    <div className="receipt-payment-info">
                        <div><span>รับเงินสด</span> <span>฿{formatCurrency(order.cashReceived)}</span></div>
                        <div><span>เงินทอน</span> <span>฿{formatCurrency(order.cashReceived - order.total)}</span></div>
                    </div>
                )}
                {/* === END OF FIX === */}
            </div>
        </div>
    </td>
);

export default BillDetails;