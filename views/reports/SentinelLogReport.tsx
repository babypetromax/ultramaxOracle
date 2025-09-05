// views/reports/SentinelLogReport.tsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { SentinelLogEntry } from '../../types';
import { getAllLogs } from '../../lib/sentinelDB';
import JsonDiffViewer from '../../components/JsonDiffViewer';

type LogFilter = 'all' | 'error' | 'lifecycle' | 'info' | 'environment' | 'warn';

const DetailPanel: React.FC<{ log: SentinelLogEntry | null }> = ({ log }) => {
    if (!log) {
        return <div className="detail-panel-placeholder">Select a log entry to view details.</div>;
    }
    return (
        <div className="detail-panel">
            <h4><span className={`log-level-badge level-${log.level}`}>{log.level}</span> {log.actionName}</h4>
            <div className="detail-section">
                <strong>Timestamp:</strong> {new Date(log.timestamp).toISOString()}
            </div>
            {log.durationMs !== undefined && (
                <div className="detail-section"><strong>Duration:</strong> {log.durationMs.toFixed(2)} ms</div>
            )}
            {log.payload && <div className="detail-section"><strong>Payload / Details:</strong><pre>{JSON.stringify(JSON.parse(log.payload), null, 2)}</pre></div>}
            
            {log.componentStack && (
                <div className="detail-section">
                    <strong>Component Stack Trace:</strong>
                    <pre className="stack-trace">{log.componentStack}</pre>
                </div>
            )}

            <div className="detail-section">
                <strong>State Change (Diff):</strong>
                <JsonDiffViewer stateBefore={log.stateBefore} stateAfter={log.stateAfter} />
            </div>
        </div>
    );
};


const SentinelLogReport: React.FC = () => {
    const [allLogs, setAllLogs] = useState<SentinelLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<LogFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            const logs = await getAllLogs();
            const sortedLogs = logs.sort((a, b) => (b.id || 0) - (a.id || 0));
            setAllLogs(sortedLogs);
            if (sortedLogs.length > 0) {
                 setSelectedLogId(sortedLogs[0].id);
            }
            setIsLoading(false);
        };
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        return allLogs.filter(log => {
            const matchesFilter = filter === 'all' || log.level === filter;
            const lowerCaseQuery = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' || 
                log.actionName.toLowerCase().includes(lowerCaseQuery) ||
                (log.payload && log.payload.toLowerCase().includes(lowerCaseQuery));
            return matchesFilter && matchesSearch;
        });
    }, [allLogs, filter, searchQuery]);

    const selectedLog = useMemo(() => {
        return allLogs.find(log => log.id === selectedLogId) || null;
    }, [selectedLogId, allLogs]);
    
    const getRowClass = (level: string) => {
        if (level === 'error') return 'log-row-error';
        if (level === 'lifecycle') return 'log-row-lifecycle';
        if (level === 'environment') return 'log-row-environment';
        return '';
    };

    return (
        <div className="sentinel-report-container">
            <div className="sentinel-controls">
                <div className="search-bar-container" style={{ flexGrow: 1 }}>
                     <span className="material-symbols-outlined search-icon">search</span>
                     <input
                        type="text"
                        placeholder="ค้นหา Action หรือ Payload..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="menu-search-input"
                     />
                </div>
                <div className="report-view-toggle">
                    <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
                    <button className={filter === 'error' ? 'active' : ''} onClick={() => setFilter('error')}>Errors</button>
                    <button className={filter === 'lifecycle' ? 'active' : ''} onClick={() => setFilter('lifecycle')}>Lifecycle</button>
                    <button className={filter === 'environment' ? 'active' : ''} onClick={() => setFilter('environment')}>Env</button>
                    <button className={filter === 'info' ? 'active' : ''} onClick={() => setFilter('info')}>Info</button>
                </div>
            </div>

            <div className="master-detail-layout">
                <div className="log-list-panel">
                    {isLoading ? <p style={{padding: '1rem'}}>Loading...</p> : (
                        <table className="report-table log-table">
                            <tbody>
                                {filteredLogs.length === 0 && (
                                    <tr><td><div className="detail-panel-placeholder" style={{height: '50px', fontSize: '1em'}}>No logs found.</div></td></tr>
                                )}
                                {filteredLogs.map((log) => (
                                    <tr 
                                        key={log.id} 
                                        className={`${getRowClass(log.level)} ${selectedLogId === log.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedLogId(log.id)}
                                    >
                                        <td>
                                            <div className="log-summary-compact">
                                                <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString('th-TH')}</span>
                                                <span className={`log-level-badge level-${log.level}`}>{log.level}</span>
                                                <span className="log-action-name">{log.actionName}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <DetailPanel log={selectedLog} />
            </div>
        </div>
    );
};

export default SentinelLogReport;