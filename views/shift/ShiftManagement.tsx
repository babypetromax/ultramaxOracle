/**
 * @file views/shift/ShiftManagement.tsx
 * @description Component for starting and ending work shifts.
 * @version 1.0.0 (Chimera Bridge 5 Connected to ShiftSlice)
 * @author UltraMax Devs Team
 */
import React from 'react';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useApp } from '../../contexts/AppContext';

const ShiftManagement = () => {
  const { setShowStartShiftModal, setShowEndShiftModal } = useApp();

  const currentShift = useStore((state) => state.dailyData?.currentShift);

  const handleStartShift = () => {
    setShowStartShiftModal(true);
  };

  const handleEndShift = () => {
    setShowEndShiftModal(true);
  };

  if (currentShift) {
    return (
      <div className="settings-card">
        <h3>Active Shift</h3>
        <p>Shift started at: {new Date(currentShift.startTime).toLocaleString('th-TH')}</p>
        <p>Opening Float: {currentShift.openingFloatAmount.toFixed(2)}</p>
        <div className="settings-actions" style={{marginTop: '1.5rem'}}>
            <button className="action-button danger-button" onClick={handleEndShift}>End Shift</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-card">
        <h3>Start New Shift</h3>
        <p>No active shift. Please start a new shift to begin sales.</p>
        <div className="settings-actions" style={{marginTop: '1.5rem'}}>
            <button className="action-button" onClick={handleStartShift}>Start Shift</button>
        </div>
    </div>
  );
};

export default ShiftManagement;