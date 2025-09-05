import React, { useMemo, useState } from 'react';
import { useStore } from '../../../contexts/store/index';
import { useApp } from '../../../contexts/AppContext';
import { MenuItem } from '../../../types';
import MenuCardImage from '../../../components/MenuCardImage';

const MobileMenuGrid: React.FC = () => {
    const { setShowStartShiftModal, searchQuery } = useApp();
    const menuItems = useStore(state => state.menuItems);
    const categories = useStore(state => state.categories);
    const activeCategory = useStore(state => state.activeCategory);
    const favoriteIds = useStore(state => state.favoriteIds);
    const addToCart = useStore(state => state.addToCart);
    const currentShift = useStore(state => state.dailyData?.currentShift);
    const shopSettings = useStore(state => state.shopSettings);
    
    const [addedItemId, setAddedItemId] = useState<number | null>(null);

    const handleAddToCartClick = (item: MenuItem) => {
        if (!currentShift) {
            setShowStartShiftModal(true);
        } else {
            addToCart(item);
            setAddedItemId(item.id);
            setTimeout(() => setAddedItemId(null), 750);
        }
    };
    
    const itemsByCategory = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let itemsToProcess = menuItems;

        if (query) {
             itemsToProcess = menuItems.filter(item => item.name.toLowerCase().includes(query));
        } else if (activeCategory === 'รายการโปรด') {
            itemsToProcess = menuItems.filter(item => favoriteIds.has(item.id));
        }

        const grouped: { [key: string]: MenuItem[] } = {};
        itemsToProcess.forEach(item => {
            if (query || activeCategory === 'รายการโปรด' || item.category === activeCategory) {
                 if (!grouped[item.category]) {
                    grouped[item.category] = [];
                }
                grouped[item.category].push(item);
            }
        });
        
        const sortedCategories = [...Object.keys(grouped)].sort((a,b) => a.localeCompare(b));

        return sortedCategories.map(category => ({
            categoryName: category,
            items: grouped[category] || []
        }));

    }, [menuItems, categories, activeCategory, favoriteIds, searchQuery]);


    return (
        <div className="mobile-menu-grid">
            {itemsByCategory.length === 0 && <p className="menu-grid-message">ไม่พบสินค้าที่ค้นหา</p>}
            {itemsByCategory.map(({ categoryName, items }) => (
                <section key={categoryName} className="mobile-menu-category-section">
                    <h2 className="mobile-category-title">{categoryName}</h2>
                    <div className="mobile-menu-list">
                        {items.map(item => (
                            <div 
                                key={item.id} 
                                className={`mobile-menu-card ${addedItemId === item.id ? 'added-to-cart' : ''}`}
                                onClick={() => handleAddToCartClick(item)}
                            >
                                <div className="mobile-menu-card-image">
                                    <MenuCardImage item={item} />
                                </div>
                                <div className="mobile-menu-card-info">
                                    <h3 className="mobile-menu-card-name">{item.name}</h3>
                                    <p className="mobile-menu-card-price">
                                        ฿{shopSettings.showDecimalsInPos ? item.price.toFixed(2) : item.price.toFixed(0)}
                                    </p>
                                </div>
                                <div className="mobile-menu-card-add">
                                    <span className="material-symbols-outlined">add</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default MobileMenuGrid;