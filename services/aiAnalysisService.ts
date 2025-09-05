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
    You are "Oracle", an expert business analyst AI integrated into the UltraMax POS system. Your task is to analyze sales data and provide deep, actionable insights IN THAI ONLY, using a professional and analytical tone.

    Analyze the following time-series sales data. Identify up to 3 of the most significant anomalies or trends (e.g., severe sales dips, unexpected product sales spikes, unusually quiet periods, strong positive growth).

    For each anomaly/trend identified, you MUST provide:
    1.  **type**: A machine-readable type from this list: 'SalesDip', 'ProductSpike', 'QuietHours', 'PositiveTrend'.
    2.  **severity**: Your assessment of the severity: 'low', 'medium', or 'high'.
    3.  **finding**: A DETAILED and INSIGHTFUL summary in Thai (at least two sentences) explaining WHAT you found, WHY it is significant, and WHICH dates were most affected. Be specific and use data points where possible.
    4.  **recommendation**: A clear, actionable business recommendation in Thai. Suggest concrete steps the store manager can take to either fix a problem or capitalize on an opportunity. Make it practical for a takoyaki shop.

    Respond ONLY with a valid JSON array of objects following this exact structure. Do not include any text, markdown formatting, or explanations outside of the JSON array itself.

    Sales Data:
    ${JSON.stringify(dailySales)}
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });

    // Directly use response.text as it is guaranteed by responseMimeType
    const anomalies = JSON.parse(response.text) as Anomaly[];
    traceAction({ actionName: 'Oracle: Analysis Successful', payload: anomalies, level: 'info' }, isLoggingEnabled);
    return anomalies;
  } catch (error) {
    traceAction({ actionName: 'Oracle: Analysis Failed', payload: { error }, level: 'error' }, isLoggingEnabled);
    console.error('[Oracle Engine] AI Anomaly detection failed:', error);
    // Return a structured error that can be displayed in the UI
    return [
        {
            type: 'SalesDip', // Generic error type
            severity: 'high',
            finding: 'การวิเคราะห์ข้อมูลล้มเหลว',
            recommendation: `ไม่สามารถเชื่อมต่อกับ Oracle AI Engine ได้ กรุณาตรวจสอบ API Key และการเชื่อมต่ออินเทอร์เน็ต หรือติดต่อฝ่ายสนับสนุนด้านเทคนิค รายละเอียดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown Error'}`
        }
    ];
  }
};