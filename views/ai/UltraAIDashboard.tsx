// ultramax-pos-v8.40-css-big-change.zip/views/ai/UltraAIDashboard.tsx
import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { ChartOptions, ScriptableContext } from 'chart.js';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { DailyData, Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { GoogleGenAI } from '@google/genai';
import { useNotification } from '../../contexts/NotificationContext';
import { db } from '../../lib/posDB';

// --- TYPE DEFINITIONS ---
type EmaPeriods = 7 | 15 | 89 | 144;
type DailySales = { date: string, netSales: number, discount: number, billCount: number };
type HistoricalData = {
    dailySales: DailySales[];
    allOrders: Order[];
    bestSeller: { name: string; quantity: number } | null;
    salesByCategory: Record<string, number>;
    hourlySales: number[];
    preparationTimeStats: { average: number; min: number; max: number; count: number };
};

// --- CHART CALCULATION HELPERS ---
const calculateEMA = (data: number[], period: number): (number | null)[] => {
    if (data.length < period) return Array(data.length).fill(null);
    const multiplier = 2 / (period + 1);
    const emaArray: (number | null)[] = Array(data.length).fill(null);
    
    let sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emaArray[period - 1] = sma;

    for (let i = period; i < data.length; i++) {
        emaArray[i] = (data[i] - emaArray[i - 1]!) * multiplier + emaArray[i - 1]!;
    }
    return emaArray;
};


const calculateMACD = (data: number[]) => {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = ema12.map((val, i) => (val !== null && ema26[i] !== null) ? val - ema26[i]! : null);
    const signalLine = calculateEMA(macdLine.filter(v => v !== null) as number[], 9);

    let signalIndex = 0;
    const fullSignalLine = macdLine.map(v => v !== null ? (signalLine[signalIndex] !== undefined ? signalLine[signalIndex++] : null) : null);
    
    const histogram = macdLine.map((val, i) => (val !== null && fullSignalLine[i] !== null) ? val - fullSignalLine[i]! : null);

    return { macdLine, signalLine: fullSignalLine, histogram };
};


// --- SUB-COMPONENTS ---

const MetricCard: React.FC<{ title: string; value: string; subValue?: string; icon: string; }> = React.memo(({ title, value, subValue, icon }) => (
    <div className="ai-metric-card">
        <div className="title"><span className="material-symbols-outlined">{icon}</span> {title}</div>
        <div className="value">{value}</div>
        {subValue && <div className="sub-value">{subValue}</div>}
    </div>
));


const SalesChart: React.FC<{ dailySales: DailySales[] }> = React.memo(({ dailySales }) => {
    const [activeEMAs, setActiveEMAs] = useState<Record<EmaPeriods, boolean>>({ 7: false, 15: false, 89: false, 144: false });
    const toggleEMA = (period: EmaPeriods) => setActiveEMAs(prev => ({ ...prev, [period]: !prev[period] }));
    
    const chartData = useMemo(() => {
        const labels = dailySales.map(d => new Date(d.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }));
        const sales = dailySales.map(d => d.netSales);
        const datasets: any[] = [{
            type: 'bar' as const,
            label: 'ยอดขายสุทธิ',
            data: sales,
            backgroundColor: 'rgba(79, 70, 229, 0.6)',
            borderColor: 'rgba(79, 70, 229, 1)',
            order: 2
        }];
        
        const emaColors: Record<EmaPeriods, string> = { 7: '#34d399', 15: '#f59e0b', 89: '#ef4444', 144: '#8b5cf6' };
        
        (Object.keys(activeEMAs) as unknown as EmaPeriods[]).forEach(period => {
            if (activeEMAs[period]) {
                datasets.push({
                    type: 'line' as const,
                    label: `EMA ${period}`,
                    data: calculateEMA(sales, period),
                    borderColor: emaColors[period],
                    backgroundColor: emaColors[period],
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                    order: 1
                });
            }
        });

        return { labels, datasets };
    }, [dailySales, activeEMAs]);


    const chartOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true } } };


    return (
        <div className="ai-chart-container">
            <div className="ai-chart-header">
                <h3>Sales Trend & EMA</h3>
                <p>กราฟยอดขายสุทธิและเส้นค่าเฉลี่ยเคลื่อนที่ (EMA)</p>
                <div className="ai-chart-controls">
                    {(Object.keys(activeEMAs) as unknown as EmaPeriods[]).map(p => (
                        <Fragment key={p}>
                            <input type="checkbox" id={`ema-${p}`} className="hidden" checked={activeEMAs[p]} onChange={() => toggleEMA(p)} />
                            <label htmlFor={`ema-${p}`}>EMA {p}</label>
                        </Fragment>
                    ))}
                </div>
            </div>
            <div style={{flex: 1, position: 'relative'}}><Line options={chartOptions} data={chartData} /></div>
        </div>
    );
});


const MACDChart: React.FC<{ dailySales: DailySales[] }> = React.memo(({ dailySales }) => {
    const chartData = useMemo(() => {
        const sales = dailySales.map(d => d.netSales);
        const { macdLine, signalLine, histogram } = calculateMACD(sales);
        const datasets: any[] = [
            { type: 'line' as const, label: 'MACD', data: macdLine, borderColor: '#3b82f6', borderWidth: 2, pointRadius: 0, tension: 0.3 },
            { type: 'line' as const, label: 'Signal', data: signalLine, borderColor: '#f97316', borderWidth: 2, pointRadius: 0, tension: 0.3 },
            { type: 'bar' as const, label: 'Histogram', data: histogram, backgroundColor: (context: any) => (context.raw > 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)') }
        ];
        return {
            labels: dailySales.map(d => new Date(d.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })),
            datasets
        };
    }, [dailySales]);
    const chartOptions: ChartOptions<'bar'> = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false } };
    
    return (
        <div className="ai-chart-container">
            <div className="ai-chart-header">
                <h3>Sales Momentum (MACD)</h3>
                <p>โมเมนตัมยอดขายเพื่อดูแนวโน้มการเติบโตหรือชะลอตัว</p>
            </div>
             <div style={{flex: 1, position: 'relative'}}><Bar options={chartOptions} data={chartData} /></div>
        </div>
    );
});


const AIPanel: React.FC<{ dataForAI: object; onSaveLog: (log: string) => void }> = React.memo(({ dataForAI, onSaveLog }) => {
    const ai = useStore(state => state.ai);
    const { showNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState('');

    const promptSuggestions = [
        "วิเคราะห์ภาพรวมยอดขายและให้คำแนะนำ 3 ข้อ",
        "สินค้าไหนขายดีที่สุดและควรทำโปรโมชั่นคู่กับอะไร?",
        "ช่วงเวลาใดที่ขายดีที่สุด และเราควรทำอะไรเพิ่ม?",
        "เปรียบเทียบยอดขายสัปดาห์นี้กับสัปดาห์ที่แล้ว",
        "จากข้อมูล MACD และ EMA โมเมนตัมยอดขายเป็นอย่างไร?",
        "สร้างรายงานสรุปสำหรับผู้บริหาร"
    ];

    const handleAiQuery = useCallback(async (prompt: string) => {
        if (!ai) {
            showNotification("ไม่ได้ตั้งค่า Gemini API Key", "warning");
            return;
        }
        setIsLoading(true);
        setResponse('');

        const fullPrompt = `
        You are a world-class business analyst for a Point-of-Sale system. Your name is "Ultra AI".
        Analyze the following sales data from a shop and answer the user's question.
        Provide actionable, concise, and data-driven insights in Thai.

        **Business Data:**
        \`\`\`json
        ${JSON.stringify(dataForAI, null, 2)}
        \`\`\`

        **User's Question:** ${prompt}
        `;
        
        try {
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: fullPrompt
            });
            const textResponse = result.text;
            setResponse(textResponse);
            onSaveLog(`Q: ${prompt}\nA: ${textResponse}\n------------------\n`);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            const errorMsg = "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูลกับ AI";
            setResponse(errorMsg);
            showNotification(errorMsg, "error");
        } finally {
            setIsLoading(false);
        }
    }, [ai, dataForAI, showNotification, onSaveLog]);

    return (
        <div className="ai-panel">
            <div className="ai-panel-header">
                <h2 className="ai-panel-title">
                    <span className="material-symbols-outlined">psychology</span>
                    Oracle AI Analytics
                </h2>
                <button className="action-button secondary" onClick={() => handleAiQuery(promptSuggestions[0])} disabled={isLoading}>
                    <span className="material-symbols-outlined">{isLoading ? 'hourglass_top' : 'auto_awesome'}</span>
                    {isLoading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ภาพรวมด่วน'}
                </button>
            </div>
            <div className="ai-suggestion-pills">
                {promptSuggestions.map(p => (
                    <button key={p} className="ai-suggestion-pill" onClick={() => handleAiQuery(p)} disabled={isLoading}>
                        {p}
                    </button>
                ))}
            </div>
            <div className="ai-response-area">
                {isLoading && (
                    <div className="oracle-loading">
                         <span className="material-symbols-outlined sync-icon pending">psychology</span>
                         <span>Oracle is analyzing...</span>
                    </div>
                )}
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7 }}>
                    {response || "ผลการวิเคราะห์จาก AI จะแสดงที่นี่..."}
                </pre>
            </div>
        </div>
    );
});

const UltraAIDashboard: React.FC = () => {
    const ai = useStore(state => state.ai);
    const shopSettings = useStore(state => state.shopSettings);
    const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [aiLog, setAiLog] = useState<string[]>([]);
    
    useEffect(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setDate(today.getDate() - 30);
        setDateRange({
            start: lastMonth.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        });

        const processOrders = (allOrders: Order[]) => {
            const salesByDay: { [date: string]: DailySales } = {};
            const productSales: { [key: string]: number } = {};
            
            allOrders.forEach(order => {
                const orderDate = new Date(order.timestamp);
                if (isNaN(orderDate.getTime())) return;
                const dateStr = orderDate.toISOString().split('T')[0];
    
                if (!salesByDay[dateStr]) salesByDay[dateStr] = { date: dateStr, netSales: 0, discount: 0, billCount: 0 };
    
                if (order.status !== 'cancelled' && !order.reversalOf) {
                    salesByDay[dateStr].netSales += order.total;
                    salesByDay[dateStr].discount += order.discountValue || 0;
                    salesByDay[dateStr].billCount++;
                    order.items.forEach(item => {
                        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                    });
                }
            });
            
            const bestSeller = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
            const salesByCategory: Record<string, number> = {};
            const hourlySales: number[] = Array(24).fill(0);
            const prepTimes: number[] = [];
    
            allOrders.forEach(order => {
                if (order.status !== 'cancelled' && !order.reversalOf) {
                     const orderDate = new Date(order.timestamp);
                    if (!isNaN(orderDate.getTime())) {
                        hourlySales[orderDate.getHours()] += order.total;
                    }
    
                    if (typeof order.preparationTimeInSeconds === 'number') {
                        prepTimes.push(order.preparationTimeInSeconds);
                    }
                    order.items.forEach(item => {
                        salesByCategory[item.category] = (salesByCategory[item.category] || 0) + (item.price * item.quantity);
                    });
                }
            });
    
            const preparationTimeStats = prepTimes.length > 0 ? {
                average: prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length,
                min: Math.min(...prepTimes),
                max: Math.max(...prepTimes),
                count: prepTimes.length
            } : { average: 0, min: 0, max: 0, count: 0 };
    
            setHistoricalData({
                dailySales: Object.values(salesByDay).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                allOrders,
                bestSeller: bestSeller ? { name: bestSeller[0], quantity: bestSeller[1] } : null,
                salesByCategory,
                hourlySales,
                preparationTimeStats
            });
        };

        const fetchAndProcessData = async () => {
            // FIX: Demo mode is deprecated. Always fetch from the live orders table.
            const allOrdersFromDB = await db.orders.toArray();
            processOrders(allOrdersFromDB);
        };

        fetchAndProcessData();
    }, [shopSettings.isDemoModeEnabled]);

    const filteredData = useMemo(() => {
        if (!historicalData) return null;
        const start = new Date(dateRange.start); start.setHours(0,0,0,0);
        const end = new Date(dateRange.end); end.setHours(23,59,59,999);
        
        const filteredDailySales = historicalData.dailySales.filter(d => {
            const day = new Date(d.date);
            return day >= start && day <= end;
        });

        const filteredOrders = historicalData.allOrders.filter(o => {
            const orderDate = new Date(o.timestamp);
            return orderDate >= start && orderDate <= end;
        });

        const summary = filteredDailySales.reduce((acc, day) => {
            acc.netSales += day.netSales;
            acc.billCount += day.billCount;
            return acc;
        }, { netSales: 0, billCount: 0});
        
        const salesByCategory: Record<string, number> = {};
        const hourlySales: number[] = Array(24).fill(0);
        const prepTimes: number[] = [];

        filteredOrders.forEach(order => {
             if (order.status !== 'cancelled' && !order.reversalOf) {
                 const orderDate = new Date(order.timestamp);
                if (!isNaN(orderDate.getTime())) {
                    hourlySales[orderDate.getHours()] += order.total;
                }
                if (typeof order.preparationTimeInSeconds === 'number') {
                    prepTimes.push(order.preparationTimeInSeconds);
                }
                order.items.forEach(item => {
                    salesByCategory[item.category] = (salesByCategory[item.category] || 0) + (item.price * item.quantity);
                });
            }
        });
         const preparationTimeStats = prepTimes.length > 0 ? {
            average: prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length,
            min: Math.min(...prepTimes),
            max: Math.max(...prepTimes),
            count: prepTimes.length
        } : { average: 0, min: 0, max: 0, count: 0 };

        return {
            dailySales: filteredDailySales,
            summary,
            bestSeller: historicalData.bestSeller,
            aiStats: {
                salesByCategory,
                hourlySales,
                preparationTimeStats
            }
        };
    }, [historicalData, dateRange]);


    const handleSaveLog = useCallback((log: string) => {
        setAiLog(prev => [...prev, log]);
    }, []);


    const downloadLog = () => {
        const content = `Ultra AI Dashboard Analysis Log\nGenerated on: ${new Date().toLocaleString('th-TH')}\n\n${aiLog.join('')}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ultramax-ai-log-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };


    if (!historicalData || !filteredData) {
        return <div className="ai-dashboard-view"><p>กำลังโหลดข้อมูลแดชบอร์ด...</p></div>;
    }


    const dataForAI = {
        dateRange,
        summary: filteredData.summary,
        bestSeller: filteredData.bestSeller,
        ...filteredData.aiStats,
    };


    return (
        <div className="ai-dashboard-view">
            <header className="ai-dashboard-header">
                <h1><span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>neurology</span>Ultra AI Dashboard</h1>
                <div className="report-controls">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
                    <span>ถึง</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
                </div>
            </header>
            {shopSettings.isDemoModeEnabled && <div className="info-box" style={{margin: 0}}><span className="material-symbols-outlined">info</span><p><strong>โหมดสาธิต (DEMO MODE):</strong> ข้อมูลที่แสดงในหน้านี้เป็นข้อมูลตัวอย่างสำหรับสาธิตการทำงานเท่านั้น</p></div>}

            <div className="ai-metric-grid">
                <MetricCard title="ยอดขายสุทธิ" value={`฿${formatCurrency(filteredData.summary.netSales)}`} subValue={`จาก ${filteredData.summary.billCount} บิล`} icon="monitoring" />
                <MetricCard title="เฉลี่ยต่อบิล" value={`฿${formatCurrency(filteredData.summary.billCount > 0 ? filteredData.summary.netSales / filteredData.summary.billCount : 0)}`} icon="receipt_long" />
                <MetricCard title="สินค้าขายดีที่สุด" value={filteredData.bestSeller?.name || 'N/A'} subValue={`${filteredData.bestSeller?.quantity || 0} ชิ้น`} icon="local_mall" />
                 <MetricCard title="จำนวนวัน" value={`${filteredData.dailySales.length}`} subValue="ในขอบเขต" icon="calendar_today" />
            </div>


            <div className="ai-charts-grid">
                <SalesChart dailySales={filteredData.dailySales} />
                <MACDChart dailySales={filteredData.dailySales} />
            </div>


            {ai && <AIPanel dataForAI={dataForAI} onSaveLog={handleSaveLog} />}


            {aiLog.length > 0 && 
                <button onClick={downloadLog} className="action-button secondary" style={{alignSelf: 'flex-start'}}>
                    <span className="material-symbols-outlined">download</span> ดาวน์โหลดประวัติการวิเคราะห์
                </button>
            }
        </div>
    );
};


export default UltraAIDashboard;
