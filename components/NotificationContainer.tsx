import React from 'react';
import { Notification, NotificationType } from '../contexts/NotificationContext';

interface NotificationContainerProps {
    notifications: Notification[];
    onClose: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onClose }) => {
    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info':
            default: return 'info';
        }
    };

    return (
        <div className="notification-container">
            {notifications.map(notification => (
                <div key={notification.id} className={`notification-toast type-${notification.type}`} role="alert" aria-live="assertive">
                    <span className="material-symbols-outlined notification-icon">{getIcon(notification.type)}</span>
                    <p className="notification-message">{notification.message}</p>
                    <button onClick={() => onClose(notification.id)} className="notification-close-btn" aria-label="Close notification">&times;</button>
                </div>
            ))}
        </div>
    );
};

export default NotificationContainer;