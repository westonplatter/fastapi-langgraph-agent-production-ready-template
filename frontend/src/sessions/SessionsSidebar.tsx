import React from "react";

import { useAuth } from "../auth/AuthProvider";
import { useSessions } from "./SessionsProvider";

export const SessionsSidebar: React.FC = () => {
  const { logout } = useAuth();
  const { sessions, activeSession, setActiveSessionId, createSession, deleteSession } = useSessions();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <h2>Sessions</h2>
          <span>{sessions.length} total</span>
        </div>
        <button type="button" onClick={() => void createSession()}>
          New
        </button>
      </div>
      <div className="sidebar-list">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className={`sidebar-item ${activeSession?.sessionId === session.sessionId ? "active" : ""}`}
          >
            <button
              type="button"
              className="sidebar-item-title"
              onClick={() => setActiveSessionId(session.sessionId)}
            >
              {session.name || "Untitled session"}
            </button>
            <button
              type="button"
              className="sidebar-item-delete"
              onClick={() => void deleteSession(session.sessionId)}
            >
              Delete
            </button>
          </div>
        ))}
        {sessions.length === 0 ? <div className="sidebar-empty">No sessions yet.</div> : null}
      </div>
      <div className="sidebar-footer">
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
};
