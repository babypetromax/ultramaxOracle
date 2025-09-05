import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';

interface PreparationTimeReportProps {
    orders: Order[];
}

const formatSeconds = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
};

// [ULTRAMAX DEVS] AURA & JAXON'S REFACTOR:
// Refactor inline styles to CSS classes for maintainability and consistency.
const getStatusTag = (prepTime: number | undefined) => {
    if (typeof prepTime !== 'number') return null;

    if (prepTime < 180) return <span className="status-tag status-info">เร็ว</span>;
    if (prepTime <= 300) return <span className="status-tag status-warning">ปกติ</span>;
    return <span className="status-tag status-danger">ล่าช้า</span>;
};

const PreparationTimeReport: React.FC<PreparationTimeReportProps> = ({ orders }) => {

    const timedOrders = useMemo(() => {
        return orders
            .filter(o => o.status === 'completed' && typeof o.preparationTimeInSeconds === 'number' && !o.reversalOf)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [orders]);

    const summary = useMemo(() => {
        if (timedOrders.length === 0) {
            return { averageTime: 0, delayedCount: 0 };
        }
        const totalTime = timedOrders.reduce((sum, o) => sum + (o.preparationTimeInSeconds || 0), 0);
        const delayedCount = timedOrders.filter(o => (o.preparationTimeInSeconds || 0) > 300).length;

        return {
            averageTime: totalTime / timedOrders.length,
            delayedCount,
        };
    }, [timedOrders]);

    return (
        <div>
            <div className="report-header"><h1>รายงานประสิทธิภาพครัว</h1></div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-title">เวลาเตรียมเฉลี่ย</div>
                    <div className="summary-card-value">{formatSeconds(summary.averageTime)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">จำนวนบิลที่ล่าช้า (&gt;5 นาที)</div>
                    <div className="summary-card-value" style={{ color: summary.delayedCount > 0 ? 'var(--danger-color)' : 'inherit' }}>
                        {summary.delayedCount}
                    </div>
                </div>
                 <div className="summary-card">
                    <div className="summary-card-title">จำนวนบิลที่วัดผล</div>
                    <div className="summary-card-value">{timedOrders.length}</div>
                </div>
            </div>

            <table className="report-table">
                <thead>
                    <tr>
                        <th>เลขที่บิล</th>
                        <th>เวลา</th>
                        <th>ยอดขาย</th>
                        <th>เวลาที่ใช้เตรียม</th>
                        <th>สถานะตอนเสร็จ</th>
                    </tr>
                </thead>
                <tbody>
                    {timedOrders.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center' }}>ไม่มีข้อมูลการทำอาหารที่บันทึกไว้</td></tr>
                    )}
                    {timedOrders.map(order => (
                        <tr key={order.id}>
                            <td>{order.id}</td>
                            <td>{new Date(order.timestamp).toLocaleTimeString('th-TH')}</td>
                            <td>฿{formatCurrency(order.total)}</td>
                            <td>{formatSeconds(order.preparationTimeInSeconds!)}</td>
                            <td>{getStatusTag(order.preparationTimeInSeconds)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PreparationTimeReport;