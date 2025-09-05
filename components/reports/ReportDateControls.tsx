// src/components/reports/ReportDateControls.tsx
import React from 'react';
import { traceAction } from '../../lib/sentinelLogger'; // <-- IMPORT SENTINEL

interface ReportDateControlsProps {
    dateRange: { start: string; end: string };
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSetDatePreset: (preset: 'today' | 'yesterday' | 'last7days' | 'thisMonth') => void;
}

const ReportDateControls: React.FC<ReportDateControlsProps> = ({
    dateRange,
    onDateChange,
    onSetDatePreset,
}) => {
    // [AURA] UI/UX Note: Styles here are directly lifted from the original implementation
    // to maintain 100% visual consistency.
    const dateInputStyle: React.CSSProperties = {
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid #334155',
        color: 'white',
        borderRadius: '0.5rem',
        padding: '0.5rem',
        fontFamily: 'inherit',
        fontSize: '0.875rem'
    };

    const handlePresetClick = (preset: 'today' | 'yesterday' | 'last7days' | 'thisMonth') => {
        // --- ORACLE SENSOR ---
        traceAction({
            slice: 'reports-ui',
            actionName: 'datePresetClicked',
            payload: { preset },
            level: 'info'
        });
        // --- END SENSOR ---
        onSetDatePreset(preset);
    };

    return (
        <div className="chronos-container">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="date" name="start" value={dateRange.start} onChange={onDateChange} style={dateInputStyle} />
                <span>-</span>
                <input type="date" name="end" value={dateRange.end} onChange={onDateChange} style={dateInputStyle} />
            </div>

            <div className="chronos-presets">
                <button className="chronos-preset-btn" onClick={() => handlePresetClick('today')}>วันนี้</button>
                <button className="chronos-preset-btn" onClick={() => handlePresetClick('yesterday')}>เมื่อวาน</button>
                <button className="chronos-preset-btn" onClick={() => handlePresetClick('last7days')}>7 วันล่าสุด</button>
                <button className="chronos-preset-btn" onClick={() => handlePresetClick('thisMonth')}>เดือนนี้</button>
            </div>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', alignItems: 'center', opacity: 0.6, color: 'var(--text-secondary)', cursor: 'not-allowed' }} title="AI Features (Coming Soon)">
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'inherit' }}>
                    Time-Lapse Slider
                    <label className="switch"><input type="checkbox" disabled /><span className="slider"></span></label>
                </label>
                 <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'inherit' }}>
                    AI Comparison
                    <label className="switch"><input type="checkbox" disabled /><span className="slider"></span></label>
                </label>
                 <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'inherit' }}>
                    AI Anomaly Detection
                    <label className="switch"><input type="checkbox" disabled /><span className="slider"></span></label>
                </label>
            </div>
        </div>
    );
};

export default ReportDateControls;