// src/services/aiAnalysisService.ts
import { GoogleGenAI } from '@google/genai';
import { traceAction } from '../lib/sentinelLogger';

// Interface for the data we will send to the AI for analysis
interface DailySale {
  date: string;
  netSales: number;
}

// Interface for the result we expect from the AI
export interface Anomaly {
  type: 'SalesDip' | 'ProductSpike' | 'QuietHours' | 'PositiveTrend';
  severity: 'low' | 'medium' | 'high';
  finding: string; // Summary of what the AI found
  recommendation: string; // AI's recommendation
}

/**
 * [PROJECT ORACLE]
 * Detects sales data anomalies using the Gemini API.
 * @param ai - Instance of GoogleGenAI
 * @param dailySales - Daily sales data for the selected period
 * @returns Promise that resolves to an array of Anomaly objects
 */
export const runAnomalyDetection = async (
  ai: GoogleGenAI,
  dailySales: DailySale[],
  isLoggingEnabled?: boolean,
): Promise<Anomaly[]> => {
  if (dailySales.length < 3) return []; // Need at least 3 days of data for a trend

  traceAction({ actionName: 'Oracle: Anomaly Detection Started', level: 'lifecycle' }, isLoggingEnabled);

  const prompt = `
    You are "Oracle", a business anomaly detection engine for a POS system.
    Analyze the following time-series sales data. Identify up to 3 most significant anomalies
    (sales dips, product spikes, unusual quiet hours, or strong positive trends).
    For each anomaly, provide a concise "finding" and a short, actionable "recommendation".
    Respond ONLY with a valid JSON array of objects matching this structure:
    [{ "type": "...", "severity": "...", "finding": "...", "recommendation": "..." }]


    Sales Data:
    ${JSON.stringify(dailySales)}
  `;

  try {
    // [ULTRAMAX DEVS] Applying mandatory fix per Lead Architect directive.
    const model = (ai as any).getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const anomalies = JSON.parse(text) as Anomaly[];
    traceAction({ actionName: 'Oracle: Analysis Successful', payload: anomalies, level: 'info' }, isLoggingEnabled);
    return anomalies;
  } catch (error) {
    traceAction({ actionName: 'Oracle: Analysis Failed', payload: { error }, level: 'error' }, isLoggingEnabled);
    console.error('[Oracle Engine] AI Anomaly detection failed:', error);
    return []; // Return an empty array on error
  }
};