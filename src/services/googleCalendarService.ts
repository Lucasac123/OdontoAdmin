import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export const getCalendarAccessToken = async (): Promise<string | null> => {
  return new Promise(async (resolve) => {
    const token = sessionStorage.getItem('gcalendar_access_token');
    if (token) {
      resolve(token);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        if (googleUser.authentication.accessToken) {
          sessionStorage.setItem('gcalendar_access_token', googleUser.authentication.accessToken);
          resolve(googleUser.authentication.accessToken);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error getting Calendar token natively:', error);
        resolve(null);
      }
      return;
    }

    // Web Platform - Use Firebase Auth to avoid redirect_uri_mismatch
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.setCustomParameters({
        prompt: 'consent'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential && credential.accessToken) {
        sessionStorage.setItem('gcalendar_access_token', credential.accessToken);
        resolve(credential.accessToken);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting Calendar token via Firebase:', error);
      resolve(null);
    }
  });
};

export const googleCalendarService = {
  createEvent: async (title: string, dateIso: string, durationMin: number, notes: string): Promise<string | null> => {
    const token = await getCalendarAccessToken();
    if (!token) {
      console.warn('Google Calendar authorization failed or was denied.');
      return null;
    }

    try {
      const startDate = new Date(dateIso);
      const endDate = new Date(startDate.getTime() + durationMin * 60000);

      const event = {
        summary: title,
        description: notes,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token might have expired, clear it
          sessionStorage.removeItem('gcalendar_access_token');
        }
        console.error('Failed to create Google Calendar event:', await response.text());
        return null;
      }

      const data = await response.json();
      return data.htmlLink || 'success';
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return null;
    }
  },
};
