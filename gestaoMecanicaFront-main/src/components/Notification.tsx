// src/components/Notification.tsx
import React, {useEffect, useState} from "react";




interface NotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}


const Notification: React.FC<NotificationProps> = ({ message, type, onClose}) => {
    const [isVisible, setIsVisible] = useState(true);


    useEffect(() => {
        const timer = setTimeout (() => {
            setIsVisible(false);
            onClose();
        },5000);
        return () => clearTimeout(timer);
    }, [message, onClose]);


    if (!isVisible) {
        return null;
    }

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const textColor = 'text-white';


    return (
         <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center justify-between z-50 ${bgColor} ${textColor}`}
      role="alert"
    >
      <span>{message}</span>
      <button onClick={() => { setIsVisible(false); onClose(); }} className="ml-4 text-lg font-bold">
        &times;
      </button>
    </div>
    );
};


export default Notification;

