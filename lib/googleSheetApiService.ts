// lib/googleSheetApiService.ts
import { GOOGLE_SHEET_WEB_APP_URL } from '../constants';

/**
 * @description Service for communicating with the Google Apps Script Web App.
 * It only sends requests and receives responses (Singleton Pattern).
 * This service is STATELESS and does not import the Zustand store.
 */
class GoogleSheetApiService {
    /**
     * Fetches the entire menu and category data.
     * @param url The full URL of the Google Apps Script Web App.
     * @returns Promise<any> The JSON data from the Web App.
     */
    async getMenuData(url: string): Promise<any> {
        try {
            const fetchUrl = `${url}?action=getMenu`;
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`[ApiService] Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(`[ApiService] API returned an error: ${data.message || 'Unknown error'}`);
            }
            return data;
        } catch (error) {
            console.error(`[ApiService] Failed during getMenuData:`, error);
            throw error;
        }
    }

    /**
     * Sends data updates (e.g., save, delete, add) to Google Sheet.
     * @param url The full URL of the Google Apps Script Web App.
     * @param action The action for the Apps Script to perform.
     * @param payload The data to send.
     * @returns Promise<any> The result from the Web App.
     */
    async postData(url: string, action: string, payload: object): Promise<any> {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action, payload }),
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`[ApiService] Network response was not ok during POST: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(`[ApiService] POST action '${action}' failed: ${result.message || 'Unknown error'}`);
            }
            return result;
        } catch (error) {
            console.error(`[ApiService] Failed during action '${action}':`, error);
            throw error;
        }
    }
}

// Export a single instance for use across the application
export const googleSheetApiService = new GoogleSheetApiService();