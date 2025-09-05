// lib/sentinelLogger.ts
import { addLogEntry, getAllLogs, clearAllLogs } from './sentinelDB';
import { SentinelLogEntry, TraceLevel } from '../types';

// --- NEW: Interface for traceAction parameters for better readability ---
export interface TraceActionOptions {
    actionName: string;
    slice?: string;
    payload?: any;
    stateBefore?: any;
    stateAfter?: any;
    level?: TraceLevel;
    componentStack?: string;
    durationMs?: number;
}

let isInitialized = false;
const initializeSentinel = () => {
    if (isInitialized) return;
    clearAllLogs();
    isInitialized = true;
};

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return '[Circular Reference]'; // Replace circular ref with a string
            }
            seen.add(value);
        }
        return value;
    };
};

// --- UPGRADED traceAction function ---
export const traceAction = (options: TraceActionOptions, isLoggingEnabled?: boolean) => {
    if (isLoggingEnabled === false) {
        return;
    }

    initializeSentinel();

    const {
        actionName,
        slice = 'monolith', // Default to 'monolith' if no slice is specified
        payload,
        stateBefore,
        stateAfter,
        level = 'info',
        componentStack,
        durationMs,
    } = options;

    const logEntry: Omit<SentinelLogEntry, 'id'> = {
        timestamp: new Date(),
        actionName,
        slice,
        level,
        payload: payload ? JSON.stringify(payload, getCircularReplacer()) : undefined,
        stateBefore: stateBefore ? JSON.stringify(stateBefore, getCircularReplacer()) : undefined,
        stateAfter: stateAfter ? JSON.stringify(stateAfter, getCircularReplacer()) : undefined,
        componentStack,
        durationMs,
    };
    
    addLogEntry(logEntry);
};

// --- NEW: Function to log messages directly to the Sentinel UI ---
export const traceConsole = (message: string, ...args: any[]) => {
    console.log('[TRACE CONSOLE]', message, ...args); // Still log to F12 console for developers
    const payload = {
        message,
        additionalData: args.length > 0 ? args : undefined,
    };
    // Use traceAction to send the message to our UI logger
    traceAction({ actionName: 'Console Trace', payload, level: 'console' });
};


// --- UNCHANGED FUNCTIONS ---
export const traceEnvironment = () => {
    const envDetails = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
        },
        window: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
        },
    };
    traceAction({ actionName: 'Application Environment Initialized', payload: envDetails, level: 'environment' });
};

export const exportLogsAsJson = async () => {
    const logs = await getAllLogs();
    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultramax-pos-diagnostic-log-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
};