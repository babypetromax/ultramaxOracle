/** @file views/pos/components/OpenDrawerButton.tsx */
import React from 'react';
// FIX: Corrected the import path to the new store index file.
import { useStore } from '../../../contexts/store/index';

const OpenDrawerButton = () => {
  const openCashDrawer = useStore((state) => state.openCashDrawer);
  const cashDrawerStatus = useStore((state) => state.cashDrawerStatus);

  return (
    <button className="action-button secondary" onClick={openCashDrawer} disabled={cashDrawerStatus === 'open'}>
      <span className="material-symbols-outlined">point_of_sale</span>
      <span>Open Cash Drawer</span>
    </button>
  );
};
export default OpenDrawerButton;