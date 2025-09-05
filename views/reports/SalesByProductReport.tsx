import React, { useMemo, useState } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { Bar, Pie } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { useNotification } from '../../contexts/NotificationContext';

// --- TYPE DEFINITIONS ---
type ChartType = 'table' | 'bar' | 'pie';
type ProductSaleData = { name: string; category: string; quantity: number; total: number };
type SortKey = keyof ProductSaleData;
type SortDirection = 'asc' | 'desc';

// --- [AURA & JAXON'S ENHANCEMENT START] ---
// World-class utility to generate a consistent, beautiful, and accessible color palette for categories.
const generateCategoryColorMap = (products: ProductSaleData[]): Record<string, string> => {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const colorMap: Record<string, string> = {};
    const baseHue = 210; // A pleasant blue base
    const saturation = 60;
    const lightness = 85;
    const alpha = 0.25; // A subtle 25% background tint

    categories.forEach((category, index) => {
        const hue = (baseHue + (index * 45)) % 360; // 45-degree shift for distinct colors
        colorMap[category] = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    });
    return colorMap;
};
// --- [AURA & JAXON'S ENHANCEMENT END] ---


const getTodayString = () => new Date().toISOString().split('T')[0];

const ReportViewToggle: React.FC<{ chartType: ChartType; setChartType: (type: ChartType) => void; }> = ({ chartType, setChartType }) => (
    <div className="report-view-toggle">
        <button className={chartType === 'table' ? 'active' : ''} onClick={() => setChartType('table')}>
            <span className="material-symbols-outlined">table_rows</span>ตารางข้อมูล
        </button>
        <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')}>
            <span className="material-symbols-outlined">bar_chart</span>กราฟรายชั่วโมง
        </button>
        <button className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')}>
            <span className="material-symbols-outlined">pie_chart</span>สัดส่วนยอดขาย
        </button>
    </div>
);

const SalesProductTable: React.FC<{ products: ProductSaleData[] }> = ({ products }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'total', direction: 'desc' });
    
    // --- [AURA & JAXON'S ENHANCEMENT] Generate color map once ---
    const categoryColors = useMemo(() => generateCategoryColorMap(products), [products]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            if (sortConfig.key === 'category') {
                // When sorting by category, also sort by total within the category for better grouping
                if (a.category < b.category) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a.category > b.category) return sortConfig.direction === 'asc' ? 1 : -1;
                return b.total - a.total; // Always sort by total descending within the category
            }
            if (sortConfig.key === 'name') {
                const res = a[sortConfig.key].localeCompare(b[sortConfig.key], 'th-TH');
                return sortConfig.direction === 'asc' ? res : -res;
            }
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [products, sortConfig]);

    return (
        <table className="report-table">
            <thead>
                <tr>
                    <th>อันดับ</th>
                    <th onClick={() => requestSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>ชื่อสินค้า{getSortIcon('name')}</th>
                    <th onClick={() => requestSort('category')} style={{ cursor: 'pointer', userSelect: 'none' }}>หมวดหมู่{getSortIcon('category')}</th>
                    <th onClick={() => requestSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>จำนวนที่ขายได้{getSortIcon('quantity')}</th>
                    <th onClick={() => requestSort('total')} style={{ cursor: 'pointer', userSelect: 'none' }}>ยอดขายรวม{getSortIcon('total')}</th>
                </tr>
            </thead>
            <tbody>
                {sortedProducts.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีข้อมูลการขายสำหรับช่วงเวลานี้</td></tr>
                )}
                {sortedProducts.map((product, index) => (
                    // --- [AURA & JAXON'S ENHANCEMENT] Apply dynamic background color only when sorting by category ---
                    <tr key={product.name} style={{ backgroundColor: sortConfig.key === 'category' ? categoryColors[product.category] : 'transparent' }}>
                        <td>{index + 1}</td>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td>{product.quantity}</td>
                        <td>฿{formatCurrency(product.total)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};


const SalesByProductReport: React.FC<{ orders: Order[]; dynamicTitle?: string; forceView?: ChartType; }> = ({ orders, dynamicTitle, forceView }) => {
    const [internalChartType, setInternalChartType] = useState<ChartType>(forceView || 'table');
    const chartType = forceView || internalChartType;
    const setChartType = forceView ? () => {} : setInternalChartType;
    
    const { showNotification } = useNotification();
    
    const processedData = useMemo(() => {
        // [ULTRAMAX DEVS FIX]: Filter out both cancelled orders and the auto-generated reversal orders.
        const validOrders = orders.filter(o => o.status !== 'cancelled' && !o.reversalOf);
        const salesByProduct: { [key: string]: ProductSaleData } = {};

        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (!salesByProduct[item.name]) salesByProduct[item.name] = { name: item.name, category: item.category, quantity: 0, total: 0 };
                salesByProduct[item.name].quantity += item.quantity;
                salesByProduct[item.name].total += (item.price * item.quantity);
            });
        });
        return { productRanking: Object.values(salesByProduct) };
    }, [orders]);

    const handleExportCsv = () => {
        if (processedData.productRanking.length === 0) {
            showNotification('ไม่มีข้อมูลสำหรับส่งออก', 'warning'); return;
        }
        const headers = ['อันดับ', 'ชื่อสินค้า', 'หมวดหมู่', 'จำนวนที่ขายได้ (สุทธิ)', 'ยอดขายรวม (สุทธิ)'];
        const sortedForExport = [...processedData.productRanking].sort((a,b) => b.total - a.total);
        const csvContent = [headers.join(','), ...sortedForExport.map((p, index) => [index + 1, `"${p.name.replace(/"/g, '""')}"`, p.category, p.quantity, p.total.toFixed(2)].join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = getTodayString();
        a.href = url; a.download = `sales_by_product_${dateStr}.csv`;
        document.body.appendChild(a); a.click();
        URL.revokeObjectURL(url); document.body.removeChild(a);
        showNotification('ส่งออกข้อมูลเป็น CSV สำเร็จ!', 'success');
    };
    
    // --- HOURLY STACKED BAR CHART LOGIC ---
    const top5ProductNames = useMemo(() => {
        return [...processedData.productRanking]
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map(p => p.name);
    }, [processedData.productRanking]);
    
    const hourlyChartData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
        const hourlySales: { [hour: number]: { [productName: string]: number } } = {};
        hours.forEach(h => hourlySales[h] = {});
    
        const validOrders = orders.filter(o => o.status !== 'cancelled' && !o.reversalOf);
    
        validOrders.forEach(order => {
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
    
    const hourlyChartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const } },
        scales: {
            x: { stacked: true, title: { display: true, text: 'ชั่วโมง' } },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'ยอดขาย (บาท)' } }
        }
    };
    
    // --- PIE CHART LOGIC ---
    const top5ProductsForPie = useMemo(() => [...processedData.productRanking].sort((a,b) => b.total - a.total).slice(0, 5), [processedData.productRanking]);
    const pieChartData = { 
        labels: top5ProductsForPie.map(p => p.name), 
        datasets: [{ 
            label: 'ยอดขาย', 
            data: top5ProductsForPie.map(p => p.total), 
            backgroundColor: ['#818cf8', '#60a5fa', '#38bdf8', '#34d399', '#a7f3d0'], 
            borderWidth: 1 
        }] 
    };

    return (
        <div>
            <div className="report-header">
                <h1>{dynamicTitle || 'ยอดขายตามสินค้า'}</h1>
                 {!dynamicTitle && (
                     <button className="action-button secondary" onClick={handleExportCsv}>
                        <span className="material-symbols-outlined">download</span>ส่งออกข้อมูล (CSV)
                    </button>
                )}
            </div>
            
            {!forceView && <ReportViewToggle chartType={chartType} setChartType={setChartType} />}
            
             {chartType === 'bar' && (
                 <div className="chart-container" style={{height: '500px'}}>
                    <h3>ยอดขายรายชั่วโมง (Top 5 สินค้า)</h3>
                    <Bar options={hourlyChartOptions} data={hourlyChartData} />
                </div>
            )}
            {chartType === 'pie' && (
                <div className="chart-container" style={{maxWidth: '600px', margin: 'auto'}}>
                    <h3>สัดส่วนยอดขาย (5 อันดับแรก)</h3>
                    <Pie data={pieChartData} />
                </div>
            )}
            {chartType === 'table' && (
                <SalesProductTable products={processedData.productRanking} />
            )}
        </div>
    );
};

export default SalesByProductReport;