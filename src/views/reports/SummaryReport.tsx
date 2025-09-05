// src/views/reports/SummaryReport.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { GoogleGenAI } from '@google/genai';
import { Bar } from 'react-chartjs-2';
import { ChartOptions, ScriptableContext } from 'chart.js';
import { useNotification } from '../../contexts/NotificationContext';
import ErrorBoundary from '../../lib/ErrorBoundary';
import { traceAction } from '../../lib/sentinelLogger';
import { runAnomalyDetection, Anomaly } from '../../services/aiAnalysisService';
import { useStore } from '../../contexts/store/index';

type ReportTab = 'summary' | 'products' | 'categories' | 'payment' | 'discounts' | 'cancelled' | 'history' | 'prepTime' | 'shift' | 'activity' | 'sentinel';

interface SummaryData {
    totalRevenue: number;
    totalCashRevenue: number;
    totalQrRevenue: number;
    cancellationsTotal: number;
    cancellationsCount: number;
    netSales: number;
    totalDiscount: number;
    discountedBillsCount: number;
    totalBills: number;
}
interface SummaryReportProps {
    orders: Order[];
    ai: GoogleGenAI | null;
    summaryData: SummaryData;
    setActiveTab: (tab: ReportTab) => void;
}
type ProductSaleData = { name: string; category: string; quantity: number; total: number };

const KpiCard: React.FC<{
    title: string;
    value: string;
    subValue?: string;
    icon: string;
    color: 'purple' | 'blue' | 'yellow' | 'red' | 'green';
    onClick?: () => void;
}> = ({ title, value, subValue, icon, color, onClick }) => (
    <div
        className={`kpi-card ${onClick ? 'interactive' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : 'figure'}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(); }}
    >
        <div className="kpi-card-header"><span className="kpi-card-title">{title}</span><span className="material-symbols-outlined">{icon}</span></div>
        <p className="kpi-card-value">{value}</p>
        {subValue && <p className="kpi-card-subvalue">{subValue}</p>}
        <div className={`kpi-card-accent ${color}`}></div>
    </div>
);

const OracleAlerts: React.FC<{ alerts: Anomaly[]; isLoading: boolean; isVisible: boolean; }> = ({ alerts, isLoading, isVisible }) => {
    if (!isVisible) return null;

    const getIcon = (type: Anomaly['type']) => {
        const iconMap = {
            SalesDip: 'trending_down',
            ProductSpike: 'local_fire_department',
            QuietHours: 'bedtime',
            PositiveTrend: 'trending_up',
        };
        return iconMap[type] || 'auto_awesome';
    };

    const getSeverityClass = (severity: Anomaly['severity']) => {
        return `severity-${severity}`;
    };

    return (
        <div className="oracle-container">
            {isLoading && <div className="oracle-loading">
                <span className="material-symbols-outlined sync-icon pending">psychology</span>
                <span>Oracle is analyzing...</span>
            </div>}

            {!isLoading && alerts.map((alert, index) => (
                <div key={index} className={`oracle-card ${getSeverityClass(alert.severity)}`}>
                    <div className="oracle-card-header">
                        <span className="material-symbols-outlined">{getIcon(alert.type)}</span>
                        <h4>{alert.type.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    </div>
                    <p className="oracle-finding">{alert.finding}</p>
                    <p className="oracle-recommendation"><strong>Suggestion:</strong> {alert.recommendation}</p>
                </div>
            ))}
        </div>
    );
};

const SummaryReportContent: React.FC<SummaryReportProps> = ({ orders, summaryData, ai, setActiveTab }) => {
    const isSentinelLoggerEnabled = useStore(state => state.shopSettings.isSentinelLoggerEnabled);
    
    traceAction({
        slice: 'reports-data',
        actionName: 'kpiDataCalculated',
        payload: { 
            orderCount: orders.length, 
            calculatedNetSales: summaryData.netSales 
        },
        level: 'lifecycle'
    }, isSentinelLoggerEnabled);

    const { showNotification } = useNotification();
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [expandedChart, setExpandedChart] = useState<'daily' | 'hourly' | null>(null);
    
    const isAdminMode = useStore(state => state.isAdminMode);
    const [oracleAlerts, setOracleAlerts] = useState<Anomaly[]>([]);
    const [isOracleLoading, setIsOracleLoading] = useState(false);
    
    const avgSalePerBill = summaryData.totalBills > 0 ? summaryData.netSales / summaryData.totalBills : 0;

    const reportData = useMemo(() => {
        const dailySales: { [key: string]: { netSales: number, discount: number } } = {};
        const filteredOrders = orders.filter(o => o.status !== 'cancelled' && !o.reversalOf);

        for (const order of filteredOrders) {
            const day = new Date(order.timestamp).toISOString().split('T')[0];
            if (!dailySales[day]) dailySales[day] = { netSales: 0, discount: 0 };
            dailySales[day].netSales += order.total;
            dailySales[day].discount += order.discountValue || 0;
        }
        
        return { 
            dailyData: Object.entries(dailySales)
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        };
    }, [orders]);

     const dailyChartData = useMemo(() => {
        traceAction({
            slice: 'reports-data',
            actionName: 'dailyChartRendered',
            payload: { 
                days: reportData.dailyData.length,
                sourceOrderCount: orders.length
            },
            level: 'lifecycle'
        }, isSentinelLoggerEnabled);
        return {
            labels: reportData.dailyData.map(d => new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })),
            datasets: [{
                label: 'ยอดขายสุทธิ',
                data: reportData.dailyData.map(d => d.netSales),
                backgroundColor: (context: ScriptableContext<'bar'>) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.6)');
                    gradient.addColorStop(1, 'rgba(129, 140, 248, 0.8)');
                    return gradient;
                },
                borderRadius: 4,
            }]
        }
    }, [reportData.dailyData, orders.length, isSentinelLoggerEnabled]);
    const dailyChartOptions: ChartOptions<'bar'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
    
     const productRanking = useMemo(() => {
        const validOrders = orders.filter(o => o.status !== 'cancelled' && !o.reversalOf);
        const salesByProduct: { [key: string]: ProductSaleData } = {};
        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (!salesByProduct[item.name]) salesByProduct[item.name] = { name: item.name, category: item.category, quantity: 0, total: 0 };
                salesByProduct[item.name].quantity += item.quantity;
                salesByProduct[item.name].total += (item.price * item.quantity);
            });
        });
        return Object.values(salesByProduct);
    }, [orders]);

    const top5ProductNames = useMemo(() => {
        return [...productRanking].sort((a, b) => b.total - a.total).slice(0, 5).map(p => p.name);
    }, [productRanking]);
    
    const hourlyChartData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
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
        traceAction({
            slice: 'reports-data',
            actionName: 'hourlyChartRendered',
            payload: { 
                top5Products: top5ProductNames,
                sourceOrderCount: orders.length
            },
            level: 'lifecycle'
        }, isSentinelLoggerEnabled);
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
    }, [orders, top5ProductNames, isSentinelLoggerEnabled]);
    
    const hourlyChartOptions: ChartOptions<'bar'> = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const } },
        scales: { x: { stacked: true, title: { display: true, text: 'ชั่วโมง' } }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'ยอดขาย (บาท)' } } }
    };

    const analyzeSalesWithAI = useCallback(async () => {
        setIsAnalyzing(true);
        setAiAnalysis('');
        if (!ai) {
            setAiAnalysis("คุณสมบัติ AI ถูกปิดใช้งานเนื่องจากไม่ได้กำหนดค่า API Key");
            setIsAnalyzing(false); return;
        }
        
        const dataForPrompt = { ...summaryData, avgSalePerBill };
        const prompt = `Analyze the sales data for a Takoyaki shop and provide a concise summary (1-2 sentences) followed by 3 actionable, short bullet-point suggestions to improve sales or operations. Respond in Thai. Data: ${JSON.stringify(dataForPrompt, null, 2)}`;
        try {
            // [ULTRAMAX DEVS] Applying mandatory fix per Lead Architect directive.
            const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            setAiAnalysis(text);
        } catch (error) {
            const errorMessage = "ขออภัย, เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล";
            setAiAnalysis(errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [ai, showNotification, summaryData, avgSalePerBill]);

    useEffect(() => {
      if (isAdminMode && ai && reportData.dailyData.length > 2) {
        const runAnalysis = async () => {
          setIsOracleLoading(true);
          setOracleAlerts([]);
          const dailyDataForAI = reportData.dailyData.map(d => ({ date: d.date, netSales: d.netSales }));
          const anomalies = await runAnomalyDetection(ai, dailyDataForAI, isSentinelLoggerEnabled);
          setOracleAlerts(anomalies);
          setIsOracleLoading(false);
        };
        runAnalysis();
      } else {
        setOracleAlerts([]);
      }
    }, [isAdminMode, reportData.dailyData, ai, isSentinelLoggerEnabled]);

    const DailyChartComponent = (
        <div className="chart-render-area">
            {orders.length > 0 && reportData.dailyData.length > 0 ? (
                <Bar options={dailyChartOptions} data={dailyChartData} />
            ) : <p className="chart-empty-message">ไม่มีข้อมูลการขายสำหรับช่วงเวลานี้</p>}
        </div>
    );

    const HourlyChartComponent = (
         <div className="chart-render-area">
            {orders.length > 0 && top5ProductNames.length > 0 ? (
                <Bar options={hourlyChartOptions} data={hourlyChartData} />
            ) : <p className="chart-empty-message">ไม่มีข้อมูลการขายสำหรับช่วงเวลานี้</p>}
        </div>
    );

    return (
        <div>
            <div className="report-header">
                <h1>Super Intelligent HQ</h1>
            </div>

            <OracleAlerts
                alerts={oracleAlerts}
                isLoading={isOracleLoading}
                isVisible={isAdminMode && (oracleAlerts.length > 0 || isOracleLoading)}
            />

            <div className="kpi-grid">
                <KpiCard title="ยอดขายสุทธิ" value={`฿${formatCurrency(summaryData.netSales)}`} subValue={`จากยอดขายรวม ฿${formatCurrency(summaryData.totalRevenue)}`} icon="monitoring" color="purple" onClick={() => setActiveTab('products')} />
                <KpiCard title="จำนวนบิล" value={summaryData.totalBills.toLocaleString()} subValue={`เฉลี่ย ฿${formatCurrency(avgSalePerBill)}/บิล`} icon="receipt_long" color="blue" onClick={() => setActiveTab('history')} />
                <KpiCard title="ยอดส่วนลด" value={`฿${formatCurrency(summaryData.totalDiscount)}`} subValue={`${summaryData.discountedBillsCount} บิล`} icon="percent" color="yellow" onClick={() => setActiveTab('discounts')} />
                <KpiCard title="บิลยกเลิก" value={summaryData.cancellationsCount.toLocaleString()} subValue={`มูลค่า ฿${formatCurrency(Math.abs(summaryData.cancellationsTotal))}`} icon="cancel" color="red" onClick={() => setActiveTab('cancelled')} />
                <KpiCard title="ยอดชำระเงินสด" value={`฿${formatCurrency(summaryData.totalCashRevenue)}`} icon="payments" color="green" onClick={() => setActiveTab('payment')} />
                <KpiCard title="ยอดชำระ QR" value={`฿${formatCurrency(summaryData.totalQrRevenue)}`} icon="qr_code_2" color="blue" onClick={() => setActiveTab('payment')} />
            </div>

            <div className="summary-charts-grid">
                <div className="chart-wrapper">
                    <div className="chart-header-controls">
                        <h3>ภาพรวมยอดขายรายวัน</h3>
                        <button className="expand-btn" onClick={() => setExpandedChart('daily')} title="ขยายกราฟ">
                            <span className="material-symbols-outlined">open_in_full</span>
                        </button>
                    </div>
                    {DailyChartComponent}
                </div>
                <div className="chart-wrapper">
                    <div className="chart-header-controls">
                        <h3>ยอดขายรายชั่วโมง (Top 5 สินค้า)</h3>
                        <button className="expand-btn" onClick={() => setExpandedChart('hourly')} title="ขยายกราฟ">
                            <span className="material-symbols-outlined">open_in_full</span>
                        </button>
                    </div>
                    {HourlyChartComponent}
                </div>
            </div>
            
            <div className="settings-divider"></div>
            
            <div className="ai-analysis-section">
               <div className="ai-analysis-header"><span className="material-symbols-outlined">psychology</span>AI วิเคราะห์ยอดขาย</div>
               <p className="text-secondary" style={{ margin: '0.5rem 0 1rem' }}>ให้ AI ช่วยสรุปและหาโอกาสในการเพิ่มยอดขายจากข้อมูลของคุณ</p>
               <button className="action-button" onClick={analyzeSalesWithAI} disabled={isAnalyzing || orders.length === 0}>{isAnalyzing ? 'กำลังวิเคราะห์...' : 'เริ่มการวิเคราะห์'}</button>
               {aiAnalysis && <div className="ai-analysis-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{aiAnalysis}</div>}
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
        </div>
    );
};

const SummaryReport: React.FC<SummaryReportProps> = (props) => {
    const { showNotification } = useNotification();
    return (
        <ErrorBoundary showNotification={showNotification} componentName="SummaryReport">
            <SummaryReportContent {...props} />
        </ErrorBoundary>
    );
};

export default SummaryReport;