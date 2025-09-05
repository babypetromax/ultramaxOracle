import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { Logger } from '../../services/loggingService';

const FeatureSettings: React.FC = () => {
    const { showNotification } = useNotification();

    const shopSettings = useStore(state => state.shopSettings);
    const setShopSettings = useStore(state => state.setShopSettings);
    const toggleDemoMode = useStore(state => state.toggleDemoMode);
    const isAdminMode = useStore(state => state.isAdminMode);

    const [localSettings, setLocalSettings] = useState(shopSettings);
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    useEffect(() => {
        if (!isAdminMode) {
            setLocalSettings(shopSettings);
        } else {
            setLocalSettings(shopSettings);
        }
    }, [isAdminMode, shopSettings]);
   
    const handleChange = (key: keyof typeof localSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const { isDemoModeEnabled, ...settingsToSave } = localSettings;
        setShopSettings(settingsToSave);
        Logger.action('Save Feature Settings', { interactionMode: settingsToSave.interactionMode, keyboardNav: settingsToSave.isKeyboardNavEnabled });
        showNotification('บันทึกการตั้งค่าโหมดการใช้งานแล้ว', 'success');
    };

    const handleDemoToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isAdminMode) return;
        
        setIsDemoLoading(true);
        // [DEEP FREEZE] The toggleDemoMode action is now neutralized and will show a warning.
        await toggleDemoMode(e.target.checked);
        setIsDemoLoading(false);
    };

    return (
        <div className="settings-card">
            <h3>โหมดการใช้งานและหน้าจอ</h3>
            <div className="form-group">
                <label>โหมดการป้อนข้อมูลหลัก</label>
                <p className="text-secondary" style={{marginBottom: '0.75rem', fontSize: '0.9rem'}}>เลือกโหมดที่เหมาะสมกับอุปกรณ์ของคุณ</p>
                <div className="radio-group">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="interactionMode"
                            value="desktop"
                            checked={localSettings.interactionMode === 'desktop'}
                            onChange={() => handleChange('interactionMode', 'desktop')}
                            disabled={!isAdminMode}
                        />
                        <span className="radio-custom"></span>
                        <span>
                            <strong>เดสก์ท็อป (เมาส์และคีย์บอร์ด)</strong>
                            <small>เหมาะสำหรับคอมพิวเตอร์ที่มีเมาส์และคีย์บอร์ด</small>
                        </span>
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="interactionMode"
                            value="touch"
                            checked={localSettings.interactionMode === 'touch'}
                            onChange={() => handleChange('interactionMode', 'touch')}
                            disabled={!isAdminMode}
                        />
                         <span className="radio-custom"></span>
                         <span>
                            <strong>หน้าจอสัมผัส (แท็บเล็ต/มือถือ)</strong>
                            <small>ปรับปุ่มและระยะห่างให้ใหญ่ขึ้นเพื่อการสัมผัส</small>
                        </span>
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label>การนำทางด้วยคีย์บอร์ด</label>
                 <p className="text-secondary" style={{marginBottom: '0.75rem', fontSize: '0.9rem'}}>เปิดเพื่อแสดงไฮไลท์และใช้งานคีย์บอร์ดเพื่อเลือกเมนู (เหมาะสำหรับโหมดเดสก์ท็อป)</p>
                <div className="vat-toggle">
                    <span>ปิด/เปิดใช้งานไฮไลท์</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={localSettings.isKeyboardNavEnabled}
                            onChange={(e) => handleChange('isKeyboardNavEnabled', e.target.checked)}
                            disabled={!isAdminMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>

             <div className="form-group">
                <label>การปรับหน้าจอ (Responsive)</label>
                <p className="text-secondary" style={{fontSize: '0.9rem'}}>
                    แอปพลิเคชันถูกออกแบบมาให้ปรับขนาดตามความกว้างของหน้าจอโดยอัตโนมัติ (Smart Display) เพื่อให้แสดงผลได้ดีที่สุดทั้งในโหมดแนวนอน (แนะนำ) และแนวตั้งบนอุปกรณ์ต่างๆ
                </p>
            </div>

            {isAdminMode && <button className="action-button" onClick={handleSave}>บันทึกการเปลี่ยนแปลง</button>}

            {/*
            // =================================================================
            // [CEO DIRECTIVE - DEEP FREEZE] UI BLOCKADE
            // The entire Demo System UI is now deprecated and frozen.
            // This JSX block has been removed to prevent user access.
            // =================================================================
            <div className="settings-divider"></div>
            
            <div className="info-box">
                <span className="material-symbols-outlined">model_training</span>
                <div>
                    <h4>โหมดสาธิต (Demo Mode)</h4>
                    <p style={{marginTop: '0.5rem', marginBottom: '1rem'}}>
                        เปิดเพื่อโหลดข้อมูลการขายย้อนหลัง 3 เดือนสำหรับใช้ในการสาธิตหรือเรียนรู้การใช้งานแอปพลิเคชัน ข้อมูลจริงของคุณจะไม่ได้รับผลกระทบ
                    </p>
                    <div className="vat-toggle">
                        <span>{isDemoLoading ? 'กำลังประมวลผล...' : (shopSettings.isDemoModeEnabled ? 'เปิดใช้งานโหมดสาธิต' : 'ปิดใช้งานโหมดสาธิต')}</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={shopSettings.isDemoModeEnabled}
                                onChange={handleDemoToggle}
                                disabled={!isAdminMode || isDemoLoading}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
            // =================================================================
            */}

        </div>
    );
};

export default FeatureSettings;