import React, { useCallback, useEffect, useState } from "react";

import {
  AppendMessage,
  AssistantRuntimeProvider,
  ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";

import { apiBaseUrl } from "../api/client";
import type { BackendMessage, ChatResponse, StreamResponse } from "./types";

const toThreadMessage = (message: BackendMessage): ThreadMessageLike => ({
  role: message.role,
  content: [{ type: "text", text: message.content }],
});

const toBackendMessages = (messages: BackendMessage[]): BackendMessage[] =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

const parseSse = async function* (response: Response): AsyncGenerator<StreamResponse, void, void> {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) {
        continue;
      }
      const payload = line.replace(/^data:\s*/, "");
      if (!payload) {
        continue;
      }
      try {
        const data = JSON.parse(payload) as StreamResponse;
        yield data;
        if (data.done) {
          return;
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
};

type ChatRuntimeProviderProps = {
  sessionId: string;
  sessionToken: string;
  initialMessages: BackendMessage[];
  children: React.ReactNode;
};

export const ChatRuntimeProvider: React.FC<ChatRuntimeProviderProps> = ({
  sessionId,
  sessionToken,
  initialMessages,
  children,
}) => {
  const [messages, setMessages] = useState<BackendMessage[]>(initialMessages);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setMessages(initialMessages);
    setIsRunning(false);
  }, [initialMessages, sessionId]);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const textContent = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      if (!textContent.trim()) {
        return;
      }

      const nextMessages: BackendMessage[] = [...messages, { role: "user", content: textContent }];
      setMessages(nextMessages);
      setIsRunning(true);

      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/chatbot/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ messages: toBackendMessages(nextMessages) }),
        });

        if (!response.ok) {
          throw new Error(`Chat request failed with status ${response.status}`);
        }

        let assistantText = "";
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        for await (const chunk of parseSse(response)) {
          if (chunk.content) {
            assistantText += chunk.content;
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
                updated[lastIndex] = { role: "assistant", content: assistantText };
              }
              return updated;
            });
          }
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, the assistant encountered an error." },
        ]);
      } finally {
        setIsRunning(false);
      }
    },
    [messages, sessionToken],
  );

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    setMessages,
    onNew,
    convertMessage: toThreadMessage,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div data-session-id={sessionId}>{children}</div>
    </AssistantRuntimeProvider>
  );
};
