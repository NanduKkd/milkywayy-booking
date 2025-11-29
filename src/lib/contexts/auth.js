"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { logout as logoutAction } from "@/lib/actions/auth";
import LoginModal from "@/components/LoginModal";

const AuthContext = createContext();

export function AuthProvider({ children, initialUser }) {
  const [authState, setAuthState] = useState({
    user: initialUser || null,
    isLoading: false,
    isAuthenticated: !!initialUser,
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const login = () => {
    setIsLoginModalOpen(true);
  };

  const logout = async () => {
    await logoutAction();

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
