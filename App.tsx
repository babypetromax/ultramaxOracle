import React, { useEffect, useState } from 'react';
// FIX: Corrected the import path to the new store index file.
import { useStore, useNotificationInStore } from './contexts/store/index';
import { AppProvider, useApp } from './contexts/AppContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

import TopNav from './components/TopNav';
import PosView from './views/pos/PosView';
import OrderManagementScreen from './views/orders/OrderManagementScreen';
import ReportsScreen from './views/reports/ReportsScreen';
import SettingsScreen from './views/settings/SettingsScreen';
import UltraAIDashboard from './views/ai/UltraAIDashboard';
import PaymentModal from './components/modals/PaymentModal';
import ReceiptModal from './components/modals/ReceiptModal';
import AdminLoginModal from './components/modals/AdminLoginModal';
import MenuItemModal from './components/modals/MenuItemModal';
import { StartShiftModal, PaidInOutModal, EndShiftModal } from './components/modals/ShiftModals';
import NotificationContainer from './components/NotificationContainer';
import ErrorBoundary from './lib/ErrorBoundary';
import OracleHomeScreen from './views/home/OracleHomeScreen';
import { useAppInitializer } from './hooks/useAppInitializer'; // <-- [ARCHANGEL] IMPORT THE NEW HOOK

const AppContent = () => {
    // [ARCHANGEL PROTOCOL] All complex startup logic is now handled by the custom hook.
    useAppInitializer();

    const { 
        view, 
        showPaymentModal, 
        showReceiptModal, 
        showAdminLoginModal, 
        showMenuItemModal,
        showStartShiftModal,
        showEndShiftModal,
        showPaidInOutModal
    } = useApp();
    
    const shopSettings = useStore(state => state.shopSettings);
    const isAdminMode = useStore(state => state.isAdminMode);
    const { notifications, removeNotification, showNotification } = useNotification();

    // === CHRONOS SYNC CONTROL: Logic ===
    const syncIntervalMinutes = useStore(state => state.shopSettings.syncIntervalMinutes);
    const isAutoSyncEnabled = useStore(state => state.shopSettings.isAutoSyncEnabled);
    const syncOrders = useStore(state => state.syncOrders);
    
    useEffect(() => {
        let timerId: number | undefined;
        const intervalMs = (syncIntervalMinutes || 15) * 60 * 1000;

        if (isAutoSyncEnabled && intervalMs > 0) {
            timerId = window.setInterval(() => {
                if (!useStore.getState().isSyncing) {
                    syncOrders();
                }
            }, intervalMs);
        }
        
        return () => {
            if (timerId) {
                clearInterval(timerId);
            }
        };
    }, [syncIntervalMinutes, isAutoSyncEnabled, syncOrders]);
    // === END CHRONOS SYNC CONTROL ===

    useNotificationInStore(showNotification);

    // [ARCHANGEL PROTOCOL] The old, buggy initialization useEffect hooks have been REMOVED from this component
    // and are now correctly handled in the useAppInitializer hook.
    
    // [SURGICAL FIX] Use an atomic selector that returns a primitive boolean.
    // This prevents the entire app from re-rendering every time any part of dailyData changes.
    const isInitialized = useStore(state => state.dailyData !== null);
    
    if (!isInitialized) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <img src="https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/Ultramax_logo_squar.png" alt="Loading Logo" style={{ width: '3rem', height: '3rem' }} className="sync-icon pending" />
                <p>กำลังเตรียมข้อมูลเริ่มต้น...</p>
            </div>
        );
    }

    return (
        <div className={`app-container ${shopSettings.interactionMode === 'touch' ? 'touch-mode' : ''}`}>
            <NotificationContainer notifications={notifications} onClose={removeNotification} />
            <TopNav />
            {view === 'pos' && <PosView />}
            {view === 'orders' && <OrderManagementScreen />}
            {view === 'reports' && <ReportsScreen />}
            {view === 'ai-dashboard' && isAdminMode && <UltraAIDashboard />}
            {view === 'settings' && <SettingsScreen />}
            
            {showPaymentModal && <PaymentModal />}
            {showReceiptModal && <ReceiptModal />}
            {showAdminLoginModal && <AdminLoginModal />}
            {showMenuItemModal && <MenuItemModal />}
            {showStartShiftModal && <StartShiftModal />}
            {showPaidInOutModal && <PaidInOutModal />}
            {showEndShiftModal && <EndShiftModal />}
        </div>
    );
}

const AppWrapper = () => {
    // We get showNotification here because ErrorBoundary needs it, and this wrapper is inside the NotificationProvider.
    const { showNotification } = useNotification();
    return (
        <ErrorBoundary showNotification={showNotification} componentName="AppContent">
            <AppContent />
        </ErrorBoundary>
    );
};

const App = () => {
    // 1. State to control the visibility of the Oracle splash screen.
    const [showOracleScreen, setShowOracleScreen] = useState(true);

    // 2. Handler function to transition from the splash screen to the main app.
    const handleStartApp = () => {
      setShowOracleScreen(false);
    };

    // 3. Conditional rendering: Show the Oracle screen first.
    if (showOracleScreen) {
      return <OracleHomeScreen onStart={handleStartApp} />;
    }
    
    // 4. Once started, render the main application with all its providers.
    return (
        <ConfirmationProvider>
            <NotificationProvider>
                <AppProvider>
                    <AppWrapper />
                </AppProvider>
            </NotificationProvider>
        </ConfirmationProvider>
    );
};

export default App;