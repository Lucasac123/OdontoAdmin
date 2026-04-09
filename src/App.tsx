import React from 'react';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { StorageProvider } from './context/StorageContext';
import { SyncProvider } from './context/SyncContext';
import { Layout } from './components/Layout';
import { LoadingScreen } from './components/LoadingScreen';

// Lazy loading pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Patients = lazy(() => import('./pages/Patients').then(module => ({ default: module.Patients })));
const PatientDetail = lazy(() => import('./pages/PatientDetail').then(module => ({ default: module.PatientDetail })));
const Dentists = lazy(() => import('./pages/Dentists').then(module => ({ default: module.Dentists })));
const Agenda = lazy(() => import('./pages/Agenda').then(module => ({ default: module.Agenda })));
const Financial = lazy(() => import('./pages/Financial').then(module => ({ default: module.Financial })));
const AIAssistant = lazy(() => import('./pages/AIAssistant').then(module => ({ default: module.AIAssistant })));
const Trash = lazy(() => import('./pages/Trash').then(module => ({ default: module.Trash })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Inventory = lazy(() => import('./pages/Inventory'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const Marketing = lazy(() => import('./pages/Marketing'));
const Pricing = lazy(() => import('./pages/Pricing').then(module => ({ default: module.Pricing })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (user) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StorageProvider>
          <SyncProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="dentists" element={<Dentists />} />
                    <Route path="patients" element={<Patients />} />
                    <Route path="patients/:id" element={<PatientDetail />} />
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="financial" element={<Financial />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="laboratory" element={<Laboratory />} />
                    <Route path="marketing" element={<Marketing />} />
                    <Route path="ai-assistant" element={<AIAssistant />} />
                    <Route path="trash" element={<Trash />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SyncProvider>
        </StorageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
