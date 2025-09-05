import React, { useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../../contexts/store/index';
import { useApp } from '../../../contexts/AppContext';

const CategoryHeader: React.FC = () => {
    const categories = useStore(state => state.categories);
    const activeCategory = useStore(state => state.activeCategory);
    const setActiveCategory = useStore(state => state.setActiveCategory);
    const { setSearchQuery } = useApp();
    const activeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeCategory]);
    
    const pinnedCategories = useStore(state => state.pinnedCategories);
    const categoryOrder = useStore(state => state.categoryOrder);
    
    const navCategories = useMemo(() => {
        const nonFavoriteCategories = categories.filter(c => c !== 'รายการโปรด');
        let sortedCategories = [...nonFavoriteCategories];
        if (categoryOrder && categoryOrder.length > 0) {
            sortedCategories.sort((a, b) => {
                const indexA = categoryOrder.indexOf(a);
                const indexB = categoryOrder.indexOf(b);
                if (indexA === -1) return 1; if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }
        const pinned = sortedCategories.filter(c => pinnedCategories.includes(c));
        const unpinned = sortedCategories.filter(c => !pinnedCategories.includes(c));
        return ['รายการโปรด', ...pinned, ...unpinned];
    }, [categories, pinnedCategories, categoryOrder]);


    return (
        <div className="mobile-category-header">
            {navCategories.map(cat => (
                <button
                    key={cat}
                    ref={cat === activeCategory ? activeRef : null}
                    className={`mobile-category-chip ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                        setSearchQuery('');
                        setActiveCategory(cat);
                    }}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
};

export default CategoryHeader;