import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';

const GeneralSettings: React.FC = () => {
    const { showNotification } = useNotification();

    const shopSettings = useStore(state => state.shopSettings);
    const setShopSettings = useStore(state => state.setShopSettings);
    const isAdminMode = useStore(state => state.isAdminMode);
    
    const [localSettings, setLocalSettings] = useState(shopSettings);
    
    useEffect(() => {
        if (!isAdminMode) { setLocalSettings(shopSettings); }
    }, [isAdminMode, shopSettings]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const isNumber = type === 'number';

        setLocalSettings(prev => ({
            ...prev,
            [id]: isCheckbox ? (e.target as HTMLInputElement).checked : (isNumber ? parseFloat(value) : value)
        }));
    };
    
    const handleSave = () => {
        setShopSettings(localSettings);
        showNotification('บันทึกการตั้งค่าทั่วไปแล้ว', 'success');
    };
    
    return (
        <div className="settings-card">
            <h3>ข้อมูลร้านค้า</h3>
            <div className="form-group">
                <label htmlFor="shopName">ชื่อร้าน</label>
                <input type="text" id="shopName" value={localSettings.shopName} onChange={handleChange} disabled={!isAdminMode} />
            </div>
            <div className="form-group">
                <label htmlFor="address">ที่อยู่</label>
                <textarea id="address" rows={3} value={localSettings.address} onChange={handleChange} disabled={!isAdminMode}></textarea>
            </div>
            <div className="form-group">
                <label htmlFor="phone">เบอร์โทรศัพท์</label>
                <input type="text" id="phone" value={localSettings.phone} onChange={handleChange} disabled={!isAdminMode} />
            </div>
            <div className="form-group">
                <label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</label>
                <input type="text" id="taxId" value={localSettings.taxId} onChange={handleChange} disabled={!isAdminMode} />
            </div>
            
            <div className="settings-divider"></div>
            
            <h3>การตั้งค่าภาษี (VAT)</h3>
             <div className="form-group">
                <div className="vat-toggle">
                    <span>ปิด/เปิดใช้งาน VAT เริ่มต้น</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            id="isVatDefaultEnabled"
                            checked={localSettings.isVatDefaultEnabled}
                            onChange={handleChange}
                            disabled={!isAdminMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="vatRatePercent">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                <input 
                    type="number" 
                    id="vatRatePercent" 
                    value={localSettings.vatRatePercent} 
                    onChange={handleChange} 
                    disabled={!isAdminMode || !localSettings.isVatDefaultEnabled} 
                />
            </div>
            
            <div className="settings-divider"></div>

            <h3>การตั้งค่าค่าบริการ (Service Charge)</h3>
            <div className="form-group">
                <div className="vat-toggle">
                    <span>ปิด/เปิดใช้งาน Service Charge เริ่มต้น</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            id="isServiceChargeEnabled"
                            checked={localSettings.isServiceChargeEnabled}
                            onChange={handleChange}
                            disabled={!isAdminMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="serviceChargeRatePercent">อัตราค่าบริการ (%)</label>
                <input
                    type="number"
                    id="serviceChargeRatePercent"
                    value={localSettings.serviceChargeRatePercent}
                    onChange={handleChange}
                    disabled={!isAdminMode || !localSettings.isServiceChargeEnabled}
                />
            </div>

            <div className="settings-divider"></div>

            <h3>การตั้งค่าการแสดงผล (POS)</h3>
            <div className="form-group">
                <label>การแสดงราคาบนเมนู</label>
                <p className="text-secondary" style={{marginBottom: '0.75rem', fontSize: '0.9rem'}}>
                    เปิดเพื่อแสดงราคาเป็นทศนิยม 2 ตำแหน่งบนการ์ดเมนู (เช่น 89.00). หากปิด จะแสดงเป็นเลขจำนวนเต็ม (เช่น 89).
                </p>
                <div className="vat-toggle">
                    <span>แสดงทศนิยม</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            id="showDecimalsInPos"
                            checked={localSettings.showDecimalsInPos}
                            onChange={handleChange}
                            disabled={!isAdminMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>

            <div className="settings-divider"></div>
            
            <h3>การตั้งค่าท้องถิ่น</h3>
            <div className="form-group">
                <label htmlFor="currency">สกุลเงิน</label>
                <select id="currency" defaultValue="THB" disabled={!isAdminMode}>
                    <option value="THB">บาท (THB)</option>
                </select>
            </div>
            {isAdminMode && <button className="action-button" onClick={handleSave}>บันทึกการเปลี่ยนแปลง</button>}
        </div>
    );
};

export default GeneralSettings;