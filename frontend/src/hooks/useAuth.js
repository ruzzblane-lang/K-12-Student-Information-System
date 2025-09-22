import { useState, useEffect, createContext, useContext } from 'react';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('authToken');
    if (token) {
      // In a real app, you'd validate the token with the backend
      // For now, we'll just set a mock user
      setUser({
        _id: 1,
        email: 'admin@school.com',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      });
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email, _password) => {
    try {
      // Mock login - in a real app, this would call the backend
      const mockUser = {
        _id: 1,
        email,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      };
      
      setUser(mockUser);
      setIsAuthenticated(true);
      localStorage.setItem('authToken', 'mock-jwt-token');
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
