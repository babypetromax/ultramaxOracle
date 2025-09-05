/**
 * @file components/TopNav.tsx
 * @version 2.2.0 (Project Chroma & Hydra Integration)
 * @author UltraMax Devs Team
 */
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useStore } from '../contexts/store/index';
import ThemeSelectorModal from './modals/ThemeSelectorModal';


const TopNav: React.FC = React.memo(() => {
    const { 
        view, 
        setView, 
        currentDate, 
        setShowAdminLoginModal, 
        handleZoomOut, 
        handleZoomIn, 
        setIsOrderPanelOpen,
        // [HYDRA V1.1 HOTFIX] --- ARC ---
        setIsCategoryPanelCollapsed,
        setIsOrderPanelCollapsed
    } = useApp();

    const fetchMenuData = useStore(state => state.fetchMenuData);
    const cartItemCount = useStore(state => state.totalItems);
    const isAdminMode = useStore(state => state.isAdminMode);
    const toggleAdminMode = useStore(state => state.toggleAdminMode);
    // FIX: Get theme state from the central Zustand store.
    const currentTheme = useStore(state => state.shopSettings.theme);
    
    const [isCartAnimating, setIsCartAnimating] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [novaflare, setNovaflare] = useState(false);

    useEffect(() => {
        if (cartItemCount > 0) {
            setIsCartAnimating(true);
            const timer = setTimeout(() => setIsCartAnimating(false), 800);
            return () => clearTimeout(timer);
        }
    }, [cartItemCount]);

    const handleAdminToggle = () => {
        if (isAdminMode) {
            if (view === 'ai-dashboard') setView('pos');
            toggleAdminMode('');
        } else {
            setShowAdminLoginModal(true);
        }
    };
    
    const handleThemeClick = () => {
        setNovaflare(true);
        setShowThemeModal(true);
        setTimeout(() => setNovaflare(false), 500); // Duration of the novaflare animation
    };

    const lightThemes = ['theme-zenith', 'theme-cherry-soda', 'theme-mindful-morning'];
    const isLightTheme = lightThemes.includes(currentTheme);

    return (
        <>
            <nav className="top-nav">
                <div className="nav-left" style={{ display: 'flex', alignItems: 'center' }}>
                    {/* [HYDRA V1.1 HOTFIX] --- ARC --- */}
                    {view === 'pos' && (
                        <button 
                            className="control-btn hydra-toggle-btn" 
                            onClick={() => setIsCategoryPanelCollapsed(prev => !prev)}
                            title="แสดง/ซ่อนหมวดหมู่"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    )}
                    <div className="logo">
                        <img src="https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/Ultramax_logo_squar.png" alt="Logo" />
                        <span>UltraMax POS V9.95</span>
                    </div>
                </div>
                <div className="nav-buttons">
                    <button className={`nav-button ${view === 'pos' ? 'active' : ''}`} onClick={() => setView('pos')}>
                        <span className="material-symbols-outlined">point_of_sale</span> <span>ขาย</span>
                    </button>
                    <button className={`nav-button ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
                        <span className="material-symbols-outlined">receipt_long</span> <span>บิลขาย</span>
                    </button>
                    <button className={`nav-button ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
                        <span className="material-symbols-outlined">bar_chart</span> <span>รายงาน</span>
                    </button>
                    {isAdminMode && (
                        <button className={`nav-button ${view === 'ai-dashboard' ? 'active' : ''}`} onClick={() => setView('ai-dashboard')}>
                            <span className="material-symbols-outlined">smart_toy</span> <span>Ultra AI</span>
                        </button>
                    )}
                    <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
                        <span className="material-symbols-outlined">settings</span> <span>ตั้งค่า</span>
                    </button>
                </div>
                <div className="nav-right">
                    <div className="date-display">{currentDate}</div>
                    <div className="app-controls">
                         {isAdminMode && (
                            <button className="control-btn" onClick={() => fetchMenuData(true)} title="รีเฟรชข้อมูลเมนู">
                                <span className="material-symbols-outlined">refresh</span>
                            </button>
                        )}
                        {(view === 'pos' || view === 'orders' || view === 'settings' || view === 'reports' || view === 'ai-dashboard') && (
                             <button className={`control-btn admin-toggle ${isAdminMode ? 'active' : ''}`} onClick={handleAdminToggle} title={isAdminMode ? 'ออกจากโหมดแก้ไข' : 'แก้ไขเมนู/บิล/ตั้งค่า'}>
                                <span className="material-symbols-outlined">{isAdminMode ? 'lock_open' : 'lock'}</span>
                            </button>
                        )}
                        <div className="theme-selector-container">
                            <button 
                                className={`control-btn ${novaflare ? 'novaflare-icon' : ''}`} 
                                onClick={handleThemeClick}
                                title="เปลี่ยนธีม"
                            >
                                <span className="material-symbols-outlined">
                                    {isLightTheme ? 'light_mode' : 'dark_mode'}
                                </span>
                            </button>
                        </div>
                        <button className="control-btn" onClick={handleZoomOut} title="ลดขนาด">
                            <span className="material-symbols-outlined">zoom_out</span>
                        </button>
                        <button className="control-btn" onClick={handleZoomIn} title="เพิ่มขนาด">
                            <span className="material-symbols-outlined">zoom_in</span>
                        </button>
                    </div>
                    {/* [HYDRA V1.1 HOTFIX] --- ARC --- */}
                    {view === 'pos' && (
                        <button 
                            className="control-btn hydra-toggle-btn"
                            onClick={() => setIsOrderPanelCollapsed(prev => !prev)}
                            title="แสดง/ซ่อนออเดอร์"
                        >
                            <span className="material-symbols-outlined">shopping_cart</span>
                        </button>
                    )}
                    <button className={`cart-toggle-btn ${isCartAnimating ? 'cart-updated' : ''}`} onClick={() => setIsOrderPanelOpen(prev => !prev)}>
                        <span className="material-symbols-outlined">shopping_cart</span>
                        {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
                    </button>
                </div>
            </nav>
            {showThemeModal && <ThemeSelectorModal onClose={() => setShowThemeModal(false)} />}
        </>
    );
});

export default TopNav;