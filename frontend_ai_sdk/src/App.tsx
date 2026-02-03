import { useEffect, useMemo, useRef, useState } from "react";
import "@ai-sdk/react";
import {
  API_BASE_URL,
  createSession,
  fetchMessages,
  listSessions,
  loginUser,
  registerUser,
  streamChat,
} from "./api";
import type { Message, SessionResponse } from "./types";

const USER_TOKEN_KEY = "llm_user_token";

const defaultMessage: Message = {
  role: "assistant",
  content: "Hello! Sign in and pick a session to start chatting.",
};

const formatSessionLabel = (session: SessionResponse): string => {
  if (session.name && session.name.trim().length > 0) {
    return session.name;
  }
  return session.session_id.slice(0, 8);
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
};

const App = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const assistantIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(USER_TOKEN_KEY);
    if (storedToken) {
      setUserToken(storedToken);
    }
  }, []);

  const activeSession = useMemo(() => {
    return sessions.find((session) => session.session_id === activeSessionId) ?? null;
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (!userToken) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    const loadSessions = async () => {
      try {
        const data = await listSessions(userToken);
        setSessions(data);

        if (data.length > 0) {
          setActiveSessionId((current) => current ?? data[0].session_id);
        } else {
          const newSession = await createSession(userToken);
          setSessions([newSession]);
          setActiveSessionId(newSession.session_id);
        }
      } catch (error) {
        setAuthError(formatError(error));
      }
    };

    loadSessions();
  }, [userToken]);

  useEffect(() => {
    if (!activeSession) {
      setMessages([defaultMessage]);
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await fetchMessages(activeSession.token.access_token);
        if (response.messages.length > 0) {
          setMessages(response.messages);
        } else {
          setMessages([defaultMessage]);
        }
      } catch (error) {
        setChatError(formatError(error));
      }
    };

    loadMessages();
  }, [activeSession]);

  const handleAuthSuccess = (token: string) => {
    window.localStorage.setItem(USER_TOKEN_KEY, token);
    setUserToken(token);
    setAuthError(null);
  };

  const handleRegister = async () => {
    setAuthError(null);
    try {
      const token = await registerUser(email, password);
      handleAuthSuccess(token.access_token);
    } catch (error) {
      setAuthError(formatError(error));
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    try {
      const token = await loginUser(email, password);
      handleAuthSuccess(token.access_token);
    } catch (error) {
      setAuthError(formatError(error));
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(USER_TOKEN_KEY);
    setUserToken(null);
    setEmail("");
    setPassword("");
    setSessions([]);
    setActiveSessionId(null);
    setMessages([defaultMessage]);
  };

  const handleCreateSession = async () => {
    if (!userToken) {
      return;
    }

    setChatError(null);
    try {
      const newSession = await createSession(userToken);
      setSessions((current) => [newSession, ...current]);
      setActiveSessionId(newSession.session_id);
    } catch (error) {
      setChatError(formatError(error));
    }
  };

  const handleSend = async () => {
    if (!activeSession || !input.trim() || isStreaming) {
      return;
    }

    const nextMessages = [...messages, { role: "user", content: input.trim() }];
    setInput("");
    setIsStreaming(true);
    setChatError(null);

    const assistantIndex = nextMessages.length;
    assistantIndexRef.current = assistantIndex;
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    try {
      await streamChat({
        sessionToken: activeSession.token.access_token,
        messages: nextMessages,
        onChunk: (chunk) => {
          if (chunk.done) {
            return;
          }
          setMessages((current) => {
            const updated = [...current];
            const index = assistantIndexRef.current ?? updated.length - 1;
            if (!updated[index]) {
              updated.push({ role: "assistant", content: chunk.content });
              return updated;
            }
            updated[index] = {
              ...updated[index],
              content: `${updated[index].content}${chunk.content}`,
            };
            return updated;
          });
        },
      });
    } catch (error) {
      setChatError(formatError(error));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <h1>LLM Chat</h1>
            <p className="subtitle">FastAPI + LangGraph</p>
          </div>
          {userToken && (
            <button className="ghost" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>

        {!userToken ? (
          <div className="auth-panel">
            <h2>Sign in</h2>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div className="auth-actions">
              <button onClick={handleLogin}>Login</button>
              <button className="ghost" onClick={handleRegister}>
                Register
              </button>
            </div>
            {authError && <p className="error">{authError}</p>}
            <p className="hint">Backend: {API_BASE_URL}</p>
          </div>
        ) : (
          <div className="session-panel">
            <div className="session-header">
              <h2>Sessions</h2>
              <button className="ghost" onClick={handleCreateSession}>
                New
              </button>
            </div>
            <div className="session-list">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  className={session.session_id === activeSessionId ? "session active" : "session"}
                  onClick={() => setActiveSessionId(session.session_id)}
                >
                  <span>{formatSessionLabel(session)}</span>
                  <small>{session.session_id.slice(0, 6)}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="chat">
        <div className="chat-header">
          <div>
            <h2>{activeSession ? "Chat" : "Welcome"}</h2>
            <p className="subtitle">
              {activeSession ? `Session ${activeSession.session_id}` : "Sign in to start a session"}
            </p>
          </div>
        </div>

        <div className="messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
              <div className="bubble">
                <span className="role">{message.role}</span>
                <p>{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="composer">
          <textarea
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={activeSession ? "Send a message" : "Log in to chat"}
            disabled={!activeSession || isStreaming}
          />
          <button onClick={handleSend} disabled={!activeSession || isStreaming || !input.trim()}>
            {isStreaming ? "Thinking..." : "Send"}
          </button>
        </div>
        {chatError && <p className="error chat-error">{chatError}</p>}
      </main>
    </div>
  );
};

export default App;
