import React from 'react';
import { useStore } from '../../../contexts/store/index';
import { ShopSettings } from '../../../types';

const LayoutControl: React.FC = () => {
    const shopSettings = useStore(state => state.shopSettings);
    const setShopSettings = useStore(state => state.setShopSettings);

    const handleModeToggle = () => {
        const newMode = shopSettings.menuGridColumns === 'auto' ? 5 : 'auto'; // Default to 5 when switching from auto
        const newSettings: ShopSettings = { ...shopSettings, menuGridColumns: newMode };
        setShopSettings(newSettings);
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColumns = Number(e.target.value);
        const newSettings: ShopSettings = { ...shopSettings, menuGridColumns: newColumns };
        setShopSettings(newSettings);
    };
    
    const isAutoMode = shopSettings.menuGridColumns === 'auto';
    const sliderValue = typeof shopSettings.menuGridColumns === 'number' ? shopSettings.menuGridColumns : 5; // Use 5 as a placeholder value for the slider when in auto mode

    return (
        <div className="layout-control-container">
            <button 
                className={`control-btn auto-mode-btn ${isAutoMode ? 'active' : ''}`} 
                onClick={handleModeToggle}
                title={isAutoMode ? "Switch to Manual Layout" : "Switch to Smart Layout (Recommended)"}
            >
                <span className="material-symbols-outlined">auto_awesome</span>
            </button>
            <div className={`slider-wrapper ${isAutoMode ? 'disabled' : ''}`}>
                <span className="material-symbols-outlined">grid_view</span>
                <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    step="1"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="column-slider"
                    disabled={isAutoMode}
                />
                <span className="column-display">{isAutoMode ? 'Auto' : sliderValue}</span>
            </div>
        </div>
    );
};

export default LayoutControl;
