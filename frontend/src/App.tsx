import React from "react";

import { AuthForm } from "./auth/AuthForm";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { ChatContainer } from "./chat/ChatContainer";
import { SessionsProvider } from "./sessions/SessionsProvider";
import { SessionsSidebar } from "./sessions/SessionsSidebar";

const AuthenticatedApp: React.FC = () => (
  <SessionsProvider>
    <div className="app-shell">
      <SessionsSidebar />
      <ChatContainer />
    </div>
  </SessionsProvider>
);

const AppContent: React.FC = () => {
  const { token } = useAuth();
  if (!token) {
    return <AuthForm />;
  }
  return <AuthenticatedApp />;
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);
