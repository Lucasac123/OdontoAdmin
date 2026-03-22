import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || 'Dentist',
              role: 'dentist',
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        // We don't want to throw here as it would crash the listener
        // and prevent setLoading(false) from running.
        // If it's a Firestore error, we can log it.
        if (currentUser) {
          try {
            handleFirestoreError(error, OperationType.WRITE, 'users');
          } catch (e) {
            // handleFirestoreError throws, so we catch it here to allow setLoading(false)
            console.error("Handled Firestore Error:", e);
          }
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setIsSigningIn(true);
      console.log("Starting sign in with popup...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Sign in successful for user:", result.user.email);
    } catch (error: any) {
      console.error("Error signing in:", error);
      
      if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        alert(`Erro de Autenticação: O domínio "${currentDomain}" não está autorizado no Console do Firebase.\n\nPor favor, adicione este domínio em: Console Firebase > Authentication > Settings > Authorized Domains.`);
      } else if (error.code === 'auth/popup-blocked') {
        alert('O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site.');
      } else {
        alert(`Erro ao entrar: ${error.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSigningIn, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
