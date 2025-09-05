// services/summaryService.ts
import { db } from '../lib/posDB';
import { Order } from '../types';
import { Logger } from './loggingService';
// FIX: Import Dexie to use for type casting, resolving transaction method error.
import Dexie from 'dexie';

export const updateDailySummary = async (transaction: Order): Promise<void> => {
  // Do not add cancelled or reversal (negative total) bills to the daily summary.
  if (transaction.status === 'cancelled' || transaction.reversalOf) return;

  const dateKey = new Date(transaction.timestamp).toISOString().substring(0, 10); // 'YYYY-MM-DD'

  try {
    // FIX: Cast db to Dexie to resolve transaction method typing issue and wrap table in an array.
    await (db as Dexie).transaction('rw', [db.dailySummary], async () => {
      const existingSummary = await db.dailySummary.get(dateKey);

      if (existingSummary) {
        // Update existing summary
        existingSummary.totalSales += transaction.total;
        existingSummary.transactionCount += 1;
        await db.dailySummary.put(existingSummary);
      } else {
        // Create new summary for the day
        await db.dailySummary.add({
          date: dateKey,
          totalSales: transaction.total,
          transactionCount: 1,
        });
      }
    });
  } catch (error) {
    Logger.error('Failed to update daily summary', error, { transactionId: transaction.id });
  }
};
