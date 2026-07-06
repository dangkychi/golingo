import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

import './i18n';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Stories from './pages/Stories';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StoryDetail from './pages/StoryDetail';
import ChapterReader from './pages/ChapterReader';
import Vocabulary from './pages/Vocabulary';
import Flashcard from './pages/Flashcard';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

// Admin Imports
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStories from './pages/admin/AdminStories';
import AdminStoryForm from './pages/admin/AdminStoryForm';
import AdminChapters from './pages/admin/AdminChapters';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGutenbergImport from './pages/admin/AdminGutenbergImport';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { authAPI } from './api/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const { theme } = useUIStore();
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const { data } = await authAPI.getMe();
          setUser(data.user);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, [setUser, setLoading]);

  if (isLoading) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/:slug" element={<StoryDetail />} />
          <Route path="/stories/:slug/chapters/:num" element={<ChapterReader />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/flashcard" element={<Flashcard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="stories" element={<AdminStories />} />
            <Route path="stories/new" element={<AdminStoryForm />} />
            <Route path="stories/:id/edit" element={<AdminStoryForm />} />
            <Route path="stories/:storyId/chapters" element={<AdminChapters />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="gutenberg" element={<AdminGutenbergImport />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 15, 0.95)',
            color: '#fff',
            border: '1px solid var(--neon-cyan, #00f0ff)',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)',
            fontFamily: "'Quicksand', sans-serif",
          }
        }} 
      />
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
