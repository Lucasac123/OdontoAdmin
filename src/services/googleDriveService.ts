import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export const getDriveAccessToken = async (): Promise<string | null> => {
  return new Promise(async (resolve) => {
    const token = sessionStorage.getItem('gdrive_access_token');
    if (token) {
      resolve(token);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        if (googleUser.authentication.accessToken) {
          sessionStorage.setItem('gdrive_access_token', googleUser.authentication.accessToken);
          resolve(googleUser.authentication.accessToken);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error getting Drive token natively:', error);
        resolve(null);
      }
      return;
    }

    // Web Platform - Use Firebase Auth to avoid redirect_uri_mismatch
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({
        prompt: 'consent'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential && credential.accessToken) {
        sessionStorage.setItem('gdrive_access_token', credential.accessToken);
        resolve(credential.accessToken);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting Drive token via Firebase:', error);
      resolve(null);
    }
  });
};

const getAppFolderId = async (token: string): Promise<string | null> => {
  let folderId = localStorage.getItem('gdrive_app_folder_id');
  if (folderId) return folderId;

  const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='DentalApp_Data' and trashed=false");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    if (response.status === 401) sessionStorage.removeItem('gdrive_access_token');
    return null;
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    folderId = data.files[0].id;
    localStorage.setItem('gdrive_app_folder_id', folderId!);
    return folderId;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'DentalApp_Data',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (createRes.ok) {
    const createData = await createRes.json();
    folderId = createData.id;
    localStorage.setItem('gdrive_app_folder_id', folderId!);
    return folderId;
  }

  return null;
};

const getFileId = async (token: string, folderId: string, fileName: string): Promise<string | null> => {
  const query = encodeURIComponent(`name='${fileName}' and '${folderId}' in parents and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) return null;
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
};

export const googleDriveService = {
  getData: async (collection: string, id: string) => {
    const token = await getDriveAccessToken();
    if (!token) return null;

    const folderId = await getAppFolderId(token);
    if (!folderId) return null;

    const fileName = `${collection}_${id}.json`;
    const fileId = await getFileId(token, folderId, fileName);
    
    if (!fileId) return null;

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) return null;
    return await response.json();
  },
  
  saveData: async (collection: string, id: string, data: any) => {
    const token = await getDriveAccessToken();
    if (!token) return;

    const folderId = await getAppFolderId(token);
    if (!folderId) return;

    const fileName = `${collection}_${id}.json`;
    const fileId = await getFileId(token, folderId, fileName);
    
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      ...(fileId ? {} : { parents: [folderId] })
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(data) +
      close_delim;

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });
  }
};
