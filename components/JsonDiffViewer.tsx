// components/JsonDiffViewer.tsx
import React from 'react';

interface JsonDiffViewerProps {
    stateBefore?: string;
    stateAfter?: string;
}

// A simple diffing utility
const generateDiff = (before: object, after: object) => {
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const diff: Record<string, any> = {};

    for (const key of allKeys) {
        const beforeValue = JSON.stringify(before[key]);
        const afterValue = JSON.stringify(after[key]);

        if (!before.hasOwnProperty(key)) {
            diff[key] = { type: 'added', value: after[key] };
        } else if (!after.hasOwnProperty(key)) {
            diff[key] = { type: 'removed', value: before[key] };
        } else if (beforeValue !== afterValue) {
            diff[key] = { type: 'changed', from: before[key], to: after[key] };
        }
    }
    return diff;
};

const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({ stateBefore, stateAfter }) => {
    if (!stateBefore || !stateAfter) {
        return <pre>No state change recorded for this action.</pre>;
    }

    try {
        const beforeObj = JSON.parse(stateBefore);
        const afterObj = JSON.parse(stateAfter);
        const diff = generateDiff(beforeObj, afterObj);

        if (Object.keys(diff).length === 0) {
            return <pre>State is identical. No changes detected.</pre>;
        }

        return (
            <div className="diff-viewer">
                {Object.entries(diff).map(([key, change]) => (
                    <div key={key} className={`diff-entry diff-${change.type}`}>
                        <strong className="diff-key">{key}:</strong>
                        {change.type === 'added' && <span className="diff-value">{JSON.stringify(change.value, null, 2)}</span>}
                        {change.type === 'removed' && <span className="diff-value">{JSON.stringify(change.value, null, 2)}</span>}
                        {change.type === 'changed' && (
                            <div>
                                <span className="diff-from">- {JSON.stringify(change.from, null, 2)}</span>
                                <span className="diff-to">+ {JSON.stringify(change.to, null, 2)}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    } catch (e) {
        return <pre>Error parsing state JSON for diffing.</pre>;
    }
};

export default JsonDiffViewer;
