/**
 * @file views/settings/SecuritySettings.tsx
 * @description Component for managing security settings like Admin PIN.
 * @version 1.1.0 (Chimera Bridge 3 Connected & UI Harmonized)
 * @author UltraMax Devs Team
 */
import React, { useState, useEffect } from 'react';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../contexts/store/index';
import { useNotification } from '../../contexts/NotificationContext';

const SecuritySettings: React.FC = () => {
  const { showNotification } = useNotification();
  const isAdminMode = useStore((state) => state.isAdminMode);

  // Connect to the central store for settings
  const shopSettings = useStore((state) => state.shopSettings);
  const setShopSettings = useStore((state) => state.setShopSettings);
  
  // Local state for the PIN input field
  const [localPin, setLocalPin] = useState(shopSettings.adminPin || '1111');

  // Sync local state if global state changes
  useEffect(() => {
    setLocalPin(shopSettings.adminPin || '1111');
  }, [shopSettings.adminPin]);

  const handleSave = () => {
    // Basic validation
    if (localPin.length < 4) {
      showNotification('Admin PIN must be at least 4 digits.', 'error');
      return;
    }
    // Update the central store
    const updatedSettings = { ...shopSettings, adminPin: localPin };
    setShopSettings(updatedSettings);
    showNotification('Admin PIN updated successfully!', 'success');
  };

  return (
    <div className="settings-card">
      <h3>Security Settings</h3>
      <p className="text-secondary">Manage access control for administrative functions.</p>
      
      <div className="settings-divider"></div>
      
      <div className="form-group">
        <label htmlFor="adminPin">Admin PIN</label>
        <input 
          id="adminPin" 
          name="adminPin" 
          type="password" 
          value={localPin} 
          onChange={(e) => setLocalPin(e.target.value)} 
          maxLength={8}
          disabled={!isAdminMode}
        />
      </div>
      
      {isAdminMode && (
        <button className="action-button" onClick={handleSave}>
            Save Changes
        </button>
      )}
    </div>
  );
};

export default SecuritySettings;