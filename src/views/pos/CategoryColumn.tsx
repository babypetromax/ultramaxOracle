import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';

// [HYDRA V1.1 HOTFIX] Add className prop
const CategoryColumn: React.FC<{ className?: string }> = ({ className }) => {
    const { searchQuery, setSearchQuery, setFocusedItem, focusedItem } = useApp();
    const showConfirmation = useConfirmation();

    const categories = useStore(state => state.categories);
    const activeCategory = useStore(state => state.activeCategory);
    const setActiveCategory = useStore(state => state.setActiveCategory);
    const handleDeleteCategory = useStore(state => state.handleDeleteCategory);
    const handleAddCategory = useStore(state => state.handleAddCategory);
    const shopSettings = useStore(state => state.shopSettings);
    const isAdminMode = useStore(state => state.isAdminMode);
    const pinnedCategories = useStore(state => state.pinnedCategories);
    const setPinnedCategories = useStore(state => state.setPinnedCategories);
    const categoryOrder = useStore(state => state.categoryOrder);
    // const setCategoryOrder = useStore(state => state.setCategoryOrder); // For drag-and-drop

    // [SYNAPSE] Intelligent Icon Mapping
    const getCategoryIcon = (categoryName: string): string => {
        const lowerCaseName = categoryName.toLowerCase();
        if (lowerCaseName.includes('โปรด')) return 'star';
        if (lowerCaseName.includes('แซลมอน')) return 'set_meal';
        if (lowerCaseName.includes('เบคอน')) return 'outdoor_grill';
        if (lowerCaseName.includes('เครื่องดื่ม')) return 'local_bar';
        if (lowerCaseName.includes('ไอศครีม')) return 'icecream';
        if (lowerCaseName.includes('ท็อปปิ้ง')) return 'add_circle';
        if (lowerCaseName.includes('เดลิเวอรี่')) return 'delivery_dining';
        if (lowerCaseName.includes('คอมโบ')) return 'restaurant_menu';
        if (lowerCaseName.includes('พิเศษ')) return 'shopping_bag';
        if (lowerCaseName.includes('ดั้งเดิม')) return 'ramen_dining';
        return 'label'; // Fallback icon
    };
    
    // [ARC] New sorting logic for categories
    const navCategories = useMemo(() => {
        const nonFavoriteCategories = categories.filter(c => c !== 'รายการโปรด');
        
        let sortedCategories = [...nonFavoriteCategories];
        if (categoryOrder && categoryOrder.length > 0) {
            sortedCategories.sort((a, b) => {
                const indexA = categoryOrder.indexOf(a);
                const indexB = categoryOrder.indexOf(b);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }
        
        const pinned = sortedCategories.filter(c => pinnedCategories.includes(c));
        const unpinned = sortedCategories.filter(c => !pinnedCategories.includes(c));

        return ['รายการโปรด', ...pinned, ...unpinned];
    }, [categories, pinnedCategories, categoryOrder]);
    
    const onAddCategory = () => {
        if (!isAdminMode) return;
        const newCategoryName = prompt('กรุณาใส่ชื่อหมวดหมู่ใหม่:');
        if (newCategoryName && newCategoryName.trim() !== '') {
            handleAddCategory(newCategoryName.trim());
        }
    };

    const onDeleteCategory = async (cat: string) => {
        if (!isAdminMode) return;
        const confirmed = await showConfirmation({
            title: 'ยืนยันการลบหมวดหมู่',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ '${cat}'? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        });
        if (confirmed) {
            handleDeleteCategory(cat);
        }
    };

    const handlePinToggle = (cat: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newPinned = [...pinnedCategories];
        const index = newPinned.indexOf(cat);
        if (index > -1) {
            newPinned.splice(index, 1);
        } else {
            newPinned.push(cat);
        }
        setPinnedCategories(newPinned);
    };

    return (
        <aside className={`category-column ${className || ''}`}>
            <div className="search-bar-container">
                 <span className="material-symbols-outlined search-icon">search</span>
                 <input
                    type="text"
                    placeholder="ค้นหาเมนู (เช่น แซลมอน)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="menu-search-input"
                    onFocus={() => setFocusedItem(null)}
                 />
            </div>
            <h2>หมวดหมู่</h2>
            {/* Note: Drag-and-Drop context would wrap this list in a real implementation */}
            <ul className="category-list"
                tabIndex={shopSettings.isKeyboardNavEnabled ? 0 : -1}
                onFocus={() => {
                    if (shopSettings.isKeyboardNavEnabled && focusedItem?.pane !== 'categories') {
                        setFocusedItem({ pane: 'categories', index: navCategories.indexOf(activeCategory) ?? 0 });
                    }
                }}
            >
                {navCategories.map((cat, index) => {
                    const isFocused = shopSettings.isKeyboardNavEnabled && focusedItem?.pane === 'categories' && focusedItem.index === index;
                    return (
                        <li key={cat}
                            className={`category-list-item ${activeCategory === cat && searchQuery.trim() === '' ? 'active' : ''} ${isFocused ? 'keyboard-focused' : ''}`}
                            onClick={() => {
                                setSearchQuery('');
                                setActiveCategory(cat);
                            }}>
                            <span className={`material-symbols-outlined ${cat === 'รายการโปรด' ? 'favorite-icon' : ''}`}>{getCategoryIcon(cat)}</span>
                            <span className="category-name">{cat}</span>
                            
                            {cat !== 'รายการโปรด' && (
                                <button className="pin-category-btn" onClick={(e) => handlePinToggle(cat, e)} title={pinnedCategories.includes(cat) ? 'ถอดหมุด' : 'ปักหมุด'}>
                                    <span className={`material-symbols-outlined ${pinnedCategories.includes(cat) ? 'pinned' : ''}`}>
                                        push_pin
                                    </span>
                                </button>
                            )}
                            
                            {isAdminMode && cat !== 'รายการโปรด' && (
                                 <button className="delete-category-btn" onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat); }} title="ลบหมวดหมู่">&times;</button>
                            )}
                        </li>
                    );
                })}
                {isAdminMode && (
                    <li className="category-list-item add-category-btn" onClick={onAddCategory}>
                        <span className="material-symbols-outlined">add_circle</span>
                        <span className="category-name">เพิ่มหมวดหมู่</span>
                    </li>
                )}
            </ul>
        </aside>
    );
};

export default CategoryColumn;
