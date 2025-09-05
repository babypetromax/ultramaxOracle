// services/loggingService.ts
import { db } from '../lib/posDB';
import { SystemLog } from '../types';

type LogType = SystemLog['type'];
type LogLevel = SystemLog['level'];
type ContextIds = {
  transactionId?: string;
  shiftId?: string;
  userId?: string;
};

const log = (type: LogType, level: LogLevel, message: string, details?: object, contextIds?: ContextIds) => {
  const logEntry: SystemLog = {
    timestamp: new Date().toISOString(),
    type,
    level,
    message,
    details: {
        ...details,
        context: { ...contextIds }, // Nest context IDs for clarity and to avoid key collisions.
    },
  };
  // Fire and forget to avoid blocking UI thread
  db.systemLogs.add(logEntry).catch(console.error);
};

export const Logger = {
  info: (type: LogType, message: string, details?: object, contextIds?: ContextIds) => 
    log(type, 'INFO', message, details, contextIds),

  warn: (type: LogType, message: string, details?: object, contextIds?: ContextIds) => 
    log(type, 'WARN', message, details, contextIds),
    
  critical: (type: LogType, message: string, details?: object, contextIds?: ContextIds) => 
    log(type, 'CRITICAL', message, details, contextIds),
    
  pageView: (pageName: string) => 
    log('PAGE_VIEW', 'INFO', `User visited ${pageName}`),
    
  action: (actionName: string, details?: object, contextIds?: ContextIds) =>
    log('ACTION', 'INFO', `User action: ${actionName}`, details, contextIds),
    
  error: (errorMessage: string, errorObject?: any, contextIds?: ContextIds) =>
    log('ERROR', 'CRITICAL', errorMessage, { error: String(errorObject) }, contextIds),
};