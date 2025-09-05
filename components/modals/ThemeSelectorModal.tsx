// src/components/modals/ThemeSelectorModal.tsx

import React from 'react';
import { useStore } from '../../contexts/store/index';

const themes = [
    { id: 'theme-original', name: 'UltraMax Original', icon: 'deployed_code', preview: 'linear-gradient(135deg, #111827, #3b82f6)' },
    { id: 'theme-mars-dusk', name: 'Mars Dusk', icon: 'coffee', preview: 'linear-gradient(135deg, #683924, #A57865)' },
    { id: 'theme-zenith', name: 'Zenith', icon: 'light_mode', preview: 'linear-gradient(135deg, #f9fafb, #4f46e5)' },
    { id: 'theme-serene-gray', name: 'Serene Gray', icon: 'vignette', preview: 'linear-gradient(135deg, #374151, #E5E7EB)' },
    { id: 'theme-avocado-bliss', name: 'Avocado Bliss', icon: 'eco', preview: 'linear-gradient(135deg, #4C553C, #F5F3E9)' },
    { id: 'theme-oceanic', name: 'Oceanic', icon: 'water_drop', preview: 'linear-gradient(135deg, #0D273D, #8AA7BC)' },
    { id: 'theme-crimson-red', name: 'Crimson Red', icon: 'whatshot', preview: 'linear-gradient(135deg, #630000, #EDEBBD)' },
    { id: 'theme-cherry-soda', name: 'Cherry Soda', icon: 'favorite', preview: 'linear-gradient(135deg, #A55166, #F7DAE7)' },
    { id: 'theme-russian-violet', name: 'Russian Violet', icon: 'filter_vintage', preview: 'linear-gradient(135deg, #391B49, #9570C6)' },
    { id: 'theme-mindful-morning', name: 'Mindful Morning', icon: 'gradient', preview: 'linear-gradient(135deg, #0F2D4D, #A77693, #DED1C6)' },
    // [PHOENIX FIX] Updated Banana Republic Preview
    { id: 'theme-banana-republic', name: 'Banana Republic', icon: 'emoji_food_beverage', preview: 'linear-gradient(135deg, #FDF8E1, #EAB248)' },
];

interface ThemeSelectorModalProps {
    onClose: () => void;
}

const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ onClose }) => {
    const currentTheme = useStore(state => state.shopSettings.theme);
    const setTheme = useStore(state => state.setTheme);

    const handleThemeSelect = (themeId: string) => {
        setTheme(themeId);
        onClose();
    };
    
    // Live Preview on Hover
    const handleHover = (themeId: string) => {
        document.body.className = themeId;
    };

    const handleMouseLeave = () => {
        document.body.className = currentTheme;
    };

    return (
        <div className="theme-modal-overlay" onClick={onClose} onMouseLeave={handleMouseLeave}>
            <div className="theme-modal-content" onClick={e => e.stopPropagation()}>
                <div className="theme-modal-header">
                    <div>
                        <h2 className="theme-modal-title">เลือกธีมของคุณ</h2>
                        <p className="theme-modal-subtitle">ปรับเปลี่ยนหน้าจอให้เป็นสไตล์ที่บ่งบอกความเป็นคุณ</p>
                    </div>
                    <button onClick={onClose} className="close-modal-btn">&times;</button>
                </div>
                <div className="theme-grid">
                    {themes.map(theme => (
                        <div
                            key={theme.id}
                            className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}
                            onClick={() => handleThemeSelect(theme.id)}
                            onMouseEnter={() => handleHover(theme.id)}
                        >
                            <div className="theme-preview" style={{ background: theme.preview }}></div>
                            <div className="theme-info">
                                <span className="material-symbols-outlined">{theme.icon}</span>
                                <span className="theme-name">{theme.name}</span>
                            </div>
                            <div className="novaflare-effect"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThemeSelectorModal;
