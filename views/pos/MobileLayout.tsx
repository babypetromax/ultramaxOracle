import React from 'react';
import { useApp } from '../../contexts/AppContext';
import CategoryHeader from './mobile/CategoryHeader';
import MobileMenuGrid from './mobile/MobileMenuGrid';
import CartFooter from './mobile/CartFooter';
import OrderPanel from './OrderPanel';

const MobileLayout: React.FC = () => {
    // The OrderPanel is controlled by AppContext and will show as an overlay on mobile
    // Its visibility is handled by the isOrderPanelOpen state.
    return (
        <div className="mobile-layout">
            <CategoryHeader />
            <MobileMenuGrid />
            <CartFooter />
            {/* The OrderPanel component already contains CSS logic to act as an overlay on mobile screens. */}
            <OrderPanel />
        </div>
    );
};

export default MobileLayout;
