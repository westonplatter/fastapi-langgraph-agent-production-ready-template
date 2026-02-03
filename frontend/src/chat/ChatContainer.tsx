import React, { useEffect, useState } from "react";

import { apiRequest } from "../api/client";
import { useSessions } from "../sessions/SessionsProvider";
import { ChatRuntimeProvider } from "./ChatRuntimeProvider";
import type { BackendMessage, ChatResponse } from "./types";
import { ThreadView } from "../ui/ThreadView";

export const ChatContainer: React.FC = () => {
  const { activeSession } = useSessions();
  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeSession) {
        setMessages([]);
        return;
      }
      setStatus("loading");
      try {
        const data = await apiRequest<ChatResponse>("/api/v1/chatbot/messages", {
          token: activeSession.token,
        });
        setMessages(data.messages ?? []);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    };

    void fetchMessages();
  }, [activeSession]);

  if (!activeSession) {
    return (
      <div className="chat-empty">
        <h2>No session selected</h2>
        <p>Create or pick a session from the sidebar to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <h2>{activeSession.name || "Untitled session"}</h2>
          <span>Session ID: {activeSession.sessionId}</span>
        </div>
        {status === "loading" ? <span className="chat-status">Loading history...</span> : null}
        {status === "error" ? <span className="chat-status error">Failed to load history.</span> : null}
      </div>
      <ChatRuntimeProvider
        key={activeSession.sessionId}
        sessionId={activeSession.sessionId}
        sessionToken={activeSession.token}
        initialMessages={messages}
      >
        <ThreadView />
      </ChatRuntimeProvider>
    </div>
  );
};
