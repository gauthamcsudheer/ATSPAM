import { useState, useEffect } from 'react';

const Notifications = ({ notifications, onClearAll }) => {
    if (notifications.length === 0) {
        return (
            <div className="notifications-panel empty">
                <p>You have no new notifications.</p>
            </div>
        );
    }

    return (
        <div className="notifications-panel">
            <div className="notifications-header">
                <h4>Notifications</h4>
                <button onClick={onClearAll} className="clear-all-button">Mark all as read</button>
            </div>
            <div className="notifications-list">
                {notifications.map(notif => (
                    <div key={notif.id} className="notification-item">
                        <p>{notif.message}</p>
                        <span className="notification-time">
                            {new Date(notif.created_at).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Notifications; 