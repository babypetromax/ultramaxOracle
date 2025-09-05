import React from 'react';
import { useApp } from '../../contexts/AppContext';

const ShiftStartOverlay: React.FC = () => {
    const { setShowStartShiftModal } = useApp();

    return (
        <div className="shift-start-overlay">
            <div className="shift-start-card">
                <img src="https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/Ultramax_logo_squar.png" alt="App Logo" className="shift-start-icon" />
                <h2 className="shift-start-title">เริ่มต้นวันทำงานของคุณ</h2>
                <p className="shift-start-subtitle">เปิดกะเพื่อบันทึกยอดขายและเริ่มให้บริการ</p>
                <button 
                    className="action-button shift-start-button"
                    onClick={() => setShowStartShiftModal(true)}
                >
                    <span className="material-symbols-outlined">play_circle</span>
                    เปิดกะการขาย
                </button>
            </div>
        </div>
    );
};

export default ShiftStartOverlay;