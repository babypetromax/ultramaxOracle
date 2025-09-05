import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { Pie } from 'react-chartjs-2';

interface SalesByPaymentReportProps {
    orders: Order[];
}

const SalesByPaymentReport: React.FC<SalesByPaymentReportProps> = ({ orders }) => {
    const paymentSales = useMemo(() => {
        const validOrders = orders.filter(o => o.status !== 'cancelled');
        const sales = { cash: { total: 0, count: 0}, qr: { total: 0, count: 0 } };
        validOrders.forEach(order => {
            if (order.total <= 0) return;
            if(order.paymentMethod === 'cash') {
                sales.cash.total += order.total;
                sales.cash.count++;
            } else {
                sales.qr.total += order.total;
                sales.qr.count++;
            }
        });
        return sales;
    }, [orders]);
    
    return (
         <div>
            <div className="report-header"><h1>ยอดขายตามประเภทการชำระเงิน</h1></div>
            <div className="summary-cards">
                <div className="summary-card"><div className="summary-card-title">เงินสด</div><div className="summary-card-value">฿{formatCurrency(paymentSales.cash.total)}</div><p>{paymentSales.cash.count} บิล</p></div>
                <div className="summary-card"><div className="summary-card-title">QR Code</div><div className="summary-card-value">฿{formatCurrency(paymentSales.qr.total)}</div><p>{paymentSales.qr.count} บิล</p></div>
            </div>
            <div className="chart-container">
               {(paymentSales.cash.count > 0 || paymentSales.qr.count > 0) ? (
                 <Pie options={{ responsive: true }} data={{labels: ['เงินสด', 'QR Code'], datasets: [{ label: 'จำนวนบิล', data: [paymentSales.cash.count, paymentSales.qr.count], backgroundColor: ['#34d399', '#60a5fa'] }]}} />
               ) : <p>ไม่มีข้อมูล</p>}
            </div>
        </div>
    )
};

export default SalesByPaymentReport;