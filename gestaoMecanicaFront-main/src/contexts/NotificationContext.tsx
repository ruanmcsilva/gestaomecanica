// src/contexts/NotificationContext.tsx

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'; // NOVO: Adicionado useCallback
import Notification from '../components/Notification';

interface NotificationState {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  // NOVO: Função memoizada para remover uma notificação específica
  const removeNotification = useCallback((idToRemove: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== idToRemove));
  }, []); // Dependência vazia: esta função é criada apenas uma vez

  // NOVO: Função memoizada para exibir uma notificação
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now(); // Gera um ID único para cada notificação
    const newNotification = { message, type, id };
    setNotifications((prev) => [...prev, newNotification]);

    // Remove a notificação após 5 segundos, usando a função removeNotification estável
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, [removeNotification]); // Dependência: removeNotification (que é estável)

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map((notif) => (
        <Notification
          key={notif.id}
          message={notif.message}
          type={notif.type}
          // NOVO: Passa uma callback estável para o onClose do componente Notification
          onClose={() => removeNotification(notif.id)} 
        />
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
