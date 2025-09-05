import React, { useState, useMemo, Fragment, useEffect } from 'react';
import { Order, KitchenOrder, ShopSettings } from '../../types';
import BillDetails from '../../components/BillDetails';
import { formatCurrency } from '../../helpers';
import ShiftManagementPanel from './ShiftManagementPanel';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';


interface TimeAgoProps {
    date: Date;
    now: Date;
}

const TimeAgo: React.FC<TimeAgoProps> = ({ date, now }) => {
    const timeString = useMemo(() => {
        const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 0) return '0 วินาที';
        if (hours > 0) return `${hours} ชม. ${minutes % 60} น.`;
        if (minutes > 0) return `${minutes} น. ${seconds % 60} วิ.`;
        return `${seconds} วิ.`;
    }, [date, now]);
    
    return <span className="time-ago">{timeString}</span>;
};

interface DynamicState {
    statusText: string;
    statusClass: string;
    buttonText: string;
    buttonIcon: string;
}

const getOrderDynamicState = (order: KitchenOrder, now: Date, settings: ShopSettings): DynamicState => {
    if (order.status === 'ready') {
        return { statusText: 'พร้อมส่ง', statusClass: 'ready', buttonText: 'ปิดบิล (รับแล้ว)', buttonIcon: 'takeout_dining' };
    }
    const ageInSeconds = (now.getTime() - new Date(order.timestamp).getTime()) / 1000;
    const cookingThreshold = settings.cookingTimeThresholdMinutes * 60;
    const delayedThreshold = settings.delayedTimeThresholdMinutes * 60;

    if (ageInSeconds < cookingThreshold) { return { statusText: 'เข้าใหม่', statusClass: 'new', buttonText: 'ทำเสร็จแล้ว', buttonIcon: 'check_circle' }; }
    if (ageInSeconds < delayedThreshold) { return { statusText: 'กำลังทำ', statusClass: 'cooking', buttonText: 'ทำเสร็จแล้ว', buttonIcon: 'check_circle' }; }
    return { statusText: 'ล่าช้า', statusClass: 'delayed', buttonText: 'ทำเสร็จแล้ว', buttonIcon: 'check_circle' };
};


const OrderManagementScreen: React.FC = () => {
    const { now } = useApp();
    const showConfirmation = useConfirmation();
   
    // [SURGICAL FIX] Use atomic selectors to prevent infinite loops.
    const kitchenOrders = useStore(state => state.dailyData?.kitchenOrders);
    const completedOrders = useStore(state => state.dailyData?.completedOrders);
    const shopSettings = useStore(state => state.shopSettings);
    const setShopSettings = useStore(state => state.setShopSettings);
    const handleUpdateOrderStatus = useStore(state => state.handleUpdateOrderStatus);
    const handleCompleteOrder = useStore(state => state.handleCompleteOrder);
    const handleCancelBill = useStore(state => state.handleCancelBill);
    const isAdminMode = useStore(state => state.isAdminMode);

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeKdsTab, setActiveKdsTab] = useState<'bills' | 'shift'>('bills');
    const [isCompletedPanelExpanded, setIsCompletedPanelExpanded] = useState(false);
    
    // --- State for KDS Time Editor ---
    const [isEditingTimes, setIsEditingTimes] = useState(false);
    const [tempCookingTime, setTempCookingTime] = useState(shopSettings.cookingTimeThresholdMinutes);
    const [tempDelayedTime, setTempDelayedTime] = useState(shopSettings.delayedTimeThresholdMinutes);

    useEffect(() => {
        if (!isEditingTimes) {
            setTempCookingTime(shopSettings.cookingTimeThresholdMinutes);
            setTempDelayedTime(shopSettings.delayedTimeThresholdMinutes);
        }
    }, [shopSettings, isEditingTimes]);

    const handleTimeSettingsSave = () => {
        setShopSettings({
            ...shopSettings,
            cookingTimeThresholdMinutes: tempCookingTime,
            delayedTimeThresholdMinutes: tempDelayedTime,
        });
        setIsEditingTimes(false);
    };

    const activeOrders = useMemo(() => {
        if (!kitchenOrders) return [];
        return [...kitchenOrders].sort((a, b) => a.id.localeCompare(b.id));
    }, [kitchenOrders]);
    
    const completedOrdersToday = useMemo(() => {
        if (!completedOrders) return [];
        return [...completedOrders].sort((a, b) => {
             const dateA = a.cancelledAt ? new Date(a.cancelledAt) : new Date(a.timestamp);
             const dateB = b.cancelledAt ? new Date(b.cancelledAt) : new Date(b.timestamp);
             return dateB.getTime() - dateA.getTime();
        });
    }, [completedOrders]);

    const kdsSummary = useMemo(() => {
        const summary = { new: 0, cooking: 0, delayed: 0 };
        if (!activeOrders) return summary;

        activeOrders.forEach(order => {
            const state = getOrderDynamicState(order, now, shopSettings);
            switch (state.statusClass) {
                case 'new': summary.new++; break;
                case 'cooking': summary.cooking++; break;
                case 'delayed': summary.delayed++; break;
            }
        });
        return summary;
    }, [activeOrders, now, shopSettings]);

    const dailySummary = useMemo(() => {
        const summary = { totalDiscount: 0, totalQrRevenue: 0, totalCashRevenue: 0, netSales: 0, totalCancelledValue: 0, cancellationsCount: 0 };
        for (const order of completedOrdersToday) {
            if (order.status === 'cancelled') {
                summary.totalCancelledValue += order.total;
                summary.cancellationsCount++;
            } else if (!order.reversalOf) {
                summary.totalDiscount += order.discountValue || 0;
                if (order.paymentMethod === 'qr') summary.totalQrRevenue += order.total;
                else summary.totalCashRevenue += order.total;
            }
        }
        summary.netSales = summary.totalQrRevenue + summary.totalCashRevenue;
        return summary;
    }, [completedOrdersToday]);

    const handleCancelClick = async (e: React.MouseEvent, orderToCancel: Order) => {
        e.stopPropagation();
        const confirmed = await showConfirmation({
            title: 'ยืนยันการยกเลิกบิล',
            message: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบิล #${orderToCancel.id}? การกระทำนี้จะสร้างบิลติดลบเพื่อปรับยอดขายและไม่สามารถย้อนกลับได้`
        });
        if (confirmed) {
            handleCancelBill(orderToCancel);
        }
    };

    return (
        <div className="order-management-screen">
            <header className="kds-header kds-tab-header">
                <div className="kds-tabs">
                     <button className={`kds-tab-btn ${activeKdsTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveKdsTab('bills')}>
                         <span className="material-symbols-outlined">history</span> บิลที่เสร็จสิ้นล่าสุด
                     </button>
                     <button className={`kds-tab-btn ${activeKdsTab === 'shift' ? 'active' : ''}`} onClick={() => setActiveKdsTab('shift')}>
                         <span className="material-symbols-outlined">savings</span> จัดการกะและเงินสด
                     </button>
                </div>
            </header>

            <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {activeKdsTab === 'bills' ? (
                    <>
                        <section className="active-orders-section">
                             <div className="kds-header">
                                <h1>
                                    <div className="kds-header-left-group">
                                        <span className="material-symbols-outlined">skillet</span>
                                        กำลังดำเนินการ ({activeOrders.length})
                                    </div>
                                    <div className="kds-summary-tags">
                                        <span className="summary-tag status-new" title="เข้าใหม่"><span className="material-symbols-outlined">fiber_new</span>{kdsSummary.new}</span>
                                        <span className="summary-tag status-cooking" title="กำลังทำ"><span className="material-symbols-outlined">soup_kitchen</span>{kdsSummary.cooking}</span>
                                        <span className="summary-tag status-delayed" title="ล่าช้า"><span className="material-symbols-outlined">local_fire_department</span>{kdsSummary.delayed}</span>
                                    </div>
                                     {isAdminMode && (
                                        <div className="kds-settings-container">
                                            {!isEditingTimes ? (
                                                <button className="kds-edit-time-btn" onClick={() => setIsEditingTimes(true)} title="แก้ไขเกณฑ์เวลา">
                                                    <span className="material-symbols-outlined">edit_calendar</span>
                                                </button>
                                            ) : (
                                                <div className="kds-time-editor">
                                                    <div className="kds-time-input">
                                                        <span className="material-symbols-outlined status-cooking">soup_kitchen</span>
                                                        <input type="number" value={tempCookingTime} onChange={e => setTempCookingTime(Number(e.target.value))} />
                                                        <span>นาที</span>
                                                    </div>
                                                    <div className="kds-time-input">
                                                        <span className="material-symbols-outlined status-delayed">local_fire_department</span>
                                                        <input type="number" value={tempDelayedTime} onChange={e => setTempDelayedTime(Number(e.target.value))} />
                                                        <span>นาที</span>
                                                    </div>
                                                    <button className="action-button success-button" onClick={handleTimeSettingsSave}><span className="material-symbols-outlined">check</span></button>
                                                    <button className="action-button secondary" style={{backgroundColor: 'var(--text-secondary)'}} onClick={() => setIsEditingTimes(false)}><span className="material-symbols-outlined">close</span></button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </h1>
                            </div>
                            {activeOrders.length === 0 ? (
                                <p className="kds-empty-message">ไม่มีออเดอร์ในครัวตอนนี้</p>
                            ) : (
                                <div className="kitchen-order-grid">
                                    {activeOrders.map(order => {
                                        const dynamicState = getOrderDynamicState(order, now, shopSettings);
                                        return (
                                            <div key={order.id} className={`order-card status-${dynamicState.statusClass}`}>
                                                <div className="order-card-header">
                                                    <div className="order-card-title">
                                                        <h3>{order.id.slice(-4)}</h3>
                                                        <span className={`status-badge status-${dynamicState.statusClass}`}>{dynamicState.statusText}</span>
                                                    </div>
                                                    <TimeAgo date={order.timestamp} now={now} />
                                                </div>
                                                <ul className="order-card-items">
                                                    {order.items.map(item => (
                                                        <li key={`${order.id}-${item.id}`}>
                                                            <span className="item-quantity">{item.quantity}x</span>
                                                            <span className="item-name">{item.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="order-card-footer">
                                                    <button
                                                        className={`action-button ${dynamicState.statusClass}`}
                                                        onClick={() => {
                                                            dynamicState.statusClass === 'ready' ? handleCompleteOrder(order.id) : handleUpdateOrderStatus(order.id, 'ready');
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined">{dynamicState.buttonIcon}</span>
                                                        {dynamicState.buttonText}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        <section className={`completed-bills-section ${isCompletedPanelExpanded ? 'expanded' : ''}`}>
                             <div className="kds-header kds-tab-header">
                                <div className="kds-tabs">
                                    <div className="kds-tab-btn active">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        บิลที่ปิดแล้ววันนี้ ({completedOrdersToday.length})
                                    </div>
                                </div>
                                <button className="expand-toggle-btn" onClick={() => setIsCompletedPanelExpanded(!isCompletedPanelExpanded)}>
                                    <span className="material-symbols-outlined">{isCompletedPanelExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
                                </button>
                            </div>
                            <div className="completed-bills-list-container">
                                <div className="completed-bills-list">
                                    <table className="report-table kds-completed-table">
                                        <thead>
                                            <tr>
                                                <th>เลขที่บิล</th>
                                                <th>เวลา</th>
                                                <th>ยอดรวม</th>
                                                <th>ส่วนลด</th>
                                                <th>การชำระเงิน</th>
                                                <th>สถานะ</th>
                                                <th title="สถานะการซิงค์">
                                                    <span className="material-symbols-outlined">cloud_sync</span>
                                                </th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {completedOrdersToday.map(order => (
                                                <Fragment key={order.id}>
                                                    <tr className={`expandable-row ${order.status === 'cancelled' ? 'cancelled-bill' : ''} ${order.total < 0 ? 'reversal-bill' : ''}`} onClick={() => order.status !== 'cancelled' && setExpandedId(prev => prev === order.id ? null : order.id)}>
                                                        <td>{order.id}</td>
                                                        <td>{new Date(order.timestamp).toLocaleTimeString('th-TH')}</td>
                                                        <td>฿{formatCurrency(order.total)}</td>
                                                        <td className="discount-value">
                                                            {order.discountValue > 0 ? `-฿${formatCurrency(order.discountValue)}` : '-'}
                                                        </td>
                                                        <td>{order.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}</td>
                                                        <td>
                                                            <span className={`status-tag status-${order.status}`}>{order.status === 'completed' ? (order.reversalOf ? 'คืนเงิน' : 'สำเร็จ') : 'ยกเลิก'}</span>
                                                        </td>
                                                        <td>
                                                            {order.syncStatus === 'synced' && <span className="material-symbols-outlined sync-icon synced" title="ซิงค์ข้อมูลแล้ว">cloud_done</span>}
                                                            {order.syncStatus === 'pending' && <span className="material-symbols-outlined sync-icon pending" title="รอซิงค์ข้อมูล">cloud_upload</span>}
                                                            {order.syncStatus === 'failed' && <span className="material-symbols-outlined sync-icon failed" title="การซิงค์ล้มเหลว">cloud_off</span>}
                                                        </td>
                                                        <td>
                                                            {isAdminMode && order.status === 'completed' && order.total > 0 && (
                                                                <button className="delete-bill-btn" title="ยกเลิกบิล" onClick={(e) => handleCancelClick(e, order)}>
                                                                    <span className="material-symbols-outlined">delete</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {expandedId === order.id && <BillDetails order={order} />}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                        <footer className="kds-summary-footer-v2">
                            <div className="kds-summary-footer-v2-inner">
                                <div className="summary-item-v2">
                                    <span className="summary-label"><span className="material-symbols-outlined">percent</span> ยอดส่วนลด</span>
                                    <span className="summary-value" style={{ color: 'var(--warning-color)' }}>฿{formatCurrency(dailySummary.totalDiscount)}</span>
                                </div>
                                <div className="summary-item-v2">
                                    <span className="summary-label">บิลยกเลิก{dailySummary.cancellationsCount > 0 && (<span className="cancellation-badge-v2" title={`${dailySummary.cancellationsCount} บิล`}>{dailySummary.cancellationsCount}</span>)}</span>
                                    <span className="summary-value" style={{ color: 'var(--danger-color)' }}>฿{formatCurrency(Math.abs(dailySummary.totalCancelledValue))}</span>
                                </div>
                                <div className="summary-item-v2">
                                    <span className="summary-label"><span className="material-symbols-outlined">qr_code_2</span> ยอดขาย QR Code</span>
                                    <span className="summary-value qr-sales">฿{formatCurrency(dailySummary.totalQrRevenue)}</span>
                                </div>
                                <div className="summary-item-v2">
                                    <span className="summary-label"><span className="material-symbols-outlined">payments</span> ยอดขายเงินสด</span>
                                    <span className="summary-value cash-sales">฿{formatCurrency(dailySummary.totalCashRevenue)}</span>
                                </div>
                                <div className="summary-item-v2">
                                    <span className="summary-label"><span className="material-symbols-outlined">monitoring</span> ยอดขายสุทธิ</span>
                                    <span className="summary-value" style={{ color: 'var(--success-color)' }}>฿{formatCurrency(dailySummary.netSales)}</span>
                                </div>
                            </div>
                        </footer>
                    </>
                ) : (
                    <ShiftManagementPanel />
                )}
            </div>
        </div>
    );
};

export default OrderManagementScreen;