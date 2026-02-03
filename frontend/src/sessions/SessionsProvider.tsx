import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export type SessionItem = {
  sessionId: string;
  name: string;
  token: string;
};

type SessionResponse = {
  session_id: string;
  name: string;
  token: {
    access_token: string;
    token_type: string;
    expires_at: string;
  };
};

type SessionsContextValue = {
  sessions: SessionItem[];
  activeSession: SessionItem | null;
  setActiveSessionId: (sessionId: string) => void;
  refreshSessions: () => Promise<void>;
  createSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
};

const SessionsContext = createContext<SessionsContextValue | undefined>(undefined);

const mapSession = (session: SessionResponse): SessionItem => ({
  sessionId: session.session_id,
  name: session.name,
  token: session.token.access_token,
});

export const SessionsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    if (!token) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }
    const data = await apiRequest<SessionResponse[]>("/api/v1/auth/sessions", { token });
    const mapped = data.map(mapSession);
    setSessions(mapped);
    if (mapped.length && !mapped.find((item) => item.sessionId === activeSessionId)) {
      setActiveSessionId(mapped[0].sessionId);
    }
  }, [token, activeSessionId]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const createSession = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await apiRequest<SessionResponse>("/api/v1/auth/session", {
      method: "POST",
      token,
    });
    const newSession = mapSession(data);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.sessionId);
  }, [token]);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((item) => item.sessionId === sessionId);
      if (!session) {
        return;
      }
      await apiRequest<void>(`/api/v1/auth/session/${sessionId}`, {
        method: "DELETE",
        token: session.token,
      });
      setSessions((prev) => {
        const remaining = prev.filter((item) => item.sessionId !== sessionId);
        setActiveSessionId((current) => (current === sessionId ? remaining[0]?.sessionId ?? null : current));
        return remaining;
      });
    },
    [sessions],
  );

  const activeSession = sessions.find((item) => item.sessionId === activeSessionId) ?? null;

  const value = useMemo(
    () => ({
      sessions,
      activeSession,
      setActiveSessionId,
      refreshSessions,
      createSession,
      deleteSession,
    }),
    [sessions, activeSession, setActiveSessionId, refreshSessions, createSession, deleteSession],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
};

export const useSessions = (): SessionsContextValue => {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error("useSessions must be used within SessionsProvider");
  }
  return context;
};
