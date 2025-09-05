// lib/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { traceAction } from './sentinelLogger';

interface Props {
  children: ReactNode;
  showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  componentName: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SENTINEL HAS CAPTURED AN ERROR:", error, errorInfo);
    const componentStack = errorInfo.componentStack;

    traceAction({
        actionName: `CRASH in ${this.props.componentName}`,
        payload: { errorMessage: error.message },
        level: 'error',
        componentStack,
    });

    const notificationMessage = `[SENTINEL ALERT] Crash in: ${this.props.componentName}.`;
    this.props.showNotification(notificationMessage, 'error');
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="warning-box">
            <span className="material-symbols-outlined">shield</span>
            <div>
                <h4>[SENTINEL] Component Error: {this.props.componentName}</h4>
                <p>
                    Component ไม่สามารถแสดงผลได้ กรุณาตรวจสอบ Log
                </p>
                <pre style={{ marginTop: '1rem', fontSize: '0.8em' }}>
                    Error: {this.state.error?.message}
                </pre>
            </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;