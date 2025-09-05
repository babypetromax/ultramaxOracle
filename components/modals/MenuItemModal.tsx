import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';

// [AURA'S GRADIENT PALETTE] - A modern, curated set of gradients for card backgrounds.
const gradientPalette = [
    { name: 'Elysian Blue', class: 'elysian-blue' },
    { name: 'Sunset Glow', class: 'sunset-glow' },
    { name: 'Minty Fresh', class: 'minty-fresh' },
    { name: 'Royal Purple', class: 'royal-purple' },
    { name: 'Graphite', class: 'graphite' },
];

const MenuItemModal: React.FC = () => {
    const { showMenuItemModal, setShowMenuItemModal, editingItem } = useApp();
    const { showNotification } = useNotification();

    // === ULTRAMAX DEVS FIX: Use atomic selectors to prevent infinite loops ===
    const categories = useStore(state => state.categories);
    const handleSaveMenuItem = useStore(state => state.handleSaveMenuItem);

    const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>({ name: '', price: 0, image: '', category: '', offlineImage: '', cardGradient: '' });
    const [offlineImagePreview, setOfflineImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (editingItem && 'name' in editingItem) {
            setFormData({ 
                name: editingItem.name, 
                price: editingItem.price, 
                image: editingItem.image, 
                category: editingItem.category,
                offlineImage: editingItem.offlineImage || '',
                cardGradient: editingItem.cardGradient || '',
            });
            setOfflineImagePreview(editingItem.offlineImage || null);
        } else if (editingItem) { // Case for adding a new item to a category
            setFormData({ name: '', price: 0, image: '', category: editingItem.category, offlineImage: '', cardGradient: '' });
            setOfflineImagePreview(null);
        }
    }, [editingItem]);

    if (!showMenuItemModal) return null;

    const isNew = !editingItem || !('id' in editingItem);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setOfflineImagePreview(base64String);
                setFormData(prev => ({ ...prev, offlineImage: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearOfflineImage = () => {
        setOfflineImagePreview(null);
        setFormData(prev => ({ ...prev, offlineImage: '' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.category) {
            showNotification('กรุณากรอกชื่อและเลือกหมวดหมู่', 'warning');
            return;
        }
        handleSaveMenuItem({ ...formData, id: isNew ? 0 : (editingItem as MenuItem).id }, null);
        setShowMenuItemModal(false);
    };

    return (
        <div className="modal-overlay" onClick={() => setShowMenuItemModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' /* [FIX] Increased width for 2-column layout */ }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2 className="modal-title">{isNew ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสินค้า'}</h2>
                        <button type="button" className="close-modal-btn" onClick={() => setShowMenuItemModal(false)}>&times;</button>
                    </div>

                    {/* [FIX] Main content area now uses a grid for two columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1rem 0' }}>
                        
                        {/* --- Left Column: Core Details --- */}
                        <div className="form-column">
                            <div className="form-group">
                                <label htmlFor="name">ชื่อสินค้า</label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="price">ราคา</label>
                                <input type="number" id="price" name="price" value={formData.price} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="category">หมวดหมู่</label>
                                <select id="category" name="category" value={formData.category} onChange={handleChange} required>
                                    <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* --- Right Column: Image Management --- */}
                        <div className="form-column">
                             {/* This section is now styled to match the SmartReceiptEditor component for consistency. */}
                            <div className="ember-control-group" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                <h4>รูปภาพ & การแสดงผล</h4>
                                <div className="form-group">
                                    <label htmlFor="image">URL รูปภาพ (ออนไลน์)</label>
                                    <input type="text" id="image" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." />
                                </div>
                                <div className="form-group">
                                    <label>รูปภาพ (ออฟไลน์)</label>
                                    <p className="text-secondary" style={{marginBottom: '1rem', fontSize: '0.9rem'}}>
                                        รูปนี้จะถูกเก็บไว้ในเครื่องและแสดงผลทันที
                                    </p>
                                    <div className="image-upload-controls">
                                        <label htmlFor="menu-item-upload" className="action-button secondary">
                                            <span className="material-symbols-outlined">upload</span> อัปโหลด
                                        </label>
                                        <input type="file" accept="image/*" onChange={handleImageChange} style={{display: 'none'}} id="menu-item-upload"/>
                                        {offlineImagePreview && (
                                            <button type="button" className="action-button danger-button" onClick={handleClearOfflineImage}>
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        )}
                                    </div>
                                    {offlineImagePreview && (
                                        <div className="ember-image-preview-wrapper" style={{marginTop: '1rem'}}>
                                            <img src={offlineImagePreview} alt="ตัวอย่าง" className="ember-image-preview" />
                                        </div>
                                    )}
                                </div>
                                 {/* --- [Project Elysium] Card Display Customization --- */}
                                <div className="form-group">
                                    <label>สีพื้นหลังการ์ด (เมื่อไม่มีรูป)</label>
                                    <div className="gradient-palette">
                                        {gradientPalette.map(gradient => (
                                            <button
                                                type="button"
                                                key={gradient.class}
                                                title={gradient.name}
                                                className={`gradient-palette-btn ${gradient.class} ${formData.cardGradient === gradient.class ? 'selected' : ''}`}
                                                onClick={() => handleChange({ target: { name: 'cardGradient', value: gradient.class } } as any)}
                                            />
                                        ))}
                                        <button
                                            type="button"
                                            title="ไม่มีสี"
                                            className={`gradient-palette-btn default ${formData.cardGradient === '' ? 'selected' : ''}`}
                                            onClick={() => handleChange({ target: { name: 'cardGradient', value: '' } } as any)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* [FIX] Submit button is now always visible at the bottom */}
                    <div className="modal-footer" style={{marginTop: 0, paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                        <button type="submit" className="action-button" style={{width: '100%', justifyContent: 'center'}}>
                            {isNew ? 'เพิ่มสินค้า' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MenuItemModal;