/**
 * @file views/settings/SmartReceiptEditor.tsx
 * @description Advanced component for managing receipt settings with a live preview.
 * @version 2.2.1 (Project Chimera - UI/UX Enhancement & Architectural Alignment)
 * @author UltraMax Devs Team
 */
import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// FIX: Corrected the import path for the `useStore` hook to point to the new store index file.
import { useStore } from '../../contexts/store/index';
import { cacheAndRetrieveImage } from '../../lib/imageStore';
import { Logger } from '../../services/loggingService';

// --- DUMMY DATA ---
const dummyOrderData = {
    id: 'DEMO-0001',
    items: [
        { id: 1, name: 'ทาโกะยากิ Original', price: 60, quantity: 2, category: 'Main', image: '' },
        { id: 2, name: 'ชาเขียวเย็น', price: 25, quantity: 1, category: 'Drinks', image: '' },
        { id: 3, name: 'เพิ่มชีส', price: 15, quantity: 1, category: 'Topping', image: '' },
    ],
    subtotal: 160.00,
    discountValue: 10.00,
    tax: 10.50,
    total: 160.50,
    timestamp: new Date(),
    paymentMethod: 'cash' as const,
    vatRate: 0.07,
    status: 'completed' as const,
    cashReceived: 200,
    serviceChargeValue: 0,
    syncStatus: 'synced' as const
};

// --- SUB-COMPONENTS ---
const ReceiptPaperPreview: React.FC<{
    orderData: typeof dummyOrderData;
    shopSettings: ShopSettings;
    offlineLogo: string | null;
    offlinePromo: string | null;
    receiptWidth: '58mm' | '80mm';
}> = ({ orderData, shopSettings, offlineLogo, offlinePromo, receiptWidth }) => {
    
    const [logoSrc, setLogoSrc] = useState<string>('');
    const [promoSrc, setPromoSrc] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        const loadImages = async () => {
            const logoSource = offlineLogo || shopSettings.logoUrl;
            const promoSource = offlinePromo || shopSettings.promoUrl;

            if (logoSource) {
                const blob = await cacheAndRetrieveImage('offline-logo-preview', logoSource);
                if (isMounted && blob) setLogoSrc(URL.createObjectURL(blob));
                else if (isMounted) setLogoSrc('');
            } else if (isMounted) {
                setLogoSrc('');
            }

            if (promoSource) {
                const blob = await cacheAndRetrieveImage('offline-promo-preview', promoSource);
                if (isMounted && blob) setPromoSrc(URL.createObjectURL(blob));
                else if (isMounted) setPromoSrc('');
            } else if (isMounted) {
                setPromoSrc('');
            }
        };

        loadImages();

        return () => {
            isMounted = false;
            if (logoSrc) URL.revokeObjectURL(logoSrc);
            if (promoSrc) URL.revokeObjectURL(promoSrc);
        };
    }, [offlineLogo, shopSettings.logoUrl, offlinePromo, shopSettings.promoUrl]);

    const receiptStyles = {
        '--receipt-logo-max-width': `${shopSettings.logoSizePercent}%`,
        '--receipt-promo-max-width': `${shopSettings.promoSizePercent}%`,
        '--receipt-top-margin': `${shopSettings.receiptTopMargin}px`,
        '--receipt-bottom-margin': `${shopSettings.receiptBottomMargin}px`,
        '--receipt-line-spacing': shopSettings.receiptLineSpacing
    } as React.CSSProperties;

    return (
        <div id="printable-receipt-preview" className={`receipt-paper receipt-${receiptWidth}`} style={receiptStyles}>
            <div className="receipt-header-content">
                {logoSrc && <img src={logoSrc} alt="Shop Logo" className="receipt-logo"/>}
                <p><strong>{shopSettings.shopName}</strong></p>
                <p>{shopSettings.address}</p>
                {shopSettings.phone && <p>โทร: {shopSettings.phone}</p>}
                {shopSettings.taxId && <p>เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}</p>}
                <p>ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ</p>
            </div>
            <div className="receipt-info">
                <span>เลขที่: {dummyOrderData.id}</span>
                <span>วันที่: {new Date(dummyOrderData.timestamp).toLocaleString('th-TH')}</span>
            </div>
            <hr className="receipt-hr" />
            <table className="receipt-items-table">
                <thead>
                    <tr>
                        <th>รายการ</th>
                        <th className="col-qty">จำนวน</th>
                        <th className="col-price">ราคา</th>
                        <th className="col-total">รวม</th>
                    </tr>
                </thead>
                <tbody>
                    {dummyOrderData.items.map(item => (
                        <tr key={item.id}>
                            <td>{item.name}</td>
                            <td className="col-qty">{item.quantity}</td>
                            <td className="col-price">{item.price.toFixed(2)}</td>
                            <td className="col-total">{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr className="receipt-hr" />
            <table className="receipt-summary-table">
                <tbody>
                    <tr><td>ยอดรวม</td><td>{dummyOrderData.subtotal.toFixed(2)}</td></tr>
                    {dummyOrderData.discountValue > 0 && <tr><td>ส่วนลด</td><td>-{dummyOrderData.discountValue.toFixed(2)}</td></tr>}
                    {dummyOrderData.tax > 0 && <tr><td>ภาษีมูลค่าเพิ่ม ({(dummyOrderData.vatRate * 100).toFixed(0)}%)</td><td>{dummyOrderData.tax.toFixed(2)}</td></tr>}
                    <tr className="total"><td><strong>ยอดสุทธิ</strong></td><td><strong>{dummyOrderData.total.toFixed(2)}</strong></td></tr>
                    {dummyOrderData.paymentMethod === 'cash' && typeof dummyOrderData.cashReceived !== 'undefined' && (
                        <>
                            <tr className="receipt-payment-separator"><td colSpan={2}><hr className="receipt-hr" /></td></tr>
                            <tr><td>รับเงินสด</td><td>{dummyOrderData.cashReceived.toFixed(2)}</td></tr>
                            <tr><td>เงินทอน</td><td>{(dummyOrderData.cashReceived - dummyOrderData.total).toFixed(2)}</td></tr>
                        </>
                    )}
                </tbody>
            </table>
            <hr className="receipt-hr" />
            <div className="receipt-footer">
                <p>{shopSettings.headerText}</p>
                {promoSrc && <img src={promoSrc} alt="Promo" className="receipt-promo"/>}
                <p>{shopSettings.footerText}</p>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const SmartReceiptEditor: React.FC = () => {
    const isAdminMode = useStore(state => state.isAdminMode);
    const { showNotification } = useNotification();
    const showConfirmation = useConfirmation();
    
    const shopSettings = useStore(state => state.shopSettings);
    const setShopSettings = useStore(state => state.setShopSettings);
    const offlineReceiptLogo = useStore(state => state.offlineReceiptLogo);
    const setOfflineReceiptLogo = useStore(state => state.setOfflineReceiptLogo);
    const offlineReceiptPromo = useStore(state => state.offlineReceiptPromo);
    const setOfflineReceiptPromo = useStore(state => state.setOfflineReceiptPromo);

    const [localSettings, setLocalSettings] = useState(shopSettings);
    const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');
    
    useEffect(() => {
        if (!isAdminMode) { setLocalSettings(shopSettings); }
    }, [isAdminMode, shopSettings]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const isNumber = type === 'number';
        setLocalSettings(prev => ({ ...prev, [id]: isNumber ? parseFloat(value) : value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'promo') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'logo') {
                setOfflineReceiptLogo(base64String);
                showNotification('อัปโหลดโลโก้สำหรับใช้งานออฟไลน์แล้ว', 'success');
            } else {
                setOfflineReceiptPromo(base64String);
                showNotification('อัปโหลดรูปโปรโมชันสำหรับใช้งานออฟไลน์แล้ว', 'success');
            }
        };
        reader.readAsDataURL(file);
    };
    
    const handleSave = () => {
        setShopSettings(localSettings);
        Logger.action('Save Receipt Settings', { logoSize: localSettings.logoSizePercent, promoSize: localSettings.promoSizePercent });
        showNotification('บันทึกการตั้งค่าใบเสร็จแล้ว', 'success');
    };

    const handleClearImage = async (type: 'logo' | 'promo') => {
        const confirmed = await showConfirmation({
            title: `ลบรูป${type === 'logo' ? 'โลโก้' : 'โปรโมชัน'}`,
            message: `คุณต้องการลบรูป${type === 'logo' ? 'โลโก้' : 'โปรโมชัน'}ที่บันทึกไว้ออฟไลน์หรือไม่? ระบบจะกลับไปใช้ URL แทน (ถ้ามี)`,
            danger: true
        });
        if(confirmed) {
            if (type === 'logo') setOfflineReceiptLogo(null);
            else setOfflineReceiptPromo(null);
        }
    };

    return (
        <div className="ember-main-grid">
            <div className="ember-controls-panel">
                <div className="ember-control-group">
                    <h4>การจัดวาง (Layout)</h4>
                    <div className="form-group range-slider">
                        <label htmlFor="logoSizePercent">ขนาดโลโก้: {localSettings.logoSizePercent}%</label>
                        <input type="range" id="logoSizePercent" min="10" max="100" step="5" value={localSettings.logoSizePercent} onChange={handleChange} disabled={!isAdminMode} />
                    </div>
                    <div className="form-group range-slider">
                        <label htmlFor="promoSizePercent">ขนาดโปรโมชัน: {localSettings.promoSizePercent}%</label>
                        <input type="range" id="promoSizePercent" min="10" max="100" step="5" value={localSettings.promoSizePercent} onChange={handleChange} disabled={!isAdminMode} />
                    </div>
                    <div className="form-group number-inputs-grid">
                        <div>
                            <label htmlFor="receiptTopMargin">ขอบบน (px)</label>
                            <input type="number" id="receiptTopMargin" value={localSettings.receiptTopMargin} onChange={handleChange} disabled={!isAdminMode} />
                        </div>
                        <div>
                            <label htmlFor="receiptBottomMargin">ขอบล่าง (px)</label>
                            <input type="number" id="receiptBottomMargin" value={localSettings.receiptBottomMargin} onChange={handleChange} disabled={!isAdminMode} />
                        </div>
                        <div>
                            <label htmlFor="receiptLineSpacing">ระยะห่างบรรทัด</label>
                            <input type="number" id="receiptLineSpacing" step="0.05" value={localSettings.receiptLineSpacing} onChange={handleChange} disabled={!isAdminMode} />
                        </div>
                    </div>
                </div>

                <div className="ember-control-group">
                    <h4>ข้อความ & รูปภาพ (ออนไลน์)</h4>
                    <div className="form-group"><label htmlFor="headerText">ข้อความส่วนหัว</label><textarea id="headerText" rows={2} value={localSettings.headerText} onChange={handleChange} disabled={!isAdminMode}></textarea></div>
                    <div className="form-group"><label htmlFor="footerText">ข้อความส่วนท้าย</label><textarea id="footerText" rows={2} value={localSettings.footerText} onChange={handleChange} disabled={!isAdminMode}></textarea></div>
                    <div className="form-group"><label htmlFor="logoUrl">URL โลโก้</label><input type="text" id="logoUrl" value={localSettings.logoUrl} onChange={handleChange} disabled={!isAdminMode} /></div>
                    <div className="form-group"><label htmlFor="promoUrl">URL รูปโปรโมชัน</label><input type="text" id="promoUrl" value={localSettings.promoUrl} onChange={handleChange} disabled={!isAdminMode} /></div>
                </div>
                
                <div className="ember-control-group">
                    <h4>รูปภาพ (ออฟไลน์)</h4>
                     <p className="text-secondary" style={{marginBottom: '1rem', fontSize: '0.9rem'}}>สำหรับแสดงบนใบเสร็จเมื่อไม่มีอินเทอร์เน็ต</p>
                    <div className="image-upload-controls">
                        <label>โลโก้</label>
                        <div className="image-upload-actions">
                            <label htmlFor="logo-upload" className={`action-button secondary ${!isAdminMode ? 'disabled' : ''}`}><span className="material-symbols-outlined">upload</span></label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'logo')} disabled={!isAdminMode} style={{display: 'none'}} id="logo-upload"/>
                            {offlineReceiptLogo && <button className="action-button danger-button" onClick={() => handleClearImage('logo')} disabled={!isAdminMode}><span className="material-symbols-outlined">delete</span></button>}
                        </div>
                    </div>
                     {offlineReceiptLogo && (
                        <div className="ember-image-preview-wrapper">
                            <img src={offlineReceiptLogo} alt="ตัวอย่างโลโก้ออฟไลน์" className="ember-image-preview" />
                        </div>
                    )}
                     <div className="image-upload-controls" style={{marginTop: '1rem'}}>
                        <label>โปรโมชั่น</label>
                        <div className="image-upload-actions">
                            <label htmlFor="promo-upload" className={`action-button secondary ${!isAdminMode ? 'disabled' : ''}`}><span className="material-symbols-outlined">upload</span></label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'promo')} disabled={!isAdminMode} style={{display: 'none'}} id="promo-upload" />
                            {offlineReceiptPromo && <button className="action-button danger-button" onClick={() => handleClearImage('promo')} disabled={!isAdminMode}><span className="material-symbols-outlined">delete</span></button>}
                        </div>
                    </div>
                    {offlineReceiptPromo && (
                        <div className="ember-image-preview-wrapper">
                            <img src={offlineReceiptPromo} alt="ตัวอย่างโปรโมชั่นออฟไลน์" className="ember-image-preview" />
                        </div>
                    )}
                </div>
                
                {isAdminMode && <button className="action-button save-button" onClick={handleSave}><span className="material-symbols-outlined">save</span>บันทึกการเปลี่ยนแปลง</button>}
            </div>

            <div className="ember-preview-panel">
                <div className="receipt-size-toggle-floating">
                    <button className={receiptWidth === '58mm' ? 'active' : ''} onClick={() => setReceiptWidth('58mm')}>58mm</button>
                    <button className={receiptWidth === '80mm' ? 'active' : ''} onClick={() => setReceiptWidth('80mm')}>80mm</button>
                </div>
                <div className="floating-receipt">
                    <ReceiptPaperPreview 
                        orderData={dummyOrderData} 
                        shopSettings={localSettings} 
                        offlineLogo={offlineReceiptLogo}
                        offlinePromo={offlineReceiptPromo}
                        receiptWidth={receiptWidth}
                    />
                </div>
            </div>
        </div>
    );
};

export default SmartReceiptEditor;