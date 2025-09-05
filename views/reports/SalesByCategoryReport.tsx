import React, { useMemo } from 'react';
import { Order } from '../../types';
import { Bar } from 'react-chartjs-2';

interface SalesByCategoryReportProps {
    orders: Order[];
}

const SalesByCategoryReport: React.FC<SalesByCategoryReportProps> = ({ orders }) => {
    const categorySales = useMemo(() => {
        // [ULTRAMAX DEVS FIX]: Filter out both cancelled orders and the auto-generated reversal orders.
        const validOrders = orders.filter(o => o.status !== 'cancelled' && !o.reversalOf);
        const sales: { [key: string]: { name: string, quantity: number, total: number } } = {};
        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (!sales[item.category]) sales[item.category] = { name: item.category, quantity: 0, total: 0 };
                sales[item.category].quantity += item.quantity;
                sales[item.category].total += (item.price * item.quantity);
            });
        });
        return Object.values(sales).sort((a, b) => b.total - a.total);
    }, [orders]);

     return (
        <div>
            <div className="report-header"><h1>ยอดขายตามหมวดหมู่</h1></div>
            <div className="chart-container">
                {categorySales.length > 0 ? (
                    <Bar options={{ responsive: true, plugins: { legend: { display: false } } }} data={{
                        labels: categorySales.map(c => c.name),
                        datasets: [{ label: 'ยอดขาย (บาท)', data: categorySales.map(c => c.total), backgroundColor: '#818cf8' }]
                    }}/>
                ) : <p>ไม่มีข้อมูล</p>}
            </div>
        </div>
    );
};

export default SalesByCategoryReport;