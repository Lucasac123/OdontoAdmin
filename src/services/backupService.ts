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
  const backupData: Record<string, any[]> = {};

  for (const collName of COLLECTIONS) {
    try {
      const querySnapshot = await getDocs(collection(db, collName));
      backupData[collName] = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((data: any) => data.dentistId === userId || data.userId === userId || collName === 'procedure_templates' || collName === 'documentTemplates');
    } catch (collError) {
      console.warn(`Could not backup collection ${collName} due to permission restrictions or empty table:`, collError);
      // Skip unauthorized tables and continue backing up the rest of the available tables
    }
  }

  await googleDriveService.saveData('backups', `backup_${userId}.json`, backupData);
  return true;
};

export const restoreFromDrive = async (userId: string): Promise<boolean> => {
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
};
