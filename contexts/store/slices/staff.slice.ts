/** @file contexts/store/slices/staff.slice.ts */
// FIX: Removed StaffSlice from this import to break circular dependency. The interface is now defined and exported below.
// FIX: Corrected import path for store types.
import { AppStore, SentinelStateCreator } from '../store.types';
import { StaffMember } from '../../../types';

// FIX: Added and exported the StaffSlice interface.
export interface StaffSlice {
  staffList: StaffMember[];
  currentUser: StaffMember | null;
  login: (pin: string) => StaffMember | null;
  logout: () => void;
}

export const createStaffSlice: SentinelStateCreator<AppStore, StaffSlice> = (set, get) => ({
  staffList: [
    { id: 'S001', name: 'Admin', pin: '1111', role: 'admin' },
    { id: 'S002', name: 'Cashier 1', pin: '1234', role: 'cashier' },
  ],
  currentUser: null,
  login: (pin: string) => {
    // This is a simplified login for demonstration
    const user = get().staffList.find(staff => staff.pin === pin);
    if (user) {
      set({ currentUser: user }, false, 'staff/login');
      console.log(`[Chimera] Staff ${user.name} logged in.`);
      return user;
    }
    console.error(`[Chimera] Login failed for PIN: ${pin}`);
    return null;
  },
  logout: () => {
    set({ currentUser: null }, false, 'staff/logout');
    console.log('[Chimera] Staff logged out.');
  },
});