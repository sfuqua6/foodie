import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import {
  Home,
  Search,
  Heart,
  User,
  Menu,
  X,
  Star,
  Sparkles,
  MapPin,
  Bell,
  Moon,
  Sun
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { toggleMode, currentMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/ratings', icon: Star, label: 'Ratings' },
    { path: '/', icon: Home, label: 'Home' },
    { path: '/explore', icon: MapPin, label: 'Explore' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Modern Floating Header */}
      <header className="header-float">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-neutral-900">Rate My Rest</h1>
                <p className="text-xs text-neutral-500 leading-none">Chapel Hill Eats</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`nav-item ${isActivePath(path) ? 'active' : 'inactive'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              ))}
            </nav>

            {/* User Actions */}
            {user && (
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggleMode}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  title={`Switch to ${currentMode === 'light' ? 'dark' : 'light'} mode`}
                >
                  {currentMode === 'light' ? (
                    <Moon className="w-5 h-5 text-neutral-600" />
                  ) : (
                    <Sun className="w-5 h-5 text-neutral-600" />
                  )}
                </button>

                {/* Notifications */}
                <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors relative">
                  <Bell className="w-5 h-5 text-neutral-600" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="flex items-center space-x-2 p-2 hover:bg-neutral-100 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-neutral-700">
                      {user.username}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isMobileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900">{user.full_name || user.username}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>

                      <Link
                        to="/profile"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/favorites"
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Heart className="w-4 h-4" />
                        <span>Favorites</span>
                      </Link>

                      <hr className="my-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="md:hidden bottom-nav">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item ${isActivePath(path) ? 'active' : 'inactive'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}

          {/* Profile in mobile nav */}
          <button
            onClick={() => navigate('/profile')}
            className={`nav-item ${isActivePath('/profile') ? 'active' : 'inactive'}`}
          >
            <div className="w-5 h-5 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium">You</span>
          </button>
        </div>
      )}

      {/* Floating Action Button for Quick Actions */}
      {user && (
        <button className="fab">
          <Search className="w-6 h-6" />
        </button>
      )}

      {/* Background overlay when mobile menu is open */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;