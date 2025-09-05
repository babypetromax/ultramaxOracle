/** @file views/inventory/StockStatus.tsx */
import React from 'react';
import { useStore } from '../../contexts/store/index';
import { formatCurrency } from '../../helpers';

const StockStatus = () => {
  const stockItems = useStore((state) => state.stockItems);

  return (
    <div className="settings-card">
      <h3>สถานะสต็อกวัตถุดิบ</h3>
      <p className="text-secondary">
        หน้านี้แสดงจำนวนวัตถุดิบที่เหลืออยู่แบบ Real-time ซึ่งจะถูกหักออกโดยอัตโนมัติเมื่อมีการเพิ่มสินค้าที่มีสูตรลงในตะกร้า
      </p>
      <table>
        <thead>
          <tr>
            <th>วัตถุดิบ</th>
            <th style={{ textAlign: 'right' }}>จำนวนคงเหลือ</th>
            <th style={{ textAlign: 'right' }}>หน่วย</th>
          </tr>
        </thead>
        <tbody>
          {stockItems.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.quantity)}</td>
              <td style={{ textAlign: 'right' }}>{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default StockStatus;
