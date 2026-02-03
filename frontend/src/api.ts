import type { ChatResponse, Message, SessionResponse, StreamResponse, TokenResponse } from "./types";

const DEFAULT_BASE_URL = "http://localhost:8000";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL;

const toFormBody = (data: Record<string, string>): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => params.set(key, value));
  return params;
};

export const registerUser = async (email: string, password: string): Promise<TokenResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as { token: TokenResponse };
  return data.token;
};

export const loginUser = async (email: string, password: string): Promise<TokenResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toFormBody({
      username: email,
      password,
      grant_type: "password",
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as TokenResponse;
};

export const createSession = async (userToken: string): Promise<SessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as SessionResponse;
};

export const listSessions = async (userToken: string): Promise<SessionResponse[]> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/sessions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as SessionResponse[];
};

export const fetchMessages = async (sessionToken: string): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chatbot/messages`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as ChatResponse;
};

export const streamChat = async (args: {
  sessionToken: string;
  messages: Message[];
  onChunk: (chunk: StreamResponse) => void;
}): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chatbot/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: args.messages }),
  });

  if (!response.ok || !response.body) {
    throw new Error(await response.text());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventBuffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line === "") {
        if (eventBuffer) {
          const payload = eventBuffer.trim();
          eventBuffer = "";
          if (payload.startsWith("data:")) {
            const data = payload
              .split("\n")
              .filter((entry) => entry.startsWith("data:"))
              .map((entry) => entry.replace(/^data:\s*/, ""))
              .join("\n");
            if (data) {
              args.onChunk(JSON.parse(data) as StreamResponse);
            }
          }
        }
        continue;
      }
      eventBuffer += `${line}\n`;
    }
  }
};
