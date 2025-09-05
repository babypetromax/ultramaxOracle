

import { AppStore } from '../contexts/store/store.types';
import { db } from './posDB';
import { googleSheetApiService } from './googleSheetApiService';
import { GOOGLE_SHEET_WEB_APP_URL } from '../constants';
// FIX: Import Dexie to use for type casting, resolving transaction method error.
import Dexie from 'dexie';

export interface DiagnosticResult {
    checkName: string;
    status: 'success' | 'error' | 'warning' | 'idle';
    message: string;
}

// Helper for check implementations
const createResult = (checkName: string, status: 'success' | 'error' | 'warning', message: string): DiagnosticResult => ({
    checkName, status, message
});

// --- DIAGNOSTIC CHECK IMPLEMENTATIONS ---

async function check01_IndexedDB(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[DATABASE] IndexedDB Connection';
    try {
        // FIX: Cast db to Dexie to resolve method not found error.
        await (db as Dexie).open();
        const settingsCount = await db.settings.count();
        if (settingsCount === 0) {
             return createResult(checkName, 'warning', `Connection OK, but settings table is empty. App may use defaults.`);
        }
        return createResult(checkName, 'success', `Connection successful. Found ${settingsCount} settings record(s).`);
    } catch (e: any) {
        return createResult(checkName, 'error', `Failed to connect to local DB: ${e.message}`);
    }
}

async function check02_MenuDataLoaded(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[DATA-LOAD] Menu Data Loaded';
    if (store.isMenuLoading) {
        return createResult(checkName, 'warning', 'Menu is currently being loaded.');
    }
    if (store.menuItems.length > 0) {
        return createResult(checkName, 'success', `Successfully loaded ${store.menuItems.length} menu items into state.`);
    }
    return createResult(checkName, 'error', 'Menu data has not been loaded into the application state.');
}

async function check03_ReportDataInitialized(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[DATA-LOAD] Report Data Initialized';
    // FIX: Access isHistoryLoading from the nested reports slice.
     if (store.reports.isHistoryLoading) {
        return createResult(checkName, 'warning', 'Historical order data is currently being loaded.');
    }
    // FIX: Access allOrders from the nested reports slice.
    if (store.reports.allOrders.length > 0) {
        // FIX: Access allOrders from the nested reports slice.
        return createResult(checkName, 'success', `Successfully loaded ${store.reports.allOrders.length} historical orders for reporting.`);
    }
    return createResult(checkName, 'warning', 'No historical orders found in the report state. This may be normal for a new setup.');
}

async function check04_ReportDataSourceIntegrity(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[CRITICAL] Report Data Source Integrity';
    // FIX: Demo mode is deprecated, this check now only validates against the production 'orders' table.
    const realOrdersCount = await db.orders.count();

    // FIX: Access allOrders from the nested reports slice.
    // Check if the first order in the report state actually exists in the live DB table.
    const isSourcedFromReal = store.reports.allOrders.length > 0 
        ? await db.orders.get(store.reports.allOrders[0].id) !== undefined
        : true; // If no orders in state, it's a consistent (empty) state.
    
    if (isSourcedFromReal) {
         return createResult(checkName, 'success', `Demo mode is OFF. Sourcing from real orders (${realOrdersCount} records).`);
    }
    return createResult(checkName, 'error', `MISMATCH! Demo mode is OFF, but report data appears to be from an unknown source.`);
}

async function check05_ReportDateFilteringLogic(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[CRITICAL] Report Date Filtering Logic';
    const isDemo = store.shopSettings.isDemoModeEnabled;
    // FIX: Access allOrders from the nested reports slice.
    if (!isDemo || store.reports.allOrders.length === 0) {
        return createResult(checkName, 'success', 'Check not applicable (Demo mode is OFF or no data loaded).');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // FIX: Access allOrders from the nested reports slice.
    const hasNonTodayOrders = store.reports.allOrders.some(order => new Date(order.timestamp).getTime() < today.getTime());
    
    if (hasNonTodayOrders) {
         return createResult(checkName, 'success', 'Demo data contains historical records, filtering should work correctly.');
    }
    return createResult(checkName, 'warning', 'Demo data appears to be only for today. Date filtering in reports may show no results for other periods.');
}

async function check06_SalesTransactionReady(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[WORKFLOW] Sales Transaction Ready';
    if (typeof store.handlePlaceOrder === 'function') {
        if (!store.dailyData?.currentShift) {
             return createResult(checkName, 'warning', 'Sales function is ready, but no shift is open. Please start a shift to make sales.');
        }
        return createResult(checkName, 'success', 'Sales function is initialized and a shift is currently open.');
    }
    return createResult(checkName, 'error', 'The core sales function (handlePlaceOrder) is not available.');
}

async function check07_DBStateConsistency(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[STATE-SYNC] DB vs. Report State Consistency';
    // FIX: Demo mode is deprecated, so we only check against the 'orders' table.
    const dbCount = await db.orders.count();
    // FIX: Access allOrders from the nested reports slice.
    const stateCount = store.reports.allOrders.length;
    
    if (dbCount === stateCount) {
        return createResult(checkName, 'success', `State is consistent. ${stateCount} orders in report state match ${dbCount} in IndexedDB.`);
    }
    return createResult(checkName, 'error', `State is out of sync! Report state has ${stateCount} orders, but IndexedDB has ${dbCount}.`);
}

async function check08_ShiftStatusReady(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[SESSION] Shift Status Ready';
     if (store.dailyData && store.dailyData.currentShift) {
        return createResult(checkName, 'success', `Shift ${store.dailyData.currentShift.id} is currently OPEN.`);
    }
    return createResult(checkName, 'success', 'No shift is currently open, which is a valid state.');
}

async function check09_GoogleSheetPing(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[G-SHEET] URL & Ping Test';
    const url = store.shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
    if (!url) return createResult(checkName, 'warning', 'Google Sheet URL is not configured.');
    
    try {
        const result = await googleSheetApiService.postData(url, 'ping', {});
        if (result.status === 'success') {
            return createResult(checkName, 'success', 'Successfully pinged the Google Apps Script URL.');
        }
        return createResult(checkName, 'error', `Ping failed. Script responded with status: ${result.status}.`);
    } catch (e: any) {
        return createResult(checkName, 'error', `Ping failed. Check URL, network, or script deployment. Error: ${e.message}`);
    }
}

async function check10_GoogleSheetWrite(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[G-SHEET] Outbound Data (Write Permission)';
    const url = store.shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
    if (!url) return createResult(checkName, 'warning', 'Check skipped. Google Sheet URL is not configured.');

    try {
        const result = await googleSheetApiService.postData(url, 'ping', {});
        if (result.status === 'success') {
            return createResult(checkName, 'success', 'POST request was successful. Write permissions appear to be correct.');
        }
        return createResult(checkName, 'error', `Write test failed. Script responded with status: ${result.status}.`);
    } catch (e: any) {
        return createResult(checkName, 'error', `Write test failed. Check CORS settings on your Apps Script. Error: ${e.message}`);
    }
}

async function check11_GoogleSheetRead(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[G-SHEET] Inbound Data (Read Permission)';
    const url = store.shopSettings.googleSheetUrl || GOOGLE_SHEET_WEB_APP_URL;
    if (!url) return createResult(checkName, 'warning', 'Check skipped. Google Sheet URL is not configured.');

    try {
        const result = await googleSheetApiService.getMenuData(url);
        if (result.status === 'success' && Array.isArray(result.data.menuItems)) {
            return createResult(checkName, 'success', `GET request was successful. Read permissions appear to be correct. Found ${result.data.menuItems.length} menu items.`);
        }
        return createResult(checkName, 'error', `Read test failed. Script responded with status: ${result.status}.`);
    } catch (e: any) {
        return createResult(checkName, 'error', `Read test failed. Check script permissions for public access (GET). Error: ${e.message}`);
    }
}

async function check12_GoogleAIKey(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[AI] Google AI API Key Validation';
    if (store.ai) {
        return createResult(checkName, 'success', 'Google AI client is initialized in the store.');
    }
    return createResult(checkName, 'error', 'Google AI client is not initialized. Check if API Key is configured correctly.');
}

async function check13_GoogleAIOutbound(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[AI] Outbound Request (Model Access)';
    const ai = store.ai;
    if (!ai) return createResult(checkName, 'warning', 'Check skipped. AI client is not initialized.');

    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "Hello" });
        if (response.text && response.text.length > 0) {
            return createResult(checkName, 'success', 'Successfully sent a request and received a response from the Gemini API.');
        }
        return createResult(checkName, 'error', 'AI response was empty. Model may be unavailable.');
    } catch (e: any) {
         return createResult(checkName, 'error', `AI request failed. Check API key permissions and billing status. Error: ${e.message}`);
    }
}

async function check14_GoogleAIInbound(store: AppStore): Promise<DiagnosticResult> {
    const checkName = '[AI] Inbound Response (Data Integrity)';
    const ai = store.ai;
    if (!ai) return createResult(checkName, 'warning', 'Check skipped. AI client is not initialized.');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: 'Please respond with only the following valid JSON object: { "status": "ok" }',
            config: { responseMimeType: 'application/json' }
        });
        const parsed = JSON.parse(response.text);
        if (parsed.status === 'ok') {
            return createResult(checkName, 'success', 'AI responded with valid, parsable JSON as requested.');
        }
        return createResult(checkName, 'error', 'AI did not respond with the expected JSON structure.');
    } catch (e: any) {
         return createResult(checkName, 'error', `Failed to get valid JSON from AI. The model may not be following instructions. Error: ${e.message}`);
    }
}


// --- MAIN RUNNER ---

const allChecks = [
    check01_IndexedDB,
    check02_MenuDataLoaded,
    check03_ReportDataInitialized,
    check04_ReportDataSourceIntegrity,
    check05_ReportDateFilteringLogic,
    check06_SalesTransactionReady,
    check07_DBStateConsistency,
    check08_ShiftStatusReady,
    check09_GoogleSheetPing,
    check10_GoogleSheetWrite,
    check11_GoogleSheetRead,
    check12_GoogleAIKey,
    check13_GoogleAIOutbound,
    check14_GoogleAIInbound,
];

export const runAllDiagnostics = async (store: AppStore): Promise<DiagnosticResult[]> => {
    const results: DiagnosticResult[] = [];
    for (const check of allChecks) {
        const result = await check(store);
        results.push(result);
    }
    return results;
};