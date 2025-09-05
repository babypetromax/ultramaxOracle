// views/settings/DatabaseSettings.tsx

import React, { useState, useEffect } from 'react';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { GOOGLE_SHEET_WEB_APP_URL } from '../../constants';
import { ShopSettings } from '../../types';
import { Logger } from '../../services/loggingService';

const DatabaseSettings: React.FC = () => {
    const isAdminMode = useStore(state => state.isAdminMode);
    const shopSettings = useStore(state => state.shopSettings);
    const setShopSettings = useStore(state => state.setShopSettings);
    const isSyncing = useStore(state => state.isSyncing);
    const syncOrders = useStore(state => state.syncOrders);
    const createNewMonthlySheet = useStore(state => state.createNewMonthlySheet);
    const switchToNewSheet = useStore(state => state.switchToNewSheet);
    const lastSyncTime = useStore(state => state.lastSyncTime);
    
    const { showNotification } = useNotification();
    const showConfirmation = useConfirmation();

    const [isCreatingSheet, setIsCreatingSheet] = useState(false);
    const [tempUrl, setTempUrl] = useState('');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [syncInterval, setSyncInterval] = useState(shopSettings.syncIntervalMinutes);
    const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(shopSettings.isAutoSyncEnabled);

    const currentUrl = shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;

    useEffect(() => {
        if (!isEditingUrl) {
            setTempUrl(currentUrl);
        }
    }, [isEditingUrl, currentUrl]);
    
    useEffect(() => {
        setSyncInterval(shopSettings.syncIntervalMinutes);
        setIsAutoSyncEnabled(shopSettings.isAutoSyncEnabled);
    }, [shopSettings.syncIntervalMinutes, shopSettings.isAutoSyncEnabled]);

    const handleCreateNewSheet = async () => {
        const confirmed = await showConfirmation({
            title: 'ยืนยันการสร้างชีทใหม่',
            message: 'คุณต้องการสร้างและสลับไปใช้ไฟล์ Google Sheet ใหม่สำหรับเดือนปัจจุบันใช่หรือไม่? ข้อมูลเก่าจะยังคงปลอดภัยในไฟล์เดิม',
            confirmText: 'ยืนยันการสร้าง',
            danger: false,
        });

        if (confirmed) {
            setIsCreatingSheet(true);
            await createNewMonthlySheet();
            setIsCreatingSheet(false);
        }
    };

    const handleSwitchSheet = async () => {
        const success = await switchToNewSheet(tempUrl);
        if (success) {
            setIsEditingUrl(false);
        }
    };
    
    const handleManualSync = async () => {
        showNotification('กำลังซิงค์ข้อมูลด้วยตนเอง...', 'info');
        await syncOrders();
        Logger.action('Manual Data Sync Triggered');
    };

    const handleSyncIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newInterval = Number(e.target.value);
        setSyncInterval(newInterval);
        const newSettings: ShopSettings = { ...shopSettings, syncIntervalMinutes: newInterval };
        setShopSettings(newSettings);
        showNotification(`ตั้งค่าการซิงค์ตามช่วงเวลาเป็นทุก ${newInterval} นาทีแล้ว`, 'success');
        Logger.action('Changed Sync Interval', { newIntervalMinutes: newInterval });
    };

    const handleAutoSyncToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setIsAutoSyncEnabled(isChecked);
        const newSettings: ShopSettings = { ...shopSettings, isAutoSyncEnabled: isChecked };
        setShopSettings(newSettings);
        showNotification(`โหมดซิงค์อัตโนมัติถูก${isChecked ? 'เปิด' : 'ปิด'}`, isChecked ? 'success' : 'info');
        Logger.action('Toggle Auto Sync Mode', { isAutoSyncEnabled: isChecked });
    };

    return (
        <div className="settings-card">
            <h3>ศูนย์บัญชาการข้อมูล (Google Sheet)</h3>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                จัดการการเชื่อมต่อและวงจรชีวิตของฐานข้อมูลบนคลาวด์ของคุณ
            </p>

            <div className="connection-status-card">
                <div className="status-header">
                    <span className={`status-light ${isSyncing ? 'syncing' : 'synced'}`}></span>
                    <span>สถานะ: {isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'เชื่อมต่อเรียบร้อย'}</span>
                </div>
                <div className="form-group">
                    <label htmlFor="sheetUrl">Active Google Sheet URL</label>
                    <input type="text" id="sheetUrl" value={currentUrl} readOnly disabled />
                </div>
                <div className="status-actions">
                    <a href={currentUrl.replace('/exec', '/edit')} target="_blank" rel="noopener noreferrer" className="action-button secondary">
                        <span className="material-symbols-outlined">table_chart</span> เปิด Sheet ปัจจุบัน
                    </a>
                    <button className="action-button secondary" onClick={handleManualSync} disabled={isSyncing || !isAdminMode}>
                        <span className={`material-symbols-outlined sync-icon ${isSyncing ? 'pending' : ''}`}>{isSyncing ? 'sync' : 'cloud_sync'}</span>
                        {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}
                    </button>
                </div>
            </div>
            
            <div className="settings-divider"></div>

            <div className="ai-analysis-header" style={{ alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>การตั้งค่าการซิงค์ข้อมูลอัตโนมัติ (Chronos Sync Control)</h3>
                 <div className="status-header" style={{ marginBottom: 0 }}>
                    <span className={`material-symbols-outlined sync-icon ${isSyncing ? 'pending' : 'synced'}`} title={isSyncing ? 'กำลังซิงค์...' : 'ซิงค์สำเร็จ'}>
                        {isSyncing ? 'sync' : 'cloud_done'}
                    </span>
                    <span style={{fontSize: '0.9rem', color: isSyncing ? 'var(--warning-color)' : 'var(--success-color)'}}>
                        {isSyncing ? 'กำลังซิงค์...' : (lastSyncTime ? `สำเร็จ` : 'พร้อมซิงค์')}
                    </span>
                </div>
            </div>

            <p className="text-secondary" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                เปิดใช้งานเพื่อซิงค์ข้อมูลอัตโนมัติตามช่วงเวลา และซิงค์ทันทีเมื่อมีการกระทำที่สำคัญ (เช่น การขาย)
            </p>

            <div className="vat-toggle" style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 600, color: isAutoSyncEnabled ? 'var(--success-color)' : 'var(--text-secondary)'}}>
                    {isAutoSyncEnabled ? 'เปิดใช้งานโหมดซิงค์อัตโนมัติ' : 'ปิดใช้งานโหมดซิงค์อัตโนมัติ'}
                </span>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={isAutoSyncEnabled}
                        onChange={handleAutoSyncToggle}
                        disabled={!isAdminMode}
                    />
                    <span className="slider"></span>
                </label>
            </div>
            
            <div className="form-group" style={{ opacity: isAutoSyncEnabled ? 1 : 0.5, transition: 'opacity 0.3s', maxWidth: '300px' }}>
                <label htmlFor="syncInterval" style={{ display: 'block', marginBottom: '0.5rem' }}>ช่วงเวลาการซิงค์ (เมื่อเปิดใช้งาน)</label>
                <select id="syncInterval" value={syncInterval} onChange={handleSyncIntervalChange} disabled={!isAdminMode || !isAutoSyncEnabled}>
                    <option value={1}>ทุก 1 นาที</option>
                    <option value={5}>ทุก 5 นาที</option>
                    <option value={15}>ทุก 15 นาที (แนะนำ)</option>
                    <option value={30}>ทุก 30 นาที</option>
                    <option value={60}>ทุก 60 นาที</option>
                </select>
            </div>
            
            <div className="settings-divider"></div>
            <h3>การจัดการชีทรายเดือนอัตโนมัติ</h3>
            <div className="magic-button-container">
                <p className="text-secondary">
                    คลิกปุ่มนี้เพื่อสร้างไฟล์ Google Sheet ใหม่สำหรับเดือนปัจจุบันโดยอัตโนมัติ ระบบจะคัดลอกโครงสร้างที่จำเป็นทั้งหมดให้ทันที
                </p>
                <button 
                    className="action-button magic-button" 
                    onClick={handleCreateNewSheet} 
                    disabled={isCreatingSheet || !isAdminMode}
                >
                    <span className="material-symbols-outlined">{isCreatingSheet ? 'hourglass_top' : 'auto_fix_high'}</span>
                    {isCreatingSheet ? 'กำลังสร้างชีทใหม่...' : 'สร้างและเริ่มใช้งานชีทใหม่'}
                </button>
            </div>

            <div className="settings-divider"></div>
            <h3>สลับไปยังชีทอื่นด้วยตนเอง (สำหรับผู้ใช้ขั้นสูง)</h3>
            <div className="form-group">
                <label htmlFor="manualUrl">วาง Web App URL ของชีทใหม่ที่นี่</label>
                <input
                    type="text"
                    id="manualUrl"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    disabled={!isAdminMode || !isEditingUrl}
                    placeholder="https://script.google.com/macros/s/..."
                />
            </div>
             {isAdminMode && (
                <div className="status-actions">
                    {!isEditingUrl ? (
                        <button className="action-button" onClick={() => setIsEditingUrl(true)}>
                            <span className="material-symbols-outlined">edit</span> แก้ไขลิงก์
                        </button>
                    ) : (
                        <>
                            <button className="action-button success-button" onClick={handleSwitchSheet}>
                                <span className="material-symbols-outlined">swap_horiz</span> ตรวจสอบและสลับ
                            </button>
                            <button className="action-button" style={{backgroundColor: 'var(--text-secondary)'}} onClick={() => setIsEditingUrl(false)}>
                                <span className="material-symbols-outlined">cancel</span> ยกเลิก
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default DatabaseSettings;