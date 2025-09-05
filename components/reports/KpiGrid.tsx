// src/components/reports/KpiGrid.tsx
import React from 'react';
import { formatCurrency } from '../../helpers';
import { Order } from '../../types';

// Define a leaner SummaryData type for this component's needs
interface SummaryData {
    totalRevenue: number;
    netSales: number;
    totalBills: number;
    totalDiscount: number;
    discountedBillsCount: number;
    cancellationsCount: number;
    cancellationsTotal: number;
    totalCashRevenue: number;
    totalQrRevenue: number;
}

type ReportTab = 'summary' | 'products' | 'categories' | 'payment' | 'discounts' | 'cancelled' | 'history' | 'prepTime' | 'shift' | 'activity' | 'sentinel';

interface KpiGridProps {
    summaryData: SummaryData;
    setActiveTab: (tab: ReportTab) => void;
}

const KpiCard: React.FC<{
    title: string; value: string; subValue?: string; icon: string;
    color: 'purple' | 'blue' | 'yellow' | 'red' | 'green';
    onClick?: () => void;
}> = ({ title, value, subValue, icon, color, onClick }) => (
    <div
        className={`kpi-card ${onClick ? 'interactive' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : 'figure'}
    >
        <div className="kpi-card-header"><span className="kpi-card-title">{title}</span><span className="material-symbols-outlined">{icon}</span></div>
        <p className="kpi-card-value">{value}</p>
        {subValue && <p className="kpi-card-subvalue">{subValue}</p>}
        <div className={`kpi-card-accent ${color}`}></div>
    </div>
);

export const KpiGrid: React.FC<KpiGridProps> = ({ summaryData, setActiveTab }) => {
    const avgSalePerBill = summaryData.totalBills > 0 ? summaryData.netSales / summaryData.totalBills : 0;

    return (
        <div className="kpi-grid">
            <KpiCard title="ยอดขายสุทธิ" value={`฿${formatCurrency(summaryData.netSales)}`} subValue={`จากยอดขายรวม ฿${formatCurrency(summaryData.totalRevenue)}`} icon="monitoring" color="purple" onClick={() => setActiveTab('products')} />
            <KpiCard title="จำนวนบิล" value={summaryData.totalBills.toLocaleString()} subValue={`เฉลี่ย ฿${formatCurrency(avgSalePerBill)}/บิล`} icon="receipt_long" color="blue" onClick={() => setActiveTab('history')} />
            <KpiCard title="ยอดส่วนลด" value={`฿${formatCurrency(summaryData.totalDiscount)}`} subValue={`${summaryData.discountedBillsCount} บิล`} icon="percent" color="yellow" onClick={() => setActiveTab('discounts')} />
            <KpiCard title="บิลยกเลิก" value={summaryData.cancellationsCount.toLocaleString()} subValue={`มูลค่า ฿${formatCurrency(Math.abs(summaryData.cancellationsTotal))}`} icon="cancel" color="red" onClick={() => setActiveTab('cancelled')} />
            <KpiCard title="ยอดชำระเงินสด" value={`฿${formatCurrency(summaryData.totalCashRevenue)}`} icon="payments" color="green" onClick={() => setActiveTab('payment')} />
            <KpiCard title="ยอดชำระ QR" value={`฿${formatCurrency(summaryData.totalQrRevenue)}`} icon="qr_code_2" color="blue" onClick={() => setActiveTab('payment')} />
        </div>
    );
};
