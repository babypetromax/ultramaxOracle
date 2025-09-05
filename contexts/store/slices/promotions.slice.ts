/** @file contexts/store/slices/promotions.slice.ts */
// FIX: Removed PromotionsSlice from this import to break circular dependency. The interface is now defined and exported below.
// FIX: Corrected import path for store types.
import { AppStore, SentinelStateCreator } from '../store.types';
import { Promotion } from '../../../types';

// FIX: Added and exported the PromotionsSlice interface.
export interface PromotionsSlice {
  activePromotions: Promotion[];
  appliedPromotionId: string | null;
  applyPromotion: (promoId: string) => void;
  clearPromotion: () => void;
}

export const createPromotionsSlice: SentinelStateCreator<AppStore, PromotionsSlice> = (set) => ({
  activePromotions: [
    { id: 'P01', name: '10% Off Total Bill', type: 'percentage', value: 10, scope: 'order' },
  ],
  appliedPromotionId: null,
  applyPromotion: (promoId: string) => {
    set({ appliedPromotionId: promoId }, false, 'promotions/applyPromotion');
    console.log(`[Chimera] Applied promotion ${promoId}`);
  },
  clearPromotion: () => {
    set({ appliedPromotionId: null }, false, 'promotions/clearPromotion');
  },
});