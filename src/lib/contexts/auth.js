"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import DashboardLoginModal from "@/components/DashboardLoginModal";
import { logout as logoutAction } from "@/lib/actions/auth";
import {
  normalizeAuthorizationErrorPath,
  normalizeAuthorizationResumePath,
} from "@/lib/oauth/authorizationResume";

const AuthContext = createContext(null);
const EMPTY_LOGIN_FLOW = Object.freeze({
  nextPath: null,
  cancelPath: null,
});

export function AuthProvider({ children, initialUser }) {
  const router = useRouter();
  const [authState, setAuthState] = useState({
    user: initialUser || null,
    isLoading: false,
    isAuthenticated: !!initialUser,
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginFlowState, setLoginFlowState] = useState(EMPTY_LOGIN_FLOW);

  const login = (options = {}) => {
    setLoginFlowState({
      nextPath: normalizeAuthorizationResumePath(options.nextPath),
      cancelPath: normalizeAuthorizationErrorPath(options.cancelPath),
    });
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

    if (loginFlowState.nextPath) {
      router.replace(loginFlowState.nextPath);
    }
  };

  const handleLoginClose = (reason = "cancel") => {
    setIsLoginModalOpen(false);

    const cancelPath = reason === "cancel" ? loginFlowState.cancelPath : null;
    setLoginFlowState(EMPTY_LOGIN_FLOW);

    if (cancelPath) {
      router.replace(cancelPath);
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}

      {/* ✅ LOGIN MODAL MOUNTED ONCE */}
      <DashboardLoginModal
        isOpen={isLoginModalOpen}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
