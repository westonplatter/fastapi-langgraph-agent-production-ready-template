import React from "react";

import {
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

const UserMessage: React.FC = () => (
  <MessagePrimitive.Root className="message user">
    <div className="message-label">You</div>
    <MessagePrimitive.Parts className="message-content" />
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="message-error">
        <ErrorPrimitive.Message />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  </MessagePrimitive.Root>
);

const AssistantMessage: React.FC = () => (
  <MessagePrimitive.Root className="message assistant">
    <div className="message-label">Assistant</div>
    <MessagePrimitive.Parts className="message-content" />
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="message-error">
        <ErrorPrimitive.Message />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  </MessagePrimitive.Root>
);

export const ThreadView: React.FC = () => (
  <div className="thread">
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport className="thread-viewport">
        <ThreadPrimitive.Empty>
          <div className="thread-empty">
            <h3>Ask a question</h3>
            <p>The assistant will reply here. Start with a diagnostic request or question.</p>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="composer">
        <ComposerPrimitive.Input
          className="composer-input"
          placeholder="Ask the assistant about diagnostics..."
        />
        <ComposerPrimitive.Send className="composer-send">Send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  </div>
);
