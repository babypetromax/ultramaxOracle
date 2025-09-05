/**
 * @file contexts/store/slices/session.slice.ts
 * @description State management for current user session, permissions, and remote monitoring.
 * @version 1.1.0 (Chimera - Ascension Refactor)
 * @author UltraMax Devs Team
 */
// FIX: Removed SessionSlice from this import to break circular dependency. The interface is now defined and exported below.
// FIX: Corrected import path for store types.
import { AppStore, SentinelStateCreator } from '../store.types';

// FIX: Added and exported the SessionSlice interface.
export interface SessionSlice {
  isAdminMode: boolean;
  toggleAdminMode: (pin: string) => boolean;
}

// Notification connection logic
let _showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void = (msg, type) => console.log(`[SESSION_SLICE_LOG] [${type?.toUpperCase()}] ${msg}`);
export const connectSessionSliceNotification = (showNotification: any) => {
    _showNotification = showNotification;
};

export const createSessionSlice: SentinelStateCreator<AppStore, SessionSlice> = (set, get) => ({
  isAdminMode: false,
  toggleAdminMode: (pin: string) => {
    const adminPin = get().shopSettings.adminPin;
    const currentMode = get().isAdminMode;

    if (currentMode) {
      set({ isAdminMode: false }, false, 'session/toggleAdminMode/off');
      _showNotification('ออกจากโหมดผู้ดูแลระบบ', 'info');
      return true;
    }
    
    if (pin === adminPin) {
      set({ isAdminMode: true }, false, 'session/toggleAdminMode/on');
       _showNotification('เข้าสู่โหมดผู้ดูแลระบบสำเร็จ!', 'success');
      return true;
    }
    
    _showNotification('รหัส PIN ไม่ถูกต้อง', 'error');
    return false;
  },
});