import React, { useEffect, useRef } from 'react';
import { ConfirmationOptions } from '../../contexts/ConfirmationContext';

interface ConfirmModalProps {
    options: ConfirmationOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ options, onConfirm, onCancel }) => {
    const { title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', danger = true } = options;
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        confirmButtonRef.current?.focus();

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div className="modal-overlay confirm-modal-overlay">
            <div className="modal-content" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h2 id="confirm-title" className="modal-title">{title}</h2>
                    <button type="button" className="close-modal-btn" onClick={onCancel} aria-label="Close dialog">&times;</button>
                </div>
                <div id="confirm-message" className="modal-body">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>
                <div className="modal-footer">
                    <button type="button" className="action-button" onClick={onCancel} style={{backgroundColor: 'var(--text-secondary)'}}>
                        {cancelText}
                    </button>
                    <button ref={confirmButtonRef} type="button" className={`action-button ${danger ? 'danger-button' : ''}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;