import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { apiRequest, toFormBody } from "../api/client";
import type { RegisterResponse, TokenResponse } from "./types";

const STORAGE_KEY = "assistant_ui_user_token";

type AuthContextValue = {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const setTokenAndStore = useCallback((value: string | null) => {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setToken(value);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const body = toFormBody({ username: email, password, grant_type: "password" });
    const data = await apiRequest<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body,
      contentType: "application/x-www-form-urlencoded",
    });
    setTokenAndStore(data.access_token);
  }, [setTokenAndStore]);

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<RegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({ email, password }),
    });
    setTokenAndStore(data.token.access_token);
  }, [setTokenAndStore]);

  const logout = useCallback(() => {
    setTokenAndStore(null);
  }, [setTokenAndStore]);

  const value = useMemo(() => ({ token, login, register, logout }), [token, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
