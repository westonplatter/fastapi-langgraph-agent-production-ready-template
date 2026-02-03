export type BackendMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatResponse = {
  messages: BackendMessage[];
};

export type StreamResponse = {
  content: string;
  done: boolean;
};
