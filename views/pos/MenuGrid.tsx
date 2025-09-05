import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import MenuCardImage from '../../components/MenuCardImage';
import { MenuItem } from '../../types';
import LayoutControl from './components/LayoutControl';

const MenuGrid: React.FC = () => {
    const {
        searchQuery,
        focusedItem,
        setFocusedItem,
        handleOpenMenuItemModal,
        setShowStartShiftModal,
    } = useApp();
    const showConfirmation = useConfirmation();

    const menuItems = useStore(state => state.menuItems);
    const activeCategory = useStore(state => state.activeCategory);
    const favoriteIds = useStore(state => state.favoriteIds);
    const isMenuLoading = useStore(state => state.isMenuLoading);
    const menuError = useStore(state => state.menuError);
    const handleDeleteItem = useStore(state => state.handleDeleteItem);
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const addToCart = useStore(state => state.addToCart);
    const shopSettings = useStore(state => state.shopSettings);
    const fetchMenuData = useStore(state => state.fetchMenuData);
    const currentShift = useStore(state => state.dailyData?.currentShift);
    const isAdminMode = useStore(state => state.isAdminMode);
    const menuGridColumnsSetting = useStore(state => state.shopSettings.menuGridColumns);

    const [addedItemId, setAddedItemId] = useState<number | null>(null);

    // [Project Elysium] Category-specific icons for placeholders
    const categoryIcons: { [key: string]: string } = {
        'เครื่องดื่ม': 'local_bar',
        'ทาโกะดั้งเดิม': 'ramen_dining',
        'ทาโกะเบคอน': 'outdoor_grill',
        'ทาโกะแซลมอน': 'set_meal',
        'ทาโกะคอมโบ้': 'restaurant_menu',
        'ท็อปปิ้งพิเศษ': 'add_circle',
        'เดลิเวอรี่': 'delivery_dining',
        'ไอศครีม': 'icecream',
        'สินค้าพิเศษ': 'shopping_bag',
        'default': 'takeout_dining'
    };


    // [Project Quantum Grid] Logic for smart column calculation
    const getAutoColumns = () => {
        const screenWidth = window.innerWidth;
        if (screenWidth < 768) return 2;  // Mobile
        if (screenWidth < 1280) return 4; // Tablet / Small Desktop
        if (screenWidth < 1920) return 5; // Default PC
        return 6;                         // Large Screens
    };

    const [effectiveColumns, setEffectiveColumns] = useState(() => {
        return menuGridColumnsSetting === 'auto' ? getAutoColumns() : (menuGridColumnsSetting || 5);
    });

    useEffect(() => {
        const handleResize = () => {
            if (menuGridColumnsSetting === 'auto') {
                setEffectiveColumns(getAutoColumns());
            }
        };
        
        if (menuGridColumnsSetting === 'auto') {
            setEffectiveColumns(getAutoColumns());
        } else {
            setEffectiveColumns(menuGridColumnsSetting || 5); // Fallback to 5 if undefined
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [menuGridColumnsSetting]);


    const filteredMenuItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (query !== '') {
            return menuItems.filter(item => item.name.toLowerCase().includes(query));
        }
        if (activeCategory === 'รายการโปรด') {
            return menuItems.filter(item => favoriteIds.has(item.id));
        }
        return menuItems.filter(item => item.category === activeCategory);
    }, [menuItems, activeCategory, favoriteIds, searchQuery]);

    const onDeleteItem = async (itemId: number, itemName: string) => {
        const confirmed = await showConfirmation({
            title: 'ยืนยันการลบ',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า '${itemName}'?`
        });
        if (confirmed) {
            handleDeleteItem(itemId);
        }
    };

    const handleAddToCartClick = (item: MenuItem) => {
        if (!currentShift) {
            setShowStartShiftModal(true);
        } else {
            addToCart(item);
            setAddedItemId(item.id);
            setTimeout(() => setAddedItemId(null), 750);
        }
    };

    return (
        <section className="menu-section">
            <header className="menu-header">
                <h1>{searchQuery.trim() !== '' ? `ผลการค้นหา` : activeCategory}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isAdminMode && <LayoutControl />}
                    {isAdminMode && activeCategory !== 'รายการโปรด' && searchQuery.trim() === '' && !isMenuLoading && (
                        <div 
                            className="category-list-item add-category-btn" 
                            onClick={() => handleOpenMenuItemModal(null, activeCategory)} 
                            style={{cursor: 'pointer', marginBottom: 0, height: 'auto', minHeight: '44px'}}
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            <span className="category-name">เพิ่มสินค้าใหม่</span>
                        </div>
                    )}
                </div>
            </header>
            {isMenuLoading ? (
                <div className="menu-grid-message" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
                    <span className="material-symbols-outlined sync-icon pending" style={{fontSize: '2rem'}}>sync</span>
                    <p>กำลังโหลดเมนู...</p>
                </div>
            ) : menuError ? (
                <div className="menu-grid-message error-message" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
                    <span className="material-symbols-outlined" style={{fontSize: '2rem', color: 'var(--danger-color)'}}>error</span>
                    <p>{menuError}</p>
                    <p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองอีกครั้ง</p>
                    <button className="action-button" onClick={() => fetchMenuData(true)}>
                        <span className="material-symbols-outlined">refresh</span>
                        ลองอีกครั้ง
                    </button>
                </div>
            ) : (
                <div 
                    className="menu-grid"
                    tabIndex={shopSettings.isKeyboardNavEnabled ? 0 : -1}
                    style={{
                        gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
                        gap: `${Math.max(0.75, 1.5 - (effectiveColumns * 0.1))}rem`
                    }}
                >
                    {filteredMenuItems.length === 0 && searchQuery.trim() !== '' && <p className="menu-grid-message">ไม่พบสินค้าที่ตรงกับ: "{searchQuery}"</p>}
                    {filteredMenuItems.length === 0 && searchQuery.trim() === '' && activeCategory === 'รายการโปรด' && <p className="menu-grid-message">ยังไม่มีรายการโปรด... กด ⭐️ เพื่อเพิ่ม</p>}
                    {filteredMenuItems.length === 0 && searchQuery.trim() === '' && activeCategory !== 'รายการโปรด' && <p className="menu-grid-message">ไม่มีสินค้าในหมวดหมู่นี้</p>}
                    {filteredMenuItems.map((item, index) => {
                        const isFocused = shopSettings.isKeyboardNavEnabled && focusedItem?.pane === 'menu' && focusedItem.index === index;
                        const hasImage = item.offlineImage || item.image;
                        const categoryIcon = categoryIcons[item.category] || categoryIcons.default;
                        
                        return (
                            // [SENTINEL PRIME HOTFIX] --- ARC ---
                            <div 
                                key={item.id} 
                                className={`menu-card ${isFocused ? 'keyboard-focused' : ''} ${addedItemId === item.id ? 'added-to-cart' : ''}`}
                                onClick={() => handleAddToCartClick(item)}
                            >
                                {/* Added Container for the image/placeholder */}
                                <div className="menu-card-image-container">
                                    {hasImage ? (
                                        <MenuCardImage item={item} />
                                    ) : (
                                        <div className="menu-card-placeholder">
                                            <span className="material-symbols-outlined category-icon">
                                                {categoryIcon}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Info Bar */}
                                <div className="menu-card-info">
                                    <h3 className="menu-card-title">{item.name}</h3>
                                    <p className="menu-card-price">
                                        ฿{shopSettings.showDecimalsInPos ? item.price.toFixed(2) : item.price.toFixed(0)}
                                    </p>
                                </div>
                                
                                {/* Admin and Favorite buttons */}
                                {isAdminMode && (
                                    <div className="admin-item-controls">
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id, item.name); }} title="ลบสินค้า"><span className="material-symbols-outlined">delete</span></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenMenuItemModal(item); }} title="แก้ไขสินค้า"><span className="material-symbols-outlined">edit</span></button>
                                    </div>
                                )}
                                <button 
                                    className="menu-card-fav-btn" 
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                                >
                                    <span className={`material-symbols-outlined ${favoriteIds.has(item.id) ? 'filled' : ''}`}>star</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default MenuGrid;