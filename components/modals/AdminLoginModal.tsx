import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';

const AdminLoginModal: React.FC = () => {
    const { showAdminLoginModal, setShowAdminLoginModal } = useApp();
    const toggleAdminMode = useStore(state => state.toggleAdminMode);
    
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!showAdminLoginModal) return null;

    const handleClose = () => {
        setShowAdminLoginModal(false);
        setPassword('');
        setError('');
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = toggleAdminMode(password);
        if (success) {
            handleClose();
        } else {
            setError('รหัสผ่านไม่ถูกต้อง');
        }
    };

    return (
         <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2 className="modal-title">สำหรับผู้ดูแล</h2>
                        <button type="button" className="close-modal-btn" onClick={handleClose}>&times;</button>
                    </div>
                    <div className="form-group">
                        <label htmlFor="adminUser">ชื่อผู้ใช้</label>
                        <input type="text" id="adminUser" value="admin" readOnly disabled />
                    </div>
                     <div className="form-group">
                        <label htmlFor="adminPass">รหัสผ่าน</label>
                        <input type="password" id="adminPass" value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="action-button" style={{width: '100%', justifyContent: 'center'}}>เข้าสู่ระบบ</button>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginModal;