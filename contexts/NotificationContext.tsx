import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    notifications: Notification[];
    showNotification: (message: string, type?: NotificationType, duration?: number) => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications(currentNotifications =>
            currentNotifications.filter(notification => notification.id !== id)
        );
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType = 'info', duration: number = 5000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNotification: Notification = { id, message, type };
        
        setNotifications(currentNotifications => [...currentNotifications, newNotification]);
        
        setTimeout(() => {
            removeNotification(id);
        }, duration);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};