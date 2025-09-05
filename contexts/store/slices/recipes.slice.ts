/** @file contexts/store/slices/recipes.slice.ts */
// FIX: Corrected import path for store types.
import { SentinelStateCreator, AppStore } from '../store.types';
import { Recipe } from '../../../types';

export interface RecipesSlice {
  recipes: Recipe[];
  getRecipeForMenuItem: (menuItemId: number) => Recipe | null;
}

export const createRecipesSlice: SentinelStateCreator<AppStore,RecipesSlice> = (set, get) => ({
  recipes: [
    { 
      menuItemId: 1, // Corresponds to 'ทาโกะยากิ ดั้งเดิม'
      ingredients: [
        { stockItemId: 101, quantity: 50 }, // 50g แป้ง
        { stockItemId: 102, quantity: 30 }, // 30g ปลาหมึก
        { stockItemId: 103, quantity: 10 }, // 10ml ซอส
      ]
    }
  ],
  getRecipeForMenuItem: (menuItemId: number) => {
    return get().recipes.find(r => r.menuItemId === menuItemId) || null;
  },
});