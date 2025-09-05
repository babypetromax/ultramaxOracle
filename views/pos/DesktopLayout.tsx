import React from 'react';
import { useApp } from '../../contexts/AppContext';
import OrderPanel from './OrderPanel';
import CategoryColumn from './CategoryColumn';
import MenuGrid from './MenuGrid';
// --- [PROJECT EON V2 Wave 3] START ---
import { useStore } from '../../contexts/store/index';
import MenuViewList from './MenuViewList';
import ViewModeSwitcher from './components/ViewModeSwitcher';
// --- [PROJECT EON V2 Wave 3] END ---

const DesktopLayout: React.FC = () => {
   const { 
       isOrderPanelOpen, 
       setIsOrderPanelOpen,
       isCategoryPanelCollapsed, 
       isOrderPanelCollapsed 
   } = useApp();

   // --- [ULTRAMAX DEVS HOTFIX] START: Fix infinite re-render loop ---
   // Use separate, atomic selectors instead of returning a new object literal.
   const viewMode = useStore(state => state.shopSettings.posViewMode || 'grid');
   const isAdminMode = useStore(state => state.isAdminMode);
   // --- [ULTRAMAX DEVS HOTFIX] END ---

   const desktopPosViewClasses = [
       'pos-view',
       isCategoryPanelCollapsed ? 'category-collapsed' : '',
       isOrderPanelCollapsed ? 'order-collapsed' : ''
   ].join(' ');

   return (
       <main className={desktopPosViewClasses}>
           <div className={`pos-view-overlay ${isOrderPanelOpen ? 'is-visible' : ''}`} onClick={() => setIsOrderPanelOpen(false)}></div>
           <CategoryColumn className={isCategoryPanelCollapsed ? 'collapsed' : ''} />
           
           <div className="center-panel">
                {isAdminMode && <ViewModeSwitcher />}
                {viewMode === 'grid' ? <MenuGrid /> : <MenuViewList />}
            </div>

           <OrderPanel className={isOrderPanelCollapsed ? 'collapsed' : ''} />
           {/* REMOVED: <PosKdsPanel /> - Moved to PosView router to align with architecture */}
       </main>
   );
};

export default DesktopLayout;