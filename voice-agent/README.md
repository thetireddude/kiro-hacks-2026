# Voice AI — Conversational Voice Agent

A Next.js web app for continuous, hands-free voice conversations with an AI assistant powered by the OpenAI Realtime API.

## How it works

1. Click **Start Conversation**
2. Speak naturally — the mic stays open
3. The AI listens, detects when you stop speaking (server-side VAD), and responds by voice
4. A live transcript shows both sides of the conversation
5. Click **End Conversation** when you're done

No repeated button presses. The conversation flows naturally.

## Tech stack

- **Next.js 15** (App Router)
- **React 19** + TypeScript
- **Tailwind CSS v4** + shadcn/ui
- **OpenAI Realtime API** via WebRTC
- Server-side voice activity detection (VAD)

## Getting started

### Prerequisites

- Node.js 18+
- An OpenAI API key with Realtime API access

### Setup

```bash
# Install dependencies
npm install

# Copy the env file and add your API key
cp .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Start Conversation**.

## Project structure

```
app/
  page.tsx                        # Homepage
  api/realtime-session/route.ts   # Ephemeral token endpoint
components/
  VoiceConversation.tsx           # Main voice conversation UI
lib/
  realtime.ts                     # WebRTC + Realtime API helpers
```

## Architecture

- The **backend API route** (`/api/realtime-session`) creates an ephemeral session token using your `OPENAI_API_KEY`. The key never reaches the browser.
- The **frontend** uses that token to establish a WebRTC connection directly with OpenAI's Realtime API.
- **Server-side VAD** detects speech start/stop — no client-side processing needed.
- Audio streams both ways over WebRTC. Transcript events arrive over a data channel.

## Conversation states

| State                | Description                        |
| -------------------- | ---------------------------------- |
| `idle`               | Ready to start                     |
| `connecting`         | Fetching token + establishing WebRTC |
| `listening`          | Mic open, waiting for speech       |
| `user_speaking`      | User is talking                    |
| `assistant_speaking` | AI is responding                   |
| `error`              | Something went wrong               |

## Environment variables

| Variable         | Required | Description          |
| ---------------- | -------- | -------------------- |
| `OPENAI_API_KEY` | Yes      | Your OpenAI API key  |

## Browser requirements

- A modern browser with WebRTC support (Chrome, Edge, Firefox, Safari 16+)
- Microphone permission
