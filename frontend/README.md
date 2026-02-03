# Frontend AI SDK (Vite)

This is a Vite + React chat UI wired to the FastAPI backend in this repo.

## Setup

1. Install deps

```bash
npm install
```

2. Configure API base URL

```bash
cp .env.example .env
```

3. Run

```bash
npm run dev
```

## Features

- Register / login against the FastAPI auth endpoints
- List and switch chat sessions
- Stream responses from `/api/v1/chatbot/chat/stream`

## Notes

- The UI expects the backend to run on `http://localhost:8000`.
- User token is stored in `localStorage` under `llm_user_token`.
