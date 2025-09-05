/**
 * @file views/reports/ReportsScreen.tsx
 * @version X.024-ORACLE-STABLE
 * @description Refactored to use atomic Zustand selectors to fix critical infinite loop bug.
 */
import React, { useState, useMemo, useEffect, useCallback, ChangeEvent } from 'react';
import SummaryReport from './SummaryReport';
import ReceiptsHistory from './ReceiptsHistory';
import SalesByProductReport from './SalesByProductReport';
import SalesByCategoryReport from './SalesByCategoryReport';
import SalesByPaymentReport from './SalesByPaymentReport';
import DiscountReport from './DiscountReport';
import CancelledBillsReport from './CancelledBillsReport';
import ActivityLogReport from './ActivityLogReport';
import ShiftActivityReport from './ShiftActivityReport';
import PreparationTimeReport from './PreparationTimeReport';
import BillDetails from '../../components/BillDetails';
import ReportDateControls from '../../components/reports/ReportDateControls';
import { useStore } from '../../contexts/store/index';
import { Order } from '../../types';
import SentinelLogReport from './SentinelLogReport';
import { traceAction } from '../../lib/sentinelLogger';

type ReportType =
  | 'summary'
  | 'products'
  | 'categories'
  | 'payment'
  | 'discounts'
  | 'cancelled'
  | 'history'
  | 'prepTime'
  | 'shift'
  | 'activity'
  | 'sentinel';

const ReportsScreen: React.FC = () => {
  // [ULTRAMAX DEVS FIX] - Split useStore into atomic selectors to prevent infinite re-renders.
  const allOrders = useStore(state => state.reports.allOrders);
  const isLoading = useStore(state => state.reports.isHistoryLoading);
  const error = useStore(state => state.reports.error);
  const isSentinelLoggerEnabled = useStore(state => state.shopSettings.isSentinelLoggerEnabled);
  const ai = useStore(state => state.ai);
  const isAdminMode = useStore(state => state.isAdminMode);
  const handleCancelBill = useStore(state => state.handleCancelBill);

  const [activeReport, setActiveReport] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    setDateRange({ start: startOfDay, end: endOfDay });
    traceAction({ slice: 'reports-ui', actionName: 'ReportsScreen:mounted'}, isSentinelLoggerEnabled);
  }, [isSentinelLoggerEnabled]);

  const filteredOrders = useMemo(() => {
    if (!dateRange) return [];
    return allOrders.filter((order) => {
      const orderDate = new Date(order.timestamp);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [allOrders, dateRange]);

  const summaryData = useMemo(() => {
    const data = {
        totalRevenue: 0,
        totalCashRevenue: 0,
        totalQrRevenue: 0,
        cancellationsTotal: 0,
        cancellationsCount: 0,
        netSales: 0,
        totalDiscount: 0,
        discountedBillsCount: 0,
        totalBills: 0,
    };
    for (const order of filteredOrders) {
        if (order.status === 'cancelled') {
            data.cancellationsCount++;
            data.cancellationsTotal += order.total;
        } else if (!order.reversalOf) {
            data.totalBills++;
            data.netSales += order.total;
            if (order.paymentMethod === 'cash') data.totalCashRevenue += order.total;
            else data.totalQrRevenue += order.total;
            if (order.discountValue > 0) {
                data.totalDiscount += order.discountValue;
                data.discountedBillsCount++;
            }
        }
    }
    data.totalRevenue = data.netSales + data.totalDiscount;
    return data;
  }, [filteredOrders]);

  const handleDateChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => {
        const newRange = prev ? { ...prev } : { start: new Date(), end: new Date() };
        if (name === 'start') {
            const newStartDate = new Date(value);
            newStartDate.setHours(0, 0, 0, 0);
            newRange.start = newStartDate;
        } else {
            const newEndDate = new Date(value);
            newEndDate.setHours(23, 59, 59, 999);
            newRange.end = newEndDate;
        }
        return newRange;
    });
  }, []);

  const handleSetDatePreset = useCallback((preset: 'today' | 'yesterday' | 'last7days' | 'thisMonth') => {
    const today = new Date();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    let startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

    switch(preset) {
        case 'yesterday':
            startOfDay.setDate(startOfDay.getDate() - 1);
            endOfDay.setDate(endOfDay.getDate() - 1);
            break;
        case 'last7days':
            startOfDay.setDate(startOfDay.getDate() - 6);
            break;
        case 'thisMonth':
            startOfDay = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'today':
        default:
            break;
    }
    setDateRange({ start: startOfDay, end: endOfDay });
  }, []);

  const renderActiveReport = () => {
    switch (activeReport) {
      case 'summary':
        return <SummaryReport orders={filteredOrders} summaryData={summaryData} ai={ai} setActiveTab={setActiveReport} />;
      case 'products':
        return <SalesByProductReport orders={filteredOrders} />;
      case 'categories':
        return <SalesByCategoryReport orders={filteredOrders} />;
      case 'payment':
        return <SalesByPaymentReport orders={filteredOrders} />;
      case 'discounts':
        return <DiscountReport orders={filteredOrders} />;
      case 'cancelled':
        return <CancelledBillsReport orders={filteredOrders} />;
      case 'history':
        return <ReceiptsHistory orders={filteredOrders} summaryData={summaryData} BillDetailsComponent={BillDetails} onCancelBill={handleCancelBill} isAdminMode={isAdminMode} />;
      case 'prepTime':
        return <PreparationTimeReport orders={filteredOrders} />;
      case 'shift':
        return <ShiftActivityReport />;
      case 'activity':
        return <ActivityLogReport />;
      case 'sentinel':
        return <SentinelLogReport />;
      default:
        return <div className="report-placeholder">Select a report to view.</div>;
    }
  };

  const reportTabs: { key: ReportType; label: string }[] = [
    { key: 'summary', label: 'สรุปยอดขาย' },
    { key: 'products', label: 'ตามสินค้า' },
    { key: 'categories', label: 'ตามหมวดหมู่' },
    { key: 'payment', label: 'ตามการชำระเงิน' },
    { key: 'discounts', label: 'ส่วนลด' },
    { key: 'cancelled', label: 'บิลยกเลิก' },
    { key: 'history', label: 'ประวัติใบเสร็จ' },
    { key: 'prepTime', label: 'เวลาเตรียมอาหาร' },
    { key: 'shift', label: 'กิจกรรมกะ' },
    { key: 'activity', label: 'ประวัติกิจกรรม' },
    { key: 'sentinel', label: 'Sentinel Logs' },
  ];

  return (
    <div className="view-container reports-screen">
      <div className="reports-header">
        <h1>รายงาน</h1>
        <ReportDateControls
          dateRange={{
            start: dateRange ? dateRange.start.toISOString().split('T')[0] : '',
            end: dateRange ? dateRange.end.toISOString().split('T')[0] : '',
          }}
          onDateChange={handleDateChange}
          onSetDatePreset={handleSetDatePreset}
        />
      </div>
      <div className="reports-body">
        <nav className="reports-nav">
          {reportTabs.map((tab) => (
            <button
              key={tab.key}
              className={`nav-button ${activeReport === tab.key ? 'active' : ''}`}
              onClick={() => setActiveReport(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <main className="report-content-area">
          {isLoading && <div className="loading-indicator">กำลังโหลดข้อมูล...</div>}
          {error && <div className="error-message">เกิดข้อผิดพลาด: {error}</div>}
          {!isLoading && !error && renderActiveReport()}
        </main>
      </div>
    </div>
  );
};

export default ReportsScreen;
