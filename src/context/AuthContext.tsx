import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, sendEmailVerification, updateProfile, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, googleProvider, getDocFromCache } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  firestoreError: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (e: string, p: string, rememberMe?: boolean) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name: string, phone: string, birthDate: string, cro: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '531539311792-07banoj8gike53of1ra4u4cin42cdt20.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          // We only check if the user exists to clear any firestore errors,
          // but we don't create the document here to avoid race conditions with signUpWithEmail
          const userRef = doc(db, 'users', currentUser.uid);
          console.log("Attempting to fetch user document for UID:", currentUser.uid);
          console.log("Firestore instance:", db);
          console.log("Auth currentUser:", auth.currentUser);
          // Small delay to allow auth token to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const fetchUserDoc = async (retries = 3, delay = 1000): Promise<any> => {
            try {
              // Try cache first
              try {
                const cachedSnap = await getDocFromCache(userRef);
                if (cachedSnap.exists()) return cachedSnap;
              } catch (e) {
                // Ignore cache miss
              }
              // If not in cache, try server
              return await getDoc(userRef);
            } catch (error: any) {
              if (retries > 0 && error.code === 'unavailable') {
                console.warn(`Firestore unavailable, retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchUserDoc(retries - 1, delay * 2);
              }
              throw error;
            }
          };

          const userSnap = await fetchUserDoc();
          console.log("User document exists:", userSnap.exists());
          setFirestoreError(null); // Clear error if successful
        } catch (error: any) {
          if (error.code === 'unavailable') {
            console.warn("Firestore unavailable, but continuing as it might be transient or offline.");
          } else {
            console.error("Firestore user sync error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            setFirestoreError(error.message);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    // ... rest of the code
    try {
      setIsSigningIn(true);
      console.log("Starting sign in...");
      
      let result;
      if (Capacitor.isNativePlatform()) {
        console.log("Using Capacitor Native Google Auth");
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        result = await signInWithCredential(auth, credential);
      } else {
        console.log("Using Web Popup Google Auth");
        result = await signInWithPopup(auth, googleProvider);
      }
      
      console.log("Sign in successful for user:", result.user.email);
      
      // Create user document if it doesn't exist
      try {
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || 'Dentist',
            role: 'dentist',
            createdAt: new Date().toISOString()
          });
        }
      } catch (firestoreError) {
        console.error("Error creating user document after Google sign in:", firestoreError);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelado pelo usuário.');
        return;
      }
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

  const signInWithEmail = async (email: string, pass: string, rememberMe: boolean = true) => {
    try {
      setIsSigningIn(true);
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      
      if (!userCred.user.emailVerified) {
        try {
          await sendEmailVerification(userCred.user);
          alert('Seu e-mail ainda não foi verificado. Um novo link de verificação foi enviado para sua caixa de entrada (ou spam). Clique nele antes de entrar.');
        } catch (verifyError) {
          alert('Seu e-mail ainda não foi verificado. Por favor, acesse sua caixa de entrada (ou spam) e clique no link de verificação antes de entrar.');
        }
        await signOut(auth);
        return;
      }
    } catch (error: any) {
      console.error("Error signing in with Email:", error);
      if (error.code === 'auth/operation-not-allowed') {
        alert('O login com E-mail/Senha não está ativado no seu projeto Firebase.\n\nPara ativar:\n1. Acesse o Console do Firebase\n2. Vá em Authentication > Sign-in method\n3. Ative o provedor "E-mail/senha".');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert('O e-mail ou a senha estão incorretos.');
      } else if (error.code === 'auth/invalid-email') {
        alert('O formato do e-mail é inválido.');
      } else {
        alert(`Erro ao entrar: ${error.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, phone: string, birthDate: string, cro: string) => {
    try {
      setIsSigningIn(true);
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Update the user's profile with their name
      await updateProfile(userCred.user, {
        displayName: name
      });

      // Create the user document in Firestore with the additional fields
      const userRef = doc(db, 'users', userCred.user.uid);
      await setDoc(userRef, {
        uid: userCred.user.uid,
        email: email,
        name: name,
        phone: phone,
        birthDate: birthDate,
        cro: cro || '',
        role: 'dentist',
        createdAt: new Date().toISOString()
      });
      
      try {
        await sendEmailVerification(userCred.user);
      } catch (verifyError) {
        console.error("Error sending verification email:", verifyError);
      }
    } catch (error: any) {
      console.error("Error signing up with Email:", error);
      if (error.code === 'auth/operation-not-allowed') {
        alert('O login com E-mail/Senha não está ativado no seu projeto Firebase.\n\nPara ativar:\n1. Acesse o Console do Firebase\n2. Vá em Authentication > Sign-in method\n3. Ative o provedor "E-mail/senha".');
      } else if (error.code === 'auth/email-already-in-use') {
        alert('Este e-mail já está em uso por outra conta. Tente fazer login ou recupere sua senha.');
      } else if (error.code === 'auth/weak-password') {
        alert('A senha é muito fraca. Escolha uma senha com pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        alert('O formato do e-mail é inválido.');
      } else if (error.code === 'auth/error-code:-26') {
        alert('Erro de segurança ou configuração no Firebase (código -26). Tente usar uma senha mais forte (com letras, números e símbolos) ou verifique as configurações de proteção do seu projeto Firebase.');
      } else {
        alert(`Erro ao criar conta: ${error.message}`);
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

  const resetPassword = async (email: string) => {
    try {
      setIsSigningIn(true);
      await sendPasswordResetEmail(auth, email);
      alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.code === 'auth/invalid-email') {
        alert('O formato do e-mail é inválido.');
      } else if (error.code === 'auth/user-not-found') {
        alert('Não encontramos nenhuma conta com este e-mail.');
      } else {
        alert(`Erro ao tentar recuperar a senha: ${error.message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSigningIn, firestoreError, signIn, signInWithEmail, signUpWithEmail, resetPassword, logOut }}>
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
