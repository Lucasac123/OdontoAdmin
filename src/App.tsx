import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { LoadingScreen } from './components/LoadingScreen';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { Dentists } from './pages/Dentists';
import { Agenda } from './pages/Agenda';
import { Financial } from './pages/Financial';
import { AIAssistant } from './pages/AIAssistant';
import { Trash } from './pages/Trash';
import { Login } from './pages/Login';
import Inventory from './pages/Inventory';
import Laboratory from './pages/Laboratory';
import Marketing from './pages/Marketing';
import { Pricing } from './pages/Pricing';
import { Profile } from './pages/Profile';

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
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
