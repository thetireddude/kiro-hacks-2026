# Requirements Document

## Introduction

This document defines the requirements for migrating the voice-agent feature from its standalone sub-project (`voice-agent/`) into the main New News Next.js application. The migration places the voice conversation experience on a topic detail page (`/topic/[id]`) while preserving the existing homepage, headline-feed agent, and all current functionality. This is a structural migration only — no new features, topic-card navigation, or sessionStorage lookup are in scope.

## Glossary

- **Main_App**: The primary New News Next.js application rooted at the workspace root, containing the homepage feed and headline-feed agent.
- **Voice_Agent_Sub_Project**: The standalone Next.js project located in the `voice-agent/` directory that contains the working voice conversation feature.
- **Homepage**: The existing `app/page.tsx` route in Main_App that renders the vertical swipeable news feed with Plasma background, GlitchTitle, and NewsFeed components.
- **Headline_Feed_Agent**: The existing agent system in Main_App (`lib/agent/`, `app/api/agent/route.ts`) that discovers and clusters news topics.
- **Voice_Conversation_Component**: The `VoiceConversation.tsx` React client component that manages WebRTC voice connections, microphone access, transcript display, and audio playback.
- **Topic_Detail_Page**: The route at `voice-agent/app/topic/[id]/page.tsx` that renders the voice conversation experience for a specific topic.
- **Voice_API_Routes**: The set of API routes that support the voice agent backend: `voice-agent/app/api/realtime-session/route.ts`, `voice-agent/app/api/voice-agent/start/route.ts`, `app/api/voice-agent/message/route.ts`, `voice-agent/app/api/voice-agent/end/route.ts`.
- **Voice_Agent_Library**: The server-side voice agent logic located in `lib/voice-agent/` (or `lib/voice/`), including the agent loop, memory, tools, types, system prompt, and configuration.
- **Realtime_Module**: The client-side WebRTC helper module (`voice-agent/lib/realtime.ts`) that provides `fetchSessionToken`, `connectRealtime`, and `disconnect` functions.
- **Dashboard_Panel_Component**: The `DashboardPanel.tsx` React client component that renders source cards in the topic detail page.

## Requirements

### Requirement 1: Preserve Main App Homepage

**User Story:** As a user, I want the existing New News homepage to remain unchanged after migration, so that the headline feed experience continues to work as before.

#### Acceptance Criteria

1. THE Main_App SHALL serve the Homepage at the root route (`/`) with the existing NewsFeed, GlitchTitle, Plasma background, and navigation bar.
2. WHEN the migration is complete, THE Homepage SHALL render identically to its pre-migration state.
3. THE Main_App SHALL NOT overwrite, replace, or modify `app/page.tsx` during migration.
4. THE Main_App SHALL NOT overwrite or replace `app/layout.tsx` during migration, except to merge required providers or imports from Voice_Agent_Sub_Project.

### Requirement 2: Preserve Headline Feed Agent

**User Story:** As a user, I want the headline-feed agent to continue functioning after migration, so that I can still discover news topics.

#### Acceptance Criteria

1. THE Main_App SHALL preserve `app/api/agent/route.ts` without modification.
2. THE Main_App SHALL preserve all files in `lib/agent/` without modification.
3. WHEN a POST request is sent to `/api/agent`, THE Headline_Feed_Agent SHALL respond with the same behavior as before migration.
4. THE migration SHALL NOT introduce any import conflicts between `lib/agent/` and Voice_Agent_Library.

### Requirement 3: Migrate Voice Conversation Component

**User Story:** As a developer, I want the VoiceConversation component moved into the main app under a dedicated `components/voice/` directory, so that voice UI code is cleanly organized.

#### Acceptance Criteria

1. THE Main_App SHALL contain Voice_Conversation_Component at `components/voice/VoiceConversation.tsx`.
2. THE Voice_Conversation_Component SHALL remain a client component (using the `"use client"` directive) because it accesses browser APIs including microphone, audio playback, and WebRTC.
3. THE Voice_Conversation_Component SHALL accept an optional `topicId` prop of type `string` without breaking its existing behavior when the prop is omitted.
4. WHEN child components are required by Voice_Conversation_Component, THE Main_App SHALL place them under `components/voice/`.
5. THE Main_App SHALL place Dashboard_Panel_Component at `components/voice/DashboardPanel.tsx` (or `components/topic/DashboardPanel.tsx`).

### Requirement 4: Create Topic Detail Page

**User Story:** As a user, I want to access a voice conversation experience at `/topic/[id]`, so that I can have a voice-guided exploration of a specific news topic.

#### Acceptance Criteria

1. THE Main_App SHALL serve Topic_Detail_Page at the route `app/topic/[id]/page.tsx`.
2. WHEN a user navigates to `/topic/[id]`, THE Topic_Detail_Page SHALL read the `id` parameter from the route.
3. THE Topic_Detail_Page SHALL display a heading indicating the voice conversation context.
4. THE Topic_Detail_Page SHALL display the topic `id` from the route parameter.
5. THE Topic_Detail_Page SHALL render the voice conversation UI using the migrated topic page from Voice_Agent_Sub_Project.
6. THE Topic_Detail_Page SHALL remain a client component because it manages WebRTC connections, microphone access, and real-time audio state.

### Requirement 5: Migrate Voice API Routes

**User Story:** As a developer, I want the voice agent API routes migrated into the main app, so that the voice backend is served from the same Next.js application.

#### Acceptance Criteria

1. THE Main_App SHALL serve a realtime session endpoint at `app/api/realtime-session/route.ts` that accepts optional `topicContext` in the request body for topic-aware voice instructions.
2. THE Main_App SHALL serve a voice agent start endpoint at `app/api/voice-agent/start/route.ts`.
3. THE Main_App SHALL serve a voice agent message endpoint at `app/api/voice-agent/message/route.ts`.
4. THE Main_App SHALL serve a voice agent end endpoint at `app/api/voice-agent/end/route.ts`.
5. THE Voice_API_Routes SHALL NOT conflict with the existing `app/api/agent/route.ts` endpoint.
6. WHEN the realtime session endpoint receives a POST request with `topicContext`, THE endpoint SHALL use the provided context as voice instructions for the OpenAI Realtime API session.
7. WHEN the realtime session endpoint receives a POST request without `topicContext`, THE endpoint SHALL use default conversational instructions.

### Requirement 6: Migrate Voice Agent Server Logic

**User Story:** As a developer, I want the voice agent server-side logic placed in `lib/voice-agent/` (or `lib/voice/`), so that it is cleanly separated from the headline-feed agent logic.

#### Acceptance Criteria

1. THE Main_App SHALL contain Voice_Agent_Library files in `lib/voice-agent/` (or `lib/voice/`), including: `loop.ts`, `memory.ts`, `system-prompt.ts`, `tools.ts`, `types.ts`.
2. THE Voice_Agent_Library SHALL NOT be placed in or mixed with `lib/agent/`, because `lib/agent/` belongs to the Headline_Feed_Agent.
3. THE Main_App SHALL contain the voice agent configuration in `lib/voice-agent/config.ts` (or within the existing `lib/config.ts` as a separate export).
4. THE Voice_Agent_Library SHALL use the `@/lib/voice-agent/` import alias for internal references.

### Requirement 7: Update Realtime Module

**User Story:** As a developer, I want the shared realtime WebRTC module to support topic-aware session creation, so that the topic detail page can pass context to the voice model.

#### Acceptance Criteria

1. THE Realtime_Module at `lib/realtime.ts` SHALL export a `fetchSessionToken` function that accepts an optional `topicContext` string parameter.
2. WHEN `topicContext` is provided, THE `fetchSessionToken` function SHALL include it in the POST request body to `/api/realtime-session`.
3. WHEN `topicContext` is omitted, THE `fetchSessionToken` function SHALL send an empty or minimal request body.
4. THE Realtime_Module SHALL continue to export `connectRealtime` and `disconnect` functions with their existing signatures.

### Requirement 8: Merge Dependencies

**User Story:** As a developer, I want only the missing dependencies from the voice-agent sub-project added to the main app, so that both features can run from a single `package.json`.

#### Acceptance Criteria

1. THE Main_App `package.json` SHALL retain all existing dependencies without downgrading versions.
2. WHEN Voice_Agent_Sub_Project requires dependencies not present in Main_App, THE migration SHALL add only those missing dependencies to Main_App `package.json`.
3. THE migration SHALL NOT remove any dependencies used by the Homepage or Headline_Feed_Agent.
4. AFTER dependency merging, THE Main_App SHALL pass `npm install` without errors.

### Requirement 9: Merge Styles

**User Story:** As a developer, I want the voice-agent styles merged into the main app's `globals.css`, so that voice components render correctly without breaking existing styles.

#### Acceptance Criteria

1. THE Main_App SHALL NOT overwrite `app/globals.css` with the Voice_Agent_Sub_Project version.
2. WHEN Voice_Agent_Sub_Project `globals.css` contains CSS variables or theme tokens required by voice components that are missing from Main_App `globals.css`, THE migration SHALL add only those missing declarations.
3. THE Main_App `globals.css` SHALL preserve all existing custom font declarations, animation keyframes, and theme variables.

### Requirement 10: Merge Layout Carefully

**User Story:** As a developer, I want the main app layout to incorporate any required providers or imports from the voice-agent layout without changing the visual shell.

#### Acceptance Criteria

1. THE Main_App SHALL NOT replace `app/layout.tsx` with the Voice_Agent_Sub_Project layout.
2. WHEN Voice_Agent_Sub_Project `app/layout.tsx` contains providers, fonts, or metadata required by voice components, THE migration SHALL merge only those necessary pieces into the existing Main_App layout.
3. THE Main_App layout SHALL preserve the existing Playfair Display font configuration and Chomsky custom font.

### Requirement 11: Fix Imports After Migration

**User Story:** As a developer, I want all imports updated to use the main app's alias style after files are moved, so that the project compiles without errors.

#### Acceptance Criteria

1. THE migrated files SHALL use the `@/components/...` alias for component imports.
2. THE migrated files SHALL use the `@/lib/...` alias for library imports.
3. THE migrated files SHALL NOT contain imports that assume `voice-agent/` is the root application.
4. THE migrated client components SHALL retain the `"use client"` directive.
5. THE migrated server-side route handlers SHALL retain their `runtime` export declarations where present.

### Requirement 12: Voice Agent Isolation

**User Story:** As a user, I want the voice agent to only activate on the topic detail page, so that it does not interfere with the homepage or other parts of the app.

#### Acceptance Criteria

1. THE Voice_Conversation_Component SHALL only request microphone access when rendered on Topic_Detail_Page.
2. THE Voice_Conversation_Component SHALL NOT start microphone access globally or from `app/layout.tsx`.
3. THE Voice_Conversation_Component SHALL NOT affect the Homepage rendering or behavior.
4. THE Voice_Conversation_Component SHALL NOT affect the Headline_Feed_Agent behavior.
5. WHEN a user navigates away from Topic_Detail_Page, THE Voice_Conversation_Component SHALL stop all WebRTC connections and release the microphone.

### Requirement 13: Environment Variables

**User Story:** As a developer, I want all required environment variables documented, so that the voice feature can be configured correctly.

#### Acceptance Criteria

1. THE Main_App SHALL require `OPENAI_API_KEY` for both the Headline_Feed_Agent and Voice_API_Routes.
2. THE Main_App SHALL require `TAVILY_API_KEY` for both the Headline_Feed_Agent and Voice_Agent_Library search functionality.
3. WHEN new environment variables are required by the voice feature beyond `OPENAI_API_KEY` and `TAVILY_API_KEY`, THE migration SHALL document them in the README or `.env.example`.
4. THE migration SHALL NOT remove or modify any existing environment variable usage.

### Requirement 14: Build Verification

**User Story:** As a developer, I want the migrated app to pass lint and build checks, so that the migration does not introduce regressions.

#### Acceptance Criteria

1. AFTER migration, THE Main_App SHALL pass `npm install` without errors.
2. AFTER migration, THE Main_App SHALL pass `npm run lint` without errors.
3. AFTER migration, THE Main_App SHALL pass `npm run build` without errors.
4. IF lint or build errors are found, THE migration SHALL fix them while preserving the architecture defined in these requirements.

### Requirement 15: Final File Structure

**User Story:** As a developer, I want the migrated project to follow a clean, predictable file structure, so that the codebase remains maintainable.

#### Acceptance Criteria

1. THE Main_App SHALL contain the following route structure after migration:
   - `app/page.tsx` (existing Homepage)
   - `app/layout.tsx` (existing layout, possibly with merged imports)
   - `app/globals.css` (existing styles, possibly with merged voice styles)
   - `app/topic/[id]/page.tsx` (new Topic_Detail_Page)
   - `app/api/agent/route.ts` (existing Headline_Feed_Agent endpoint)
   - `app/api/realtime-session/route.ts` (migrated, with topic context support)
   - `app/api/voice-agent/start/route.ts` (migrated)
   - `app/api/voice-agent/message/route.ts` (migrated)
   - `app/api/voice-agent/end/route.ts` (migrated)
2. THE Main_App SHALL contain voice components under `components/voice/`.
3. THE Main_App SHALL contain voice agent server logic under `lib/voice-agent/` (or `lib/voice/`).
4. THE Main_App SHALL NOT contain a second Next.js application configuration.
