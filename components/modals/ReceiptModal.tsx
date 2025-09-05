import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useNotification } from '../../contexts/NotificationContext';
import { printService } from '../../helpers';
import { cacheAndRetrieveImage } from '../../lib/imageStore'; // <-- import ฟังก์ชันใหม่

const ReceiptModal: React.FC = () => {
    const { showReceiptModal, setShowReceiptModal, receiptData } = useApp();
    const { showNotification } = useNotification();
    
    const shopSettings = useStore(state => state.shopSettings);
    const offlineReceiptLogo = useStore(state => state.offlineReceiptLogo);
    const offlineReceiptPromo = useStore(state => state.offlineReceiptPromo);
    const handleManualDrawerOpen = useStore(state => state.handleManualDrawerOpen);
    const dailyData = useStore(state => state.dailyData);
    
    const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');
    const [autoPrint, setAutoPrint] = useState(true);

    // --- [ULTRAMAX DEVS FIX START] ---
    const [logoSrc, setLogoSrc] = useState<string>('');
    const [promoSrc, setPromoSrc] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        const loadImages = async () => {
            const logoSource = offlineReceiptLogo || shopSettings.logoUrl;
            const promoSource = offlineReceiptPromo || shopSettings.promoUrl;

            if (logoSource) {
                const blob = await cacheAndRetrieveImage('offline-logo', logoSource);
                if (isMounted && blob) setLogoSrc(URL.createObjectURL(blob));
            }
            if (promoSource) {
                const blob = await cacheAndRetrieveImage('offline-promo', promoSource);
                if (isMounted && blob) setPromoSrc(URL.createObjectURL(blob));
            }
        };

        if (showReceiptModal) {
            loadImages();
        }

        return () => {
            isMounted = false;
            // คืนหน่วยความจำทุกครั้งที่ Modal ปิด
            if (logoSrc) URL.revokeObjectURL(logoSrc);
            if (promoSrc) URL.revokeObjectURL(promoSrc);
        };
    }, [showReceiptModal, offlineReceiptLogo, shopSettings.logoUrl, offlineReceiptPromo, shopSettings.promoUrl]);
    // --- [ULTRAMAX DEVS FIX END] ---

    const cashDrawerKickCommand = "\x1B\x70\x00\x19\xFA";

    const handlePrintAndOpenDrawer = () => {
        printService('printable-receipt', cashDrawerKickCommand, receiptWidth);
    };

    const handleOpenDrawer = () => {
        if (!dailyData?.currentShift || dailyData.currentShift.status !== 'OPEN') {
            showNotification('ไม่สามารถเปิดลิ้นชักได้: กรุณาเปิดกะก่อน', 'warning');
            return;
        }
        const reason = prompt('กรุณาระบุเหตุผลในการเปิดลิ้นชัก (เช่น แลกเงิน):');
        if (reason && reason.trim()) {
            printService('dummy-element-for-open-drawer', cashDrawerKickCommand);
            handleManualDrawerOpen(reason.trim());
            showNotification('ส่งคำสั่งเปิดลิ้นชักแล้ว', 'success');
        } else if (reason !== null) {
            showNotification('กรุณาระบุเหตุผล', 'warning');
        }
    };

    const handleClose = () => {
        if (autoPrint) {
            handlePrintAndOpenDrawer();
        }
        setShowReceiptModal(false);
    };

    if (!showReceiptModal || !receiptData) return null;

    const change = receiptData.cashReceived ? receiptData.cashReceived - receiptData.total : 0;

    const receiptStyles = {
        '--receipt-logo-max-width': `${shopSettings.logoSizePercent}%`,
        '--receipt-promo-max-width': `${shopSettings.promoSizePercent}%`,
        '--receipt-top-margin': `${shopSettings.receiptTopMargin}px`,
        '--receipt-bottom-margin': `${shopSettings.receiptBottomMargin}px`,
        '--receipt-line-spacing': shopSettings.receiptLineSpacing
    } as React.CSSProperties;

    return (
        <div className="modal-overlay receipt-modal-overlay" onClick={handleClose}>
            <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
                <div className="receipt-controls">
                    <h3>ตัวเลือกใบเสร็จ</h3>
                    <div className="form-group">
                        <label>ขนาดกระดาษ</label>
                        <div className="receipt-size-toggle">
                           <button className={receiptWidth === '58mm' ? 'active' : ''} onClick={() => setReceiptWidth('58mm')}>58mm</button>
                           <button className={receiptWidth === '80mm' ? 'active' : ''} onClick={() => setReceiptWidth('80mm')}>80mm</button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>พิมพ์ใบเสร็จเมื่อปิด</label>
                        <div className="vat-toggle">
                            <span>ไม่พิมพ์/พิมพ์</span>
                            <label className="switch"><input type="checkbox" checked={autoPrint} onChange={() => setAutoPrint(p => !p)} /><span className="slider"></span></label>
                        </div>
                    </div>
                    
                    <button className="action-button" onClick={handlePrintAndOpenDrawer}><span className="material-symbols-outlined">print</span> พิมพ์และเปิดลิ้นชัก</button>
                    <button className="action-button" style={{backgroundColor: 'var(--warning-color)'}} onClick={handleOpenDrawer}><span className="material-symbols-outlined">savings</span> เปิดลิ้นชัก</button>
                    <button className="action-button success-button" style={{marginTop: 'auto'}} onClick={handleClose}>
                        <span className="material-symbols-outlined">point_of_sale</span> {autoPrint ? 'พิมพ์และขายต่อ' : 'ปิดและขายต่อ'}
                    </button>

                </div>
                <div className="receipt-preview">
                    <div id="printable-receipt" className={`receipt-paper receipt-${receiptWidth}`} style={receiptStyles}>
                        <div className="receipt-header-content">
                            {/* --- [ULTRAMAX DEVS FIX] ใช้ State ใหม่ที่มีประสิทธิภาพ --- */}
                            {logoSrc && <img src={logoSrc} alt="Shop Logo" className="receipt-logo"/>}
                            <p><strong>{shopSettings.shopName}</strong></p>
                            <p>{shopSettings.address}</p>
                            {shopSettings.phone && <p>โทร: {shopSettings.phone}</p>}
                            {shopSettings.taxId && <p>เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}</p>}
                            <p>ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ</p>
                        </div>
                        <div className="receipt-info">
                            <span>เลขที่: {receiptData.id}</span>
                            <span>วันที่: {new Date(receiptData.timestamp).toLocaleString('th-TH')}</span>
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
                                {receiptData.items.map(item => (
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
                                <tr><td>ยอดรวม</td><td>{receiptData.subtotal.toFixed(2)}</td></tr>
                                {receiptData.discountValue > 0 && <tr><td>ส่วนลด</td><td>-{receiptData.discountValue.toFixed(2)}</td></tr>}
                                {receiptData.serviceChargeValue > 0 && <tr><td>ค่าบริการ</td><td>{receiptData.serviceChargeValue.toFixed(2)}</td></tr>}
                                {receiptData.tax > 0 && <tr><td>ภาษีมูลค่าเพิ่ม ({(receiptData.vatRate * 100).toFixed(0)}%)</td><td>{receiptData.tax.toFixed(2)}</td></tr>}
                                <tr className="total"><td><strong>ยอดสุทธิ</strong></td><td><strong>{receiptData.total.toFixed(2)}</strong></td></tr>
                                {receiptData.paymentMethod === 'cash' && typeof receiptData.cashReceived !== 'undefined' && (
                                    <>
                                        <tr className="receipt-payment-separator"><td colSpan={2}><hr className="receipt-hr" /></td></tr>
                                        <tr><td>รับเงินสด</td><td>{receiptData.cashReceived.toFixed(2)}</td></tr>
                                        <tr><td>เงินทอน</td><td>{change.toFixed(2)}</td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                        <hr className="receipt-hr" />
                        <div className="receipt-footer">
                            <p>{shopSettings.headerText}</p>
                            {/* --- [ULTRAMAX DEVS FIX] ใช้ State ใหม่ที่มีประสิทธิภาพ --- */}
                            {promoSrc && <img src={promoSrc} alt="Promo" className="receipt-promo"/>}
                            <p>{shopSettings.footerText}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div id="dummy-element-for-open-drawer" style={{ display: 'none' }}></div>
        </div>
    );
};

export default ReceiptModal;