import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { SISClient, SISConfig } from '@school-sis/sdk';
import { User, Tenant, AuthResponse } from '@school-sis/sdk';

interface SISContextType {
  client: SISClient;
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setToken: (token: string, refreshToken?: string) => void;
  setTenantSlug: (tenantSlug: string) => void;
}

const SISContext = createContext<SISContextType | null>(null);

interface SISProviderProps {
  config: SISConfig;
  children: ReactNode;
}

export const SISProvider: React.FC<SISProviderProps> = ({ config, children }) => {
  const [client] = useState(() => new SISClient(config));
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sis_access_token');
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = Boolean(token && user);

  // Initialize token if provided
  useEffect(() => {
    if (token) {
      client.setToken(token);
    }
  }, [token, client]);

  // Load user data from token
  useEffect(() => {
    if (token && !user) {
      loadUserData();
    }
  }, [token, user]);

  const loadUserData = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      // Assuming there's a /me endpoint to get current user data
      const userData = await client.get('/auth/me');
      setUser(userData.user);
      setTenant(userData.tenant);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Clear invalid token
      setTokenState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sis_access_token');
        localStorage.removeItem('sis_refresh_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, client]);

  const login = useCallback(async (email: string, password: string, tenantSlug?: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await client.login(email, password, tenantSlug);
      
      if (response.success) {
        const { accessToken, refreshToken, user: userData, tenant: tenantData } = response.data;
        
        setTokenState(accessToken);
        setUser(userData);
        setTenant(tenantData);
        
        // Store tokens in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('sis_access_token', accessToken);
          localStorage.setItem('sis_refresh_token', refreshToken);
        }
      }
      
      return response;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await client.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setTokenState(null);
      setUser(null);
      setTenant(null);
      
      // Clear tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sis_access_token');
        localStorage.removeItem('sis_refresh_token');
      }
      
      setIsLoading(false);
    }
  }, [client]);

  const setToken = useCallback((newToken: string, refreshToken?: string) => {
    setTokenState(newToken);
    client.setToken(newToken, refreshToken);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('sis_access_token', newToken);
      if (refreshToken) {
        localStorage.setItem('sis_refresh_token', refreshToken);
      }
    }
  }, [client]);

  const setTenantSlug = useCallback((tenantSlug: string) => {
    client.setTenantSlug(tenantSlug);
  }, [client]);

  const contextValue: SISContextType = {
    client,
    user,
    tenant,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setToken,
    setTenantSlug
  };

  return (
    <SISContext.Provider value={contextValue}>
      {children}
    </SISContext.Provider>
  );
};

export const useSIS = (): SISContextType => {
  const context = useContext(SISContext);
  if (!context) {
    throw new Error('useSIS must be used within a SISProvider');
  }
  return context;
};

export default useSIS;
