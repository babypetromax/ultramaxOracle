import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'ultramax-pos-images';
const STORE_NAME = 'image-cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
};

/**
 * [ULTRAMAX DEVS UPGRADE]
 * ฟังก์ชันกลางสำหรับจัดการรูปภาพทั้งหมดในระบบ
 * @param key - Key ที่ไม่ซ้ำกันสำหรับรูปภาพ (เช่น 'menu-item-1', 'offline-logo')
 * @param source - URL ของรูปภาพ หรือ Data URL (base64)
 * @returns Promise ที่ resolve เป็น Blob ของรูปภาพ หรือ null ถ้ามีข้อผิดพลาด
 */
export const cacheAndRetrieveImage = async (key: string, source: string): Promise<Blob | null> => {
    if (!source) return null;
    
    const db = await getDb();

    try {
        const cached = await db.get(STORE_NAME, key);
        if (cached instanceof Blob) {
            return cached;
        }

        let blob: Blob;
        if (source.startsWith('data:')) {
            // --- ส่วนที่เพิ่มเข้ามา: แปลง Data URL เป็น Blob ---
            const response = await fetch(source);
            blob = await response.blob();
        } else {
            // --- [ULTRAMAX DEVS FIX]: Mixed Content & CORS Robustness ---
            // 1. Automatically upgrade HTTP to HTTPS to fix mixed content errors.
            const secureSource = source.startsWith('http:') ? source.replace('http:', 'https:') : source;

            // 2. Fetch with CORS mode. This will fail for servers without CORS headers,
            //    which is expected behavior. The catch block will handle it.
            const response = await fetch(secureSource, { mode: 'cors' });
            if (!response.ok) {
                console.error(`[ImageStore] Failed to fetch image for key ${key}. Status: ${response.status}. URL: ${secureSource}`);
                return null;
            }
            blob = await response.blob();
        }

        await db.put(STORE_NAME, blob, key);
        return blob;
    } catch (error) {
        // This catch block handles CORS errors, network errors, etc., preventing crashes.
        console.error(`[ImageStore] Error processing image for key ${key}. URL: ${source}. Error:`, error);
        return null;
    }
};

// เปลี่ยนชื่อฟังก์ชันเดิมเพื่อความเข้ากันได้
export const fetchAndCacheImage = (id: number, url: string) => {
    return cacheAndRetrieveImage(`menu-item-${id}`, url);
};
