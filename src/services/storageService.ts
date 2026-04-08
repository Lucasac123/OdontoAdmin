import { doc, getDoc, setDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../firebase';
import { googleDriveService } from './googleDriveService';

// Interface para padronizar as operações
export interface DataService {
  getData: (collection: string, id: string) => Promise<any>;
  saveData: (collection: string, id: string, data: any) => Promise<void>;
}

// Implementação Firebase
const firebaseService: DataService = {
  getData: async (collection, id) => {
    const docRef = doc(db, collection, id);
    try {
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      const snap = await getDocFromCache(docRef);
      return snap.exists() ? snap.data() : null;
    }
  },
  saveData: async (collection, id, data) => {
    const docRef = doc(db, collection, id);
    await setDoc(docRef, data, { merge: true });
  }
};

// Implementação LocalStorage
const localStorageService: DataService = {
  getData: async (collection, id) => {
    const data = localStorage.getItem(`${collection}_${id}`);
    return data ? JSON.parse(data) : null;
  },
  saveData: async (collection, id, data) => {
    localStorage.setItem(`${collection}_${id}`, JSON.stringify(data));
  }
};

// Função principal que retorna o serviço correto
export const getDataService = (location: 'local' | 'drive' | 'firebase'): DataService => {
  switch (location) {
    case 'local': return localStorageService;
    case 'drive': return googleDriveService;
    case 'firebase': return firebaseService;
    default: return firebaseService;
  }
};
