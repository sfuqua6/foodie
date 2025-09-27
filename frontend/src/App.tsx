import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import UserOnboarding from './components/UserOnboarding';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import Ratings from './pages/Ratings';
import Profile from './pages/Profile';
import { Star, Sparkles } from 'lucide-react';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
              <Star className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-white/10 rounded-full mx-auto animate-ping"></div>
          </div>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-white/80" />
            <h2 className="heading-4 text-white">Rate My Rest</h2>
            <Sparkles className="w-5 h-5 text-white/80" />
          </div>
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-white/70 text-sm mt-4">Loading your culinary journey...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
              <Star className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-white/10 rounded-full mx-auto animate-ping"></div>
          </div>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-white/80" />
            <h2 className="heading-4 text-white">Rate My Rest</h2>
            <Sparkles className="w-5 h-5 text-white/80" />
          </div>
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-white/70 text-sm mt-4">Welcome to Chapel Hill's best...</p>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/" /> : <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Feed />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute>
            <Layout>
              <Explore />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ratings"
        element={
          <ProtectedRoute>
            <Layout>
              <Ratings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <UserOnboarding />
            <AppRoutes />
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'font-medium',
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                borderRadius: '16px',
                border: '1px solid var(--color-neutral-200)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.12)',
              },
              success: {
                duration: 3000,
                style: {
                  background: 'linear-gradient(135deg, var(--color-secondary-500) 0%, var(--color-secondary-600) 100%)',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: 'var(--color-secondary-500)',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#EF4444',
                },
              },
              loading: {
                style: {
                  background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%)',
                  color: '#fff',
                },
              },
            }}
          />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;