// src/views/reports/ReportsScreen.tsx
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
  // Select state atomically from the store for performance and to prevent unnecessary re-renders.
  const allOrders = useStore(state => state.allOrders);
  const isLoading = useStore(state => state.isHistoryLoading);
  const error = useStore(state => state.error);
  const isDemoModeEnabled = useStore(state => state.shopSettings.isDemoModeEnabled);
  const isSentinelLoggerEnabled = useStore(state => state.shopSettings.isSentinelLoggerEnabled);
  const ai = useStore(state => state.ai);
  const isAdminMode = useStore(state => state.isAdminMode);
  const handleCancelBill = useStore(state => state.handleCancelBill);

  const [activeReport, setActiveReport] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // This effect now ONLY sets the default date range when the component mounts or demo mode changes.
  // It NO LONGER fetches data, as that is handled by the central "Master Trigger".
  useEffect(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    setDateRange({ start: startOfDay, end: endOfDay });
    
    traceAction({
        slice: 'reports-ui',
        actionName: 'ReportsScreen:mounted',
        payload: { demo: isDemoModeEnabled }
    }, isSentinelLoggerEnabled);
  }, [isDemoModeEnabled, isSentinelLoggerEnabled]);


  // IMPORTANT: This useMemo now filters the centrally-managed 'allOrders' state.
  // This is highly efficient as it avoids repeated database calls.
  const filteredOrders = useMemo<Order[]>(() => {
    if (!dateRange) return [];
    return allOrders.filter((order) => {
      const orderDate = new Date(order.timestamp);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [allOrders, dateRange]);

  // Calculate summary data once in the parent component and pass it down as props.
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
            if (order.paymentMethod === 'cash') {
                data.totalCashRevenue += order.total;
            } else {
                data.totalQrRevenue += order.total;
            }
            if (order.discountValue > 0) {
                data.totalDiscount += order.discountValue;
                data.discountedBillsCount++;
            }
        }
    }
    // Correctly calculate totalRevenue as gross sales (net + discount)
    data.totalRevenue = data.netSales + data.totalDiscount;
    return data;
  }, [filteredOrders]);

  // Implemented handlers for the ReportDateControls component.
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
    if (isLoading) {
      return <div className="loading-indicator">กำลังโหลดข้อมูลรายงาน...</div>;
    }

    if (error) {
      return <div className="error-message">เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}</div>;
    }
    
    if (!dateRange) {
        return <div className="loading-indicator">กรุณาเลือกช่วงวันที่...</div>;
    }

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
        return null;
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
          {renderActiveReport()}
        </main>
      </div>
    </div>
  );
};

export default ReportsScreen;
