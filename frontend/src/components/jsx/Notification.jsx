import React, { useEffect, useState } from 'react';
import '../css/Notification.css';

const Notification = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    let removalTimer;
    if (duration && onClose) {
      // Start the removal animation slightly before actual removal
      removalTimer = setTimeout(() => {
        setIsRemoving(true);
      }, duration - 300);

      // Actually remove the notification
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => {
        clearTimeout(timer);
        clearTimeout(removalTimer);
      };
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  return (
    <div className={`notification ${type} ${isRemoving ? 'removing' : ''}`}>
      <span className="notification-message">{message}</span>
      {onClose && (
        <button 
          className="notification-close" 
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Notification;
