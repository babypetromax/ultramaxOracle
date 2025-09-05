import React, { Component, ErrorInfo, ReactNode } from 'react';
import { traceAction } from './sentinelLogger'; // <-- IMPORT the logger

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

  // FIX: Changed to a standard class method. React binds `this` for lifecycle methods, which resolves the TypeScript error.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SENTINEL HAS CAPTURED AN ERROR:", error, errorInfo);

    const componentStack = errorInfo.componentStack;

    // --- DEEP DIAGNOSTICS TRACING ---
    // Log the crash itself as an ERROR event with the full component stack
    traceAction({
        actionName: `CRASH in ${this.props.componentName}`,
        payload: { errorMessage: error.message },
        level: 'error',
        componentStack, // <-- Pass the stack trace
    });
    
    const notificationMessage = `[SENTINEL ALERT] Crash in: ${this.props.componentName}. Please export the diagnostic log.`;
    this.props.showNotification(notificationMessage, 'error');
  }

  // FIX: Changed to a standard class method. React binds `this` for lifecycle methods, which resolves the TypeScript error.
  public render() {
    if (this.state.hasError) {
      return (
        <div className="warning-box">
            <span className="material-symbols-outlined">shield</span>
            <div>
                <h4>[SENTINEL] ระบบตรวจพบข้อผิดพลาดร้ายแรงใน Component: {this.props.componentName}</h4>
                <p>
                    Component ไม่สามารถแสดงผลได้ แต่ระบบหลักยังคงทำงานอยู่
                    กรุณาไปที่หน้า "รายงาน" > "ประวัติระบบ (วินิจฉัย)" เพื่อส่งออกไฟล์ Log ให้ทีม Engineer
                </p>
                <pre style={{ marginTop: '1rem', fontSize: '0.8em', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                    Error Message: {this.state.error?.message}
                </pre>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
