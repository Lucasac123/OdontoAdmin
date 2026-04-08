import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { googleDriveService } from './googleDriveService';

const COLLECTIONS = [
  'patients',
  'dentists',
  'appointments',
  'finances',
  'inventory',
  'clinicSettings',
  'quickNotes',
  'crm_deals',
  'lab_jobs',
  'files',
  'clinical_evolutions',
  'procedure_templates',
  'notificationSettings',
  'fixed_expenses',
  'documentTemplates'
];

export const backupToDrive = async (userId: string): Promise<boolean> => {
  try {
    const backupData: Record<string, any[]> = {};

    for (const collName of COLLECTIONS) {
      const querySnapshot = await getDocs(collection(db, collName));
      backupData[collName] = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((data: any) => data.dentistId === userId || data.userId === userId || collName === 'procedure_templates' || collName === 'documentTemplates');
    }

    const backupString = JSON.stringify(backupData);
    
    await googleDriveService.saveData('backups', `backup_${userId}.json`, backupData);
    return true;
  } catch (error) {
    console.error('Error backing up to Drive:', error);
    return false;
  }
};

export const restoreFromDrive = async (userId: string): Promise<boolean> => {
  try {
    const backupData = await googleDriveService.getData('backups', `backup_${userId}.json`);
    if (!backupData) return false;

    const batch = writeBatch(db);

    for (const collName of COLLECTIONS) {
      if (backupData[collName] && Array.isArray(backupData[collName])) {
        for (const item of backupData[collName]) {
          const { id, ...data } = item;
          const docRef = doc(db, collName, id);
          batch.set(docRef, data, { merge: true });
        }
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error restoring from Drive:', error);
    return false;
  }
};
