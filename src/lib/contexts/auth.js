"use client";

import { createContext, useContext, useState, useEffect } from "react";
// import { getSessionUser, setSessionUser } from "@/lib/helpers/auth";
import LoginModal from "@/components/LoginModal";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    user: null,
    isLoading: false, // Changed to false for frontend development
    isAuthenticated: false,
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Load auth state on component mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        // TODO: Uncomment when backend is ready
        // const user = await getSessionUser();
        const user = null; // Mock for frontend development
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: !!user,
        });
      } catch (error) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    loadAuthState();
  }, []);

  const login = () => {
    setIsLoginModalOpen(true);
  };

  const logout = async () => {
    // TODO: Uncomment when backend is ready
    // await setSessionUser(null);

    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const handleLoginSuccess = (userData) => {
    setAuthState({
      user: userData,
      isLoading: false,
      isAuthenticated: true,
    });
    setIsLoginModalOpen(false);
  };

  const value = {
    authState,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}