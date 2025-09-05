
import React, { useState } from 'react';
import { runAllDiagnostics, DiagnosticResult } from '../../lib/diagnosticsService';
import { useStore } from '../../contexts/store/index';

const SentinelDiagnostics: React.FC = () => {
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const store = useStore(); 

    const handleRunDiagnostics = async () => {
        setIsLoading(true);
        setResults([]);
        const diagnosticResults = await runAllDiagnostics(store);
        setResults(diagnosticResults);
        setIsLoading(false);
    };

    const getStatusIcon = (status: 'success' | 'error' | 'warning' | 'idle') => {
        switch (status) {
            case 'success': return <span className="material-symbols-outlined status-success">check_circle</span>;
            case 'error': return <span className="material-symbols-outlined status-error">cancel</span>;
            case 'warning': return <span className="material-symbols-outlined status-warning">warning</span>;
            default: return <span className="material-symbols-outlined status-idle">pending</span>;
        }
    };

    return (
        <div className="settings-card">
            <h3>Oracle System Analyzer</h3>
            <p className="text-secondary" style={{marginBottom: '1.5rem'}}>Run a series of automated checks on critical system components to identify potential issues.</p>
            
            <button className="action-button magic-button" onClick={handleRunDiagnostics} disabled={isLoading} style={{width: '100%', justifyContent: 'center'}}>
                <span className="material-symbols-outlined">{isLoading ? 'hourglass_top' : 'neurology'}</span>
                {isLoading ? 'Analyzing System...' : 'Run System Diagnostics'}
            </button>

            {results.length > 0 && (
                <ul className="diagnostics-list">
                    {results.map((result, index) => (
                        <li key={index} className={`diagnostics-item status-${result.status}`}>
                            <div className="diagnostics-status">
                                {getStatusIcon(result.status)}
                            </div>
                            <div className="diagnostics-details">
                                <strong>{result.checkName}</strong>
                                <small>{result.message}</small>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SentinelDiagnostics;
