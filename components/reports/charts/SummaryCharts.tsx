// src/components/reports/charts/SummaryCharts.tsx
import React, { useMemo, useState } from 'react';
import { Order } from '../../../types';
import { Bar } from 'react-chartjs-2';
import { ChartOptions, ScriptableContext } from 'chart.js';

interface SummaryChartsProps {
    orders: Order[];
}

type ProductSaleData = { name: string; category: string; quantity: number; total: number };

export const SummaryCharts: React.FC<SummaryChartsProps> = ({ orders }) => {
    const [expandedChart, setExpandedChart] = useState<'daily' | 'hourly' | null>(null);

    const dailyChartData = useMemo(() => {
        const dailySales: { [key: string]: number } = {};
        const filtered = orders.filter(o => o.status !== 'cancelled' && !o.reversalOf);
        for (const order of filtered) {
            const day = new Date(order.timestamp).toISOString().split('T')[0];
            dailySales[day] = (dailySales[day] || 0) + order.total;
        }
        const sortedDailyData = Object.entries(dailySales).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
        
        return {
            labels: sortedDailyData.map(d => new Date(d[0]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })),
            datasets: [{
                label: 'ยอดขายสุทธิ',
                data: sortedDailyData.map(d => d[1]),
                backgroundColor: (context: ScriptableContext<'bar'>) => {
                    const { ctx, chartArea } = context.chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.6)');
                    gradient.addColorStop(1, 'rgba(129, 140, 248, 0.8)');
                    return gradient;
                },
                borderRadius: 4,
            }]
        };
    }, [orders]);

    const top5ProductNames = useMemo(() => {
        const salesByProduct: { [key: string]: ProductSaleData } = {};
        orders.filter(o => o.status !== 'cancelled' && !o.reversalOf).forEach(order => {
            order.items.forEach(item => {
                if (!salesByProduct[item.name]) salesByProduct[item.name] = { name: item.name, category: item.category, quantity: 0, total: 0 };
                salesByProduct[item.name].quantity += item.quantity;
                salesByProduct[item.name].total += (item.price * item.quantity);
            });
        });
        return Object.values(salesByProduct).sort((a, b) => b.total - a.total).slice(0, 5).map(p => p.name);
    }, [orders]);

    const hourlyChartData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const hourlySales: { [hour: number]: { [productName: string]: number } } = {};
        hours.forEach(h => hourlySales[h] = {});

        orders.filter(o => o.status !== 'cancelled' && !o.reversalOf).forEach(order => {
            const hour = new Date(order.timestamp).getHours();
            order.items.forEach(item => {
                if (top5ProductNames.includes(item.name)) {
                    hourlySales[hour][item.name] = (hourlySales[hour][item.name] || 0) + (item.price * item.quantity);
                }
            });
        });
        const colors = ['#818cf8', '#60a5fa', '#38bdf8', '#34d399', '#a7f3d0'];
        return {
            labels: hours.map(h => `${String(h).padStart(2, '0')}:00`),
            datasets: top5ProductNames.map((name, index) => ({
                label: name,
                data: hours.map(h => hourlySales[h][name] || 0),
                backgroundColor: colors[index % colors.length],
                stack: 'sales',
            })),
        };
    }, [orders, top5ProductNames]);

    const chartOptions: ChartOptions<'bar'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
    const hourlyChartOptions: ChartOptions<'bar'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' as const } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };

    const DailyChartComponent = <div className="chart-render-area">{orders.length > 0 ? <Bar options={chartOptions} data={dailyChartData} /> : <p className="chart-empty-message">ไม่มีข้อมูล</p>}</div>;
    const HourlyChartComponent = <div className="chart-render-area">{orders.length > 0 ? <Bar options={hourlyChartOptions} data={hourlyChartData} /> : <p className="chart-empty-message">ไม่มีข้อมูล</p>}</div>;

    return (
        <>
            <div className="summary-charts-grid">
                <div className="chart-wrapper">
                    <div className="chart-header-controls">
                        <h3>ภาพรวมยอดขายรายวัน</h3>
                        <button className="expand-btn" onClick={() => setExpandedChart('daily')}><span className="material-symbols-outlined">open_in_full</span></button>
                    </div>
                    {DailyChartComponent}
                </div>
                <div className="chart-wrapper">
                    <div className="chart-header-controls">
                        <h3>ยอดขายรายชั่วโมง (Top 5)</h3>
                        <button className="expand-btn" onClick={() => setExpandedChart('hourly')}><span className="material-symbols-outlined">open_in_full</span></button>
                    </div>
                    {HourlyChartComponent}
                </div>
            </div>
            {expandedChart && (
                <div className="chart-modal-overlay" onClick={() => setExpandedChart(null)}>
                    <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="chart-modal-header">
                            <h2>{expandedChart === 'daily' ? 'ภาพรวมยอดขายรายวัน' : 'ยอดขายรายชั่วโมง (Top 5 สินค้า)'}</h2>
                            <button className="close-modal-btn" onClick={() => setExpandedChart(null)}>&times;</button>
                        </div>
                        <div className="chart-modal-body">
                            {expandedChart === 'daily' && DailyChartComponent}
                            {expandedChart === 'hourly' && HourlyChartComponent}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
