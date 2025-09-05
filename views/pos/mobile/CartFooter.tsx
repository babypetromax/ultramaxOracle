import React from 'react';
import { useStore } from '../../../contexts/store/index';
import { useApp } from '../../../contexts/AppContext';
import { formatCurrency } from '../../../helpers';

const CartFooter: React.FC = () => {
    const totalItems = useStore(state => state.totalItems);
    const totalPrice = useStore(state => state.totalPrice);
    const { setIsOrderPanelOpen } = useApp();

    if (totalItems === 0) {
        return null;
    }

    return (
        <div className="mobile-cart-footer">
            <div className="mobile-cart-summary">
                <span className="item-count">{totalItems} รายการ</span>
                <span className="total-price">฿{formatCurrency(totalPrice)}</span>
            </div>
            <button className="view-cart-button" onClick={() => setIsOrderPanelOpen(true)}>
                <span>ดูตะกร้า</span>
                <span className="material-symbols-outlined">shopping_cart</span>
            </button>
        </div>
    );
};
export default CartFooter;