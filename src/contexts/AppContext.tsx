import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { MenuItem, Order } from '../types';
import { Logger } from '../services/loggingService';
import { useStore } from './store/index';

type View = 'pos' | 'orders' | 'reports' | 'settings' | 'ai-dashboard';

interface AppContextType {
    view: View;
    setView: React.Dispatch<React.SetStateAction<View>>;
    currentDate: string;
    showPaymentModal: boolean;
    setShowPaymentModal: React.Dispatch<React.SetStateAction<boolean>>;
    showReceiptModal: boolean;
    setShowReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
    receiptData: (Order & { cashReceived?: number; }) | null;
    setReceiptData: React.Dispatch<React.SetStateAction<(Order & { cashReceived?: number; }) | null>>;
    showAdminLoginModal: boolean;
    setShowAdminLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
    showMenuItemModal: boolean;
    setShowMenuItemModal: React.Dispatch<React.SetStateAction<boolean>>;
    editingItem: MenuItem | { category: string; } | null;
    handleOpenMenuItemModal: (item: MenuItem | null, category?: string) => void;
    showStartShiftModal: boolean;
    setShowStartShiftModal: React.Dispatch<React.SetStateAction<boolean>>;
    showEndShiftModal: boolean;
    setShowEndShiftModal: React.Dispatch<React.SetStateAction<boolean>>;
    showPaidInOutModal: boolean;
    setShowPaidInOutModal: React.Dispatch<React.SetStateAction<boolean>>;
    isOrderPanelOpen: boolean;
    setIsOrderPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isPosKdsEnabled: boolean;
    setIsPosKdsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    focusedItem: { pane: 'categories' | 'menu'; index: number; } | null;
    setFocusedItem: React.Dispatch<React.SetStateAction<{ pane: 'categories' | 'menu'; index: number; } | null>>;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    now: Date;
    // [HYDRA V1.0 UPGRADE] --- FLUX ---
    isCategoryPanelCollapsed: boolean;
    setIsCategoryPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    isOrderPanelCollapsed: boolean;
    setIsOrderPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const isAdminMode = useStore(state => state.isAdminMode);
    // --- PROJECT CHROMA CHANGE: Get theme from the central store ---
    const theme = useStore(state => state.shopSettings.theme);

    const [view, setView] = useState<View>('pos');
    const [currentDate, setCurrentDate] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptData, setReceiptData] = useState<(Order & { cashReceived?: number }) | null>(null);
    const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
    const [showMenuItemModal, setShowMenuItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | { category: string } | null>(null);
    const [showStartShiftModal, setShowStartShiftModal] = useState(false);
    const [showEndShiftModal, setShowEndShiftModal] = useState(false);
    const [showPaidInOutModal, setShowPaidInOutModal] = useState(false);
    const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(window.innerWidth > 992);
    const [isPosKdsEnabled, setIsPosKdsEnabled] = useState(true);
    const [focusedItem, setFocusedItem] = useState<{ pane: 'categories' | 'menu'; index: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [now, setNow] = useState(new Date());

    // [HYDRA V1.1 HOTFIX] --- FLUX ---
    // State to control panel collapse, initialized based on screen width.
    // This fixes the bug where panels start collapsed on desktop.
    const [isCategoryPanelCollapsed, setIsCategoryPanelCollapsed] = useState(window.innerWidth <= 992);
    const [isOrderPanelCollapsed, setIsOrderPanelCollapsed] = useState(window.innerWidth <= 992);

    useEffect(() => {
        // --- PROJECT CHROMA CHANGE: Apply the theme class from the store ---
        document.body.className = theme || 'theme-original'; // Fallback to a default theme
        
        setCurrentDate(new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }));
        const handleResize = () => {
             // Original logic for Mobile Overlay (which uses a different button)
            if (window.innerWidth <= 768) {
                setIsOrderPanelOpen(false);
            } else {
                setIsOrderPanelOpen(true);
            }
        };
        
        const timerId = setInterval(() => setNow(new Date()), 10000);

        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(timerId);
        };
    }, [theme]); // Depend on the theme from the store

    const handleOpenMenuItemModal = useCallback((item: MenuItem | null, category?: string) => {
        if (!isAdminMode) return;
        setEditingItem(item || { category: category || '' });
        setShowMenuItemModal(true);
    }, [isAdminMode]);

    const handleZoom = (direction: 'in' | 'out') => {
        const currentZoom = parseFloat(document.documentElement.style.fontSize || '16')
        const newZoom = direction === 'in' ? currentZoom + 1 : currentZoom - 1;
        if (newZoom >= 12 && newZoom <= 20) {
            document.documentElement.style.fontSize = `${newZoom}px`;
            Logger.action('Zoom', { direction, newSize: `${newZoom}px` });
        }
    }
    const handleZoomIn = () => handleZoom('in');
    const handleZoomOut = () => handleZoom('out');

    const value: AppContextType = {
        view, setView, currentDate, 
        showPaymentModal, setShowPaymentModal, 
        showReceiptModal, setShowReceiptModal, 
        receiptData, setReceiptData,
        showAdminLoginModal, setShowAdminLoginModal, 
        showMenuItemModal, setShowMenuItemModal,
        editingItem, handleOpenMenuItemModal, 
        showStartShiftModal, setShowStartShiftModal,
        showEndShiftModal, setShowEndShiftModal, 
        showPaidInOutModal, setShowPaidInOutModal,
        isOrderPanelOpen, setIsOrderPanelOpen, 
        isPosKdsEnabled, setIsPosKdsEnabled, 
        focusedItem, setFocusedItem,
        searchQuery, setSearchQuery, 
        handleZoomIn, handleZoomOut,
        now,
        isCategoryPanelCollapsed, setIsCategoryPanelCollapsed,
        isOrderPanelCollapsed, setIsOrderPanelCollapsed,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};