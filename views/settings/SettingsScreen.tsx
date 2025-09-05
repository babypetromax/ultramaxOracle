import React, { useState, useEffect } from 'react';
import GeneralSettings from './GeneralSettings';
import SmartReceiptEditor from './SmartReceiptEditor';
import FeatureSettings from './FeatureSettings';
import SecuritySettings from './SecuritySettings';
import DataManagement from './DataManagement';
import DatabaseSettings from './DatabaseSettings';
import SentinelLogReport from '../reports/SentinelLogReport';
import { useStore } from '../../contexts/store/index';
import StockStatus from '../inventory/StockStatus';
import SentinelDiagnostics from '../../components/developer/SentinelDiagnostics';
import { exportLogsAsJson } from '../../lib/sentinelLogger';

type SettingTab = 'general' | 'receipts' | 'features' | 'database' | 'security' | 'data' | 'sentinelCommand' | 'inventory';

const SettingsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingTab>('general');
    const isAdminMode = useStore(state => state.isAdminMode);
    const isSentinelLoggerEnabled = useStore(state => state.shopSettings.isSentinelLoggerEnabled);
    const toggleSentinelLogger = useStore(state => state.toggleSentinelLogger);
    
    // Base tabs visible to everyone
    const baseTabs: {id: SettingTab, name: string, icon: string}[] = [
      {id: 'general', name: 'ตั้งค่าทั่วไป', icon: 'storefront'},
      {id: 'receipts', name: 'ใบเสร็จ & โปรโมชั่น', icon: 'receipt_long'},
      {id: 'features', name: 'โหมด & การใช้งาน', icon: 'toggle_on'},
      {id: 'database', name: 'ฐานข้อมูล (Sheet)', icon: 'database'},
      {id: 'inventory', name: 'สต็อกสินค้า', icon: 'inventory'},
      {id: 'data', name: 'จัดการข้อมูล', icon: 'backup'},
      {id: 'security', name: 'ผู้ใช้ & ความปลอดภัย', icon: 'lock'},
    ];
    
    // Conditionally add the admin-only tab
    // FIX: Explicitly type the 'tabs' variable to resolve a type inference issue.
    const tabs: {id: SettingTab, name: string, icon: string}[] = isAdminMode ? [...baseTabs, {id: 'sentinelCommand', name: 'Sentinel Command', icon: 'bug_report'}] : baseTabs;

    useEffect(() => {
        // If admin mode is turned off while on the admin tab, switch to a safe tab
        if (!isAdminMode && activeTab === 'sentinelCommand') {
            setActiveTab('general');
        }
    }, [isAdminMode, activeTab]);
    
    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings />;
            case 'receipts': return <SmartReceiptEditor />;
            case 'features': return <FeatureSettings />;
            case 'database': return <DatabaseSettings />;
            case 'inventory': return <StockStatus />;
            case 'security': return <SecuritySettings />;
            case 'data': return <DataManagement />;
            case 'sentinelCommand':
                if (!isAdminMode) return null;
                return (
                    <div>
                        <SentinelDiagnostics />

                        <div className="settings-divider"></div>

                        <div className="settings-card">
                            <h3>Legacy Logging Tools</h3>
                             <div className="settings-item">
                                <label htmlFor="sentinel-logger-toggle">
                                    Enable Raw Event Logger
                                    <small>Enables detailed low-level event logging for deep debugging. Useful for developers.</small>
                                </label>
                                <div className="switch">
                                    <input
                                        id="sentinel-logger-toggle"
                                        type="checkbox"
                                        checked={isSentinelLoggerEnabled}
                                        onChange={(e) => toggleSentinelLogger(e.target.checked)}
                                    />
                                    <span className="slider"></span>
                                </div>
                            </div>
                            <div className="settings-item">
                               <label>
                                   Export Raw Logs
                                   <small>Download all event logs captured in the current session as a JSON file.</small>
                                </label>
                               <button className="action-button secondary" onClick={exportLogsAsJson}>
                                    <span className="material-symbols-outlined">download</span>
                                    Export Logs
                               </button>
                            </div>
                        </div>

                        <div className="settings-divider"></div>

                        <div className="settings-card">
                             <div className="report-header" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <h3>Raw Event Log Viewer</h3>
                                    <p className="text-secondary" style={{marginTop: '0.25rem'}}>
                                        View detailed, low-level event logs for deep debugging. This data is useful for developers to trace state changes.
                                    </p>
                                </div>
                            </div>
                             <SentinelLogReport />
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    const getPageTitle = () => {
        const currentTab = tabs.find(t => t.id === activeTab);
        return currentTab ? currentTab.name : 'Settings';
    };


    return (
        <div className="settings-screen">
            <nav className="settings-nav">
                <h2>ตั้งค่า</h2>
                <ul className="settings-nav-list">
                    {tabs.map(tab => (
                         <li key={tab.id} className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            <span className="material-symbols-outlined">{tab.icon}</span>
                            <span>{tab.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>
            <main className="settings-content">
                <div className="settings-page-header">
                    <h1>{getPageTitle()}</h1>
                </div>
                 {renderContent()}
            </main>
        </div>
    )
};

export default SettingsScreen;