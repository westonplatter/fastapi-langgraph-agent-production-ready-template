export type Role = "user" | "assistant" | "system";

export type Message = {
  role: Role;
  content: string;
};

export type Token = {
  access_token: string;
  token_type: string;
  expires_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
};

export type SessionResponse = {
  session_id: string;
  name: string;
  token: Token;
};

export type ChatResponse = {
  messages: Message[];
};

export type StreamResponse = {
  content: string;
  done: boolean;
};
