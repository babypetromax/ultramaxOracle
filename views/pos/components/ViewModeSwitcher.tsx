import React from 'react';
import { useStore } from '../../../contexts/store/index';
import { ShopSettings } from '../../../types';

const ViewModeSwitcher: React.FC = () => {
    const { posViewMode, setShopSettings, shopSettings } = useStore(state => ({
        posViewMode: state.shopSettings.posViewMode,
        setShopSettings: state.setShopSettings,
        shopSettings: state.shopSettings
    }));

    const handleModeChange = (mode: 'grid' | 'list') => {
        const newSettings: ShopSettings = { ...shopSettings, posViewMode: mode };
        setShopSettings(newSettings);
    };

    const currentMode = posViewMode || 'grid';

    return (
        <div className="view-mode-switcher">
            <button
                className={`switcher-btn ${currentMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleModeChange('grid')}
                title="Grid View"
                aria-pressed={currentMode === 'grid'}
            >
                <span className="material-symbols-outlined">grid_view</span>
                Grid
            </button>
            <button
                className={`switcher-btn ${currentMode === 'list' ? 'active' : ''}`}
                onClick={() => handleModeChange('list')}
                title="List View"
                aria-pressed={currentMode === 'list'}
            >
                <span className="material-symbols-outlined">view_list</span>
                List
            </button>
        </div>
    );
};

export default ViewModeSwitcher;
