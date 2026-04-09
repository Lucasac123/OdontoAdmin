import React, { createContext, useContext, useState, useCallback } from 'react';

interface SyncContextType {
  isSyncing: boolean;
  addSyncTask: (promise: Promise<any>) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTasks, setActiveTasks] = useState<number>(0);

  const addSyncTask = useCallback(async (promise: Promise<any>) => {
    setActiveTasks(prev => prev + 1);
    try {
      await promise;
    } catch (error) {
      console.error("Background sync error:", error);
    } finally {
      setActiveTasks(prev => prev - 1);
    }
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing: activeTasks > 0, addSyncTask }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
