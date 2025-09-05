// lib/sentinelDB.ts
import { openDB, IDBPDatabase } from 'idb';
import { SentinelLogEntry } from '../types';

const DB_NAME = 'ultramax-sentinel-log';
const STORE_NAME = 'action-trace';
const DB_VERSION = 1;
// 1. กำหนดอายุสูงสุดของ Log ที่จะเก็บไว้ (1 วัน)
const MAX_LOG_AGE_MS = 1 * 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    store.createIndex('timestamp', 'timestamp');
                }
            },
        });
    }
    return dbPromise;
};

export const addLogEntry = async (log: Omit<SentinelLogEntry, 'id'>): Promise<void> => {
    try {
        const db = await getDb();
        await db.add(STORE_NAME, log);
    } catch (error) {
        console.error('[SentinelDB] Failed to add log entry:', error);
    }
};

export const getAllLogs = async (): Promise<SentinelLogEntry[]> => {
    // ... (no changes to this function)
    try {
        const db = await getDb();
        return await db.getAll(STORE_NAME);
    } catch (error) {
        console.error('[SentinelDB] Failed to retrieve logs:', error);
        return [];
    }
};

export const clearOldLogs = async (): Promise<void> => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const index = tx.store.index('timestamp');
        const oneDayAgo = new Date(Date.now() - MAX_LOG_AGE_MS);
        
        let cursor = await index.openCursor(IDBKeyRange.upperBound(oneDayAgo));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
        console.log('[SentinelDB Janitor] Old logs cleared successfully.');
    } catch (error) {
        console.error('[SentinelDB Janitor] Failed to clear old logs:', error);
    }
};

export const clearAllLogs = async (): Promise<void> => {
    try {
        const db = await getDb();
        await db.clear(STORE_NAME);
        console.log('[SentinelDB] All log entries have been cleared for the new session.');
    } catch (error) {
        console.error('[SentinelDB] Failed to clear all logs:', error);
    }
};