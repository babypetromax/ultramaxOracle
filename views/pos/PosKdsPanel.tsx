import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { KitchenOrder, ShopSettings } from '../../types';
import { useStore } from '../../contexts/store/index';


const TimeAgo: React.FC<{ date: Date; now: Date }> = ({ date, now }) => {
    const timeString = useMemo(() => {
        const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 0) return '0 วิ.';
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
        return { statusText: 'พร้อมส่ง', statusClass: 'ready', buttonText: 'ปิดบิล', buttonIcon: 'takeout_dining' };
    }
    const ageInSeconds = (now.getTime() - new Date(order.timestamp).getTime()) / 1000;
    const cookingThreshold = settings.cookingTimeThresholdMinutes * 60;
    const delayedThreshold = settings.delayedTimeThresholdMinutes * 60;

    if (ageInSeconds < cookingThreshold) { return { statusText: 'เข้าใหม่', statusClass: 'new', buttonText: 'ทำเสร็จแล้ว', buttonIcon: 'check_circle' }; }
    if (ageInSeconds < delayedThreshold) { return { statusText: 'กำลังทำ', statusClass: 'cooking', buttonText: 'ทำเสร็จแล้ว', buttonIcon: 'check_circle' }; }
    return { statusText: 'ล่าช้า', statusClass: 'delayed', buttonText: 'ทำเสร็จแล้ว', buttonIcon: 'check_circle' };
};

const PosKdsPanel: React.FC = () => {
    const { isPosKdsEnabled, setIsPosKdsEnabled, now } = useApp();
    const [isExpanded, setIsExpanded] = useState(true);

    const kitchenOrders = useStore(state => state.dailyData?.kitchenOrders);
    const shopSettings = useStore(state => state.shopSettings);
    const handleUpdateOrderStatus = useStore(state => state.handleUpdateOrderStatus);
    const handleCompleteOrder = useStore(state => state.handleCompleteOrder);
    
    const activeOrders = useMemo(() => {
        if (!kitchenOrders) return [];
        return [...kitchenOrders].sort((a, b) => a.id.localeCompare(b.id));
    }, [kitchenOrders]);

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

    if (!activeOrders || activeOrders.length === 0) {
        return null;
    }

    return (
        <div className={`pos-kds-panel ${isExpanded && isPosKdsEnabled ? 'expanded' : 'collapsed'}`}>
            <header className="pos-kds-header" onClick={() => isPosKdsEnabled && setIsExpanded(!isExpanded)}>
                <div className="pos-kds-header-left">
                    <div className="vat-toggle" onClick={e => e.stopPropagation()}>
                         <label className="switch">
                            <input
                                type="checkbox"
                                checked={isPosKdsEnabled}
                                onChange={(e) => setIsPosKdsEnabled(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div className="pos-kds-title">
                        <span className="material-symbols-outlined">skillet</span>
                        Kitchen Display ({activeOrders.length})
                    </div>
                </div>
                <div className="pos-kds-summary-tags">
                    <span className="summary-tag status-new" title={`บิลเข้าใหม่ (น้อยกว่า ${shopSettings.cookingTimeThresholdMinutes} นาที)`}>
                        <span className="material-symbols-outlined">fiber_new</span> 
                        {kdsSummary.new}
                    </span>
                    <span className="summary-tag status-cooking" title={`กำลังทำ (${shopSettings.cookingTimeThresholdMinutes}-${shopSettings.delayedTimeThresholdMinutes} นาที)`}>
                        <span className="material-symbols-outlined">soup_kitchen</span> 
                        {kdsSummary.cooking}
                    </span>
                    <span className="summary-tag status-delayed" title={`บิลล่าช้า (เกิน ${shopSettings.delayedTimeThresholdMinutes} นาที)`}>
                        <span className="material-symbols-outlined">local_fire_department</span> 
                        {kdsSummary.delayed}
                    </span>
                </div>
            </header>
            <div className={`pos-kds-content-wrapper ${!isPosKdsEnabled ? 'hidden' : ''}`}>
                <div className="pos-kds-content">
                    {activeOrders.map(order => {
                        const dynamicState = getOrderDynamicState(order, now, shopSettings);
                        return (
                            <div key={order.id} className={`pos-kds-card status-${dynamicState.statusClass}`}>
                                <div className="pos-kds-card-header">
                                    <div className="pos-kds-card-title">
                                        <h3>{order.id.slice(-4)}</h3>
                                        <span className={`status-badge status-${dynamicState.statusClass}`}>{dynamicState.statusText}</span>
                                    </div>
                                    <TimeAgo date={order.timestamp} now={now} />
                                </div>
                                <ul className="pos-kds-card-items">
                                    {order.items.map(item => (
                                        <li key={`${order.id}-${item.id}`}>
                                            <span className="item-quantity">{item.quantity}x</span>
                                            <span className="item-name">{item.name}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="pos-kds-card-footer">
                                    <button
                                        className={`kds-action-btn status-${dynamicState.statusClass}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dynamicState.statusClass === 'ready' ? handleCompleteOrder(order.id) : handleUpdateOrderStatus(order.id, 'ready');
                                        }}
                                    >
                                        <span className="material-symbols-outlined">{dynamicState.buttonIcon}</span>
                                        {dynamicState.buttonText}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PosKdsPanel;
