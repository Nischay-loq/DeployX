import React, { useEffect, useState } from 'react';
import '../css/Notification.css';

const Notification = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isManualClose, setIsManualClose] = useState(false);

  useEffect(() => {
    let removalTimer;
    let closeTimer;
    
    if (duration && onClose && !isManualClose) {
      // Start the removal animation slightly before actual removal
      removalTimer = setTimeout(() => {
        setIsRemoving(true);
      }, duration - 300);

      // Actually remove the notification
      closeTimer = setTimeout(() => {
        onClose();
      }, duration);
    }

    return () => {
      if (removalTimer) clearTimeout(removalTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [duration, onClose, isManualClose]);

  const handleClose = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsManualClose(true);
    setIsRemoving(true);
    setTimeout(() => {
      if (onClose) onClose();
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
