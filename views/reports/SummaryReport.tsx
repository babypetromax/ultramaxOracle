// src/views/reports/SummaryReport.tsx
import React, { useState, useCallback } from 'react';
import { Order } from '../../types';
import { GoogleGenAI } from '@google/genai';
import { useNotification } from '../../contexts/NotificationContext';
import ErrorBoundary from '../../lib/ErrorBoundary';
import { runAnomalyDetection, Anomaly } from '../../services/aiAnalysisService';
import { useStore } from '../../contexts/store/index';
import { KpiGrid } from '../../components/reports/KpiGrid';
import { SummaryCharts } from '../../components/reports/charts/SummaryCharts';

type ReportTab = 'summary' | 'products' | 'categories' | 'payment' | 'discounts' | 'cancelled' | 'history' | 'prepTime' | 'shift' | 'activity' | 'sentinel';

interface SummaryData {
    totalRevenue: number; totalCashRevenue: number; totalQrRevenue: number;
    cancellationsTotal: number; cancellationsCount: number; netSales: number;
    totalDiscount: number; discountedBillsCount: number; totalBills: number;
}

interface SummaryReportProps {
    orders: Order[];
    ai: GoogleGenAI | null;
    summaryData: SummaryData;
    setActiveTab: (tab: ReportTab) => void;
}

const OracleAlerts: React.FC<{ alerts: Anomaly[]; isLoading: boolean; isVisible: boolean; }> = ({ alerts, isLoading, isVisible }) => {
    if (!isVisible) return null;

    if (isLoading) {
        return (
             <div className="oracle-container">
                <div className="oracle-loading">
                    <span className="material-symbols-outlined sync-icon pending">psychology</span>
                    <span>Oracle is analyzing...</span>
                </div>
            </div>
        );
    }
    
    if (alerts.length === 0) {
        return (
            <div className="oracle-container">
                 <div className="oracle-card severity-low">
                    <div className="oracle-card-header">
                        <span className="material-symbols-outlined">verified</span>
                        <h4>No Anomalies Detected</h4>
                    </div>
                    <p className="oracle-finding">Oracle has analyzed the data for the selected period and found no significant anomalies or outliers. Sales patterns appear consistent.</p>
                </div>
            </div>
        )
    }

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
            {alerts.map((alert, index) => (
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


/**
 * [PHOENIX REFACTOR V2]
 * This component is now a lightweight orchestrator. Its responsibilities are:
 * 1. Managing Oracle AI state and interactions.
 * 2. Rendering the new, specialized child components.
 */
const SummaryReportContent: React.FC<SummaryReportProps> = ({ orders, summaryData, ai, setActiveTab }) => {
    const { showNotification } = useNotification();
    const isSentinelLoggerEnabled = useStore(state => state.shopSettings.isSentinelLoggerEnabled);
    const isAdminMode = useStore(state => state.isAdminMode);

    const [oracleAlerts, setOracleAlerts] = useState<Anomaly[]>([]);
    const [isOracleLoading, setIsOracleLoading] = useState(false);
    const [oracleHasBeenActivated, setOracleHasBeenActivated] = useState(false);

    const handleActivateOracle = useCallback(async () => {
        if (!isAdminMode || !ai || orders.length < 3) {
            showNotification("ไม่สามารถวิเคราะห์ได้ (ข้อมูลไม่เพียงพอ หรือไม่อยู่ในโหมดผู้ดูแล)", "warning");
            return;
        }
        
        setIsOracleLoading(true);
        setOracleHasBeenActivated(true);
        setOracleAlerts([]);
        
        const dailySalesByDay = orders.reduce((acc, order) => {
            if (order.status !== 'cancelled' && !order.reversalOf) {
                const day = new Date(order.timestamp).toISOString().split('T')[0];
                acc[day] = (acc[day] || 0) + order.total;
            }
            return acc;
        }, {} as Record<string, number>);

        const dailyDataForAI = Object.entries(dailySalesByDay).map(([date, netSales]) => ({ date, netSales }));

        try {
            const anomalies = await runAnomalyDetection(ai, dailyDataForAI, isSentinelLoggerEnabled);
            setOracleAlerts(anomalies);
        } catch (error) {
            showNotification("Oracle Engine analysis failed.", "error");
        } finally {
            setIsOracleLoading(false);
        }
    }, [isAdminMode, ai, orders, showNotification, isSentinelLoggerEnabled]);

    return (
        <div>
            <div className="report-header"><h1>Super Intelligent HQ</h1></div>
            
            <div className="oracle-activation-panel">
                <div className="oracle-header"><span className="material-symbols-outlined">psychology</span><h3>Oracle AI Engine</h3></div>
                <p>วิเคราะห์ข้อมูลการขายเพื่อค้นหาความผิดปกติและให้คำแนะนำ</p>
                <button className="action-button" onClick={handleActivateOracle} disabled={isOracleLoading || !isAdminMode}>
                    {isOracleLoading ? 'กำลังวิเคราะห์...' : 'Activate Oracle Analysis'}
                </button>
            </div>

            <OracleAlerts alerts={oracleAlerts} isLoading={isOracleLoading} isVisible={oracleHasBeenActivated} />

            <KpiGrid summaryData={summaryData} setActiveTab={setActiveTab} />
            
            <div className="settings-divider"></div>

            <SummaryCharts orders={orders} />
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