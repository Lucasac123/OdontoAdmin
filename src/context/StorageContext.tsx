import React, { createContext, useContext, useState, ReactNode } from 'react';

type StorageLocation = 'local' | 'drive' | 'firebase';

interface StorageContextType {
  storageLocation: StorageLocation;
  setStorageLocation: (location: StorageLocation) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('firebase');

  return (
    <StorageContext.Provider value={{ storageLocation, setStorageLocation }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
