import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  vendorId: string;
  role: 'superadmin' | 'vendor_admin' | 'vendor_operator' | 'vendor_viewer';
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Mock authentication for demo - in production this would integrate with Appwrite
  useEffect(() => {
    // Simulate authentication check
    const checkAuth = async () => {
      try {
        // In production, this would check for valid JWT token and validate with Appwrite
        const mockUser: AuthUser = {
          id: 'user-123',
          email: 'admin@example.com',
          displayName: 'Admin User',
          vendorId: 'vendor-123',
          role: 'vendor_admin',
          permissions: ['read:products', 'write:products', 'read:customers', 'write:customers', 'read:health']
        };

        setState({
          user: mockUser,
          isLoading: false,
          isAuthenticated: true,
          error: null
        });
      } catch (error) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: (error as Error).message
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // In production, this would authenticate with Appwrite
      const mockUser: AuthUser = {
        id: 'user-123',
        email,
        displayName: 'Admin User',
        vendorId: 'vendor-123',
        role: 'vendor_admin',
        permissions: ['read:products', 'write:products', 'read:customers', 'write:customers', 'read:health']
      };

      setState({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    });
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    return state.user?.permissions.includes(permission) || state.user?.role === 'superadmin' || false;
  }, [state.user]);

  const hasRole = useCallback((...roles: string[]): boolean => {
    return state.user ? roles.includes(state.user.role) || state.user.role === 'superadmin' : false;
  }, [state.user]);

  return {
    ...state,
    login,
    logout,
    hasPermission,
    hasRole
  };
}
