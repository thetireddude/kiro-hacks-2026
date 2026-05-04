# Implementation Plan: Voice Agent Migration

## Overview

Migrate the voice-agent feature from its standalone sub-project (`voice-agent/`) into the main New News Next.js application. This is a structural migration — no new features are added. The voice conversation experience is placed on a topic detail page (`/topic/[id]`) while preserving the existing homepage, headline-feed agent, and all current functionality.

## Tasks

- [x] 1. Migrate voice agent server logic and configuration
  - [x] 1.1 Create `lib/voice-agent/config.ts` with the `VOICE_AGENT_CONFIG` export
    - Copy from `voice-agent/lib/config.ts`
    - No import path changes needed (this file has no internal imports)
    - _Requirements: 6.3_
  - [x] 1.2 Create `lib/voice-agent/types.ts` with all voice agent type definitions
    - Copy from `voice-agent/lib/voice-agent/types.ts`
    - No import path changes needed (this file has no internal imports)
    - _Requirements: 6.1_
  - [x] 1.3 Create `lib/voice-agent/memory.ts` with the in-memory session store
    - Copy from `voice-agent/lib/voice-agent/memory.ts`
    - Update import of types from `"./types"` (should remain relative)
    - _Requirements: 6.1_
  - [x] 1.4 Create `lib/voice-agent/system-prompt.ts` with the voice agent system prompt builder
    - Copy from `voice-agent/lib/voice-agent/system-prompt.ts`
    - Update import of `Topic` type from `"./types"`
    - _Requirements: 6.1_
  - [x] 1.5 Create `lib/voice-agent/tools.ts` with all tool implementations
    - Copy from `voice-agent/lib/voice-agent/tools.ts`
    - Update import of `VOICE_AGENT_CONFIG` from `"./config"` (was `"../config"`)
    - Update import of memory functions from `"./memory"`
    - Update import of types from `"./types"` (was `"@/lib/voice-agent/types"`)
    - _Requirements: 6.1, 6.4_
  - [x] 1.6 Create `lib/voice-agent/loop.ts` with the agent loop orchestration
    - Copy from `voice-agent/lib/voice-agent/loop.ts`
    - Update import of `VOICE_AGENT_CONFIG` from `"./config"` (was `"../config"`)
    - Update imports of memory functions from `"./memory"`
    - Update imports of tool functions from `"./tools"`
    - Update import of `buildSystemPrompt` from `"./system-prompt"`
    - Update imports of types from `"./types"`
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 2. Migrate voice components
  - [x] 2.1 Create `components/voice/VoiceConversation.tsx`
    - Copy from `voice-agent/components/VoiceConversation.tsx`
    - Retain `"use client"` directive
    - Update imports to use `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/badge`
    - Update import of realtime functions from `@/lib/realtime`
    - _Requirements: 3.1, 3.2, 3.4, 11.1, 11.4_
  - [x] 2.2 Create `components/voice/DashboardPanel.tsx`
    - Copy from `voice-agent/components/topic/DashboardPanel.tsx`
    - Retain `"use client"` directive
    - Update import of `DashboardItem` from `@/lib/voice-agent/types`
    - Update imports of UI components from `@/components/ui/*`
    - Update import of `cn` from `@/lib/utils`
    - _Requirements: 3.5, 11.1, 11.2, 11.4_

- [x] 3. Migrate voice API routes
  - [x] 3.1 Create `app/api/voice-agent/start/route.ts`
    - Copy from `voice-agent/app/api/voice-agent/start/route.ts`
    - Retain `export const runtime = "nodejs"`
    - Update import of `createSession` from `@/lib/voice-agent/memory`
    - Update import of `runInitialResearch` from `@/lib/voice-agent/loop`
    - Update import of `Topic` from `@/lib/voice-agent/types`
    - _Requirements: 5.2, 11.2, 11.5_
  - [x] 3.2 Create `app/api/voice-agent/message/route.ts`
    - Copy from `voice-agent/app/api/voice-agent/message/route.ts`
    - Retain `export const runtime = "nodejs"`
    - Update import of `getSession` from `@/lib/voice-agent/memory`
    - Update import of `handleFollowUp` from `@/lib/voice-agent/loop`
    - _Requirements: 5.3, 11.2, 11.5_
  - [x] 3.3 Create `app/api/voice-agent/end/route.ts`
    - Copy from `voice-agent/app/api/voice-agent/end/route.ts`
    - Retain `export const runtime = "nodejs"`
    - Update import of `deleteSession` from `@/lib/voice-agent/memory`
    - _Requirements: 5.4, 11.2, 11.5_
  - [x] 3.4 Replace `app/api/realtime-session/route.ts` with the voice-agent version
    - Copy from `voice-agent/app/api/realtime-session/route.ts`
    - This version is a strict superset: accepts optional `topicContext` in POST body
    - Falls back to default instructions when `topicContext` is absent
    - Uses `NextRequest` for body parsing
    - _Requirements: 5.1, 5.6, 5.7_

- [x] 4. Create the topic detail page
  - [x] 4.1 Create `app/topic/[id]/page.tsx`
    - Copy from `voice-agent/app/topic/[id]/page.tsx`
    - Retain `"use client"` directive
    - Update import of `DashboardPanel` from `@/components/voice/DashboardPanel`
    - Update import of realtime functions from `@/lib/realtime`
    - Update import of voice-agent types from `@/lib/voice-agent/types`
    - Update import of `cn` from `@/lib/utils`
    - Update import of UI components (`Button`, `Card`, `CardContent`, `Badge`) from `@/components/ui/*`
    - Ensure `lucide-react` imports remain unchanged
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 11.1, 11.2, 11.3, 11.4_

- [x] 5. Update the realtime module with topicContext support
  - [x] 5.1 Replace `lib/realtime.ts` with the voice-agent version
    - Copy from `voice-agent/lib/realtime.ts`
    - The voice-agent version adds an optional `topicContext` parameter to `fetchSessionToken`
    - When called without arguments, behavior is identical to the original
    - `connectRealtime` and `disconnect` functions are identical and remain unchanged
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Merge CSS variables into globals.css
  - [x] 6.1 Add missing CSS variables required by voice components to `app/globals.css`
    - Add `--primary`, `--primary-foreground` to `:root` and dark mode blocks
    - Add `--secondary`, `--secondary-foreground` to `:root` and dark mode blocks
    - Add `--accent`, `--accent-foreground` to `:root` and dark mode blocks
    - Add `--popover`, `--popover-foreground` to `:root` and dark mode blocks
    - Add `--input` to `:root` and dark mode blocks
    - Add `--radius` to `:root`
    - Extend the `@theme inline` block with corresponding `--color-*` mappings
    - Do NOT overwrite existing variables or remove existing declarations
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 7. Checkpoint - Verify partial migration compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Merge dependencies into package.json
  - [x] 8.1 Add missing dependencies from voice-agent to main app `package.json`
    - Add `@base-ui/react` (^1.4.1)
    - Add `class-variance-authority` (^0.7.1)
    - Add `shadcn` (^4.6.0)
    - Add `tw-animate-css` (^1.4.0)
    - Do NOT remove or downgrade any existing dependencies
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 9. Fix all imports to use @/ aliases
  - [x] 9.1 Audit all migrated files for incorrect import paths
    - Verify no file references `voice-agent/` as a root path
    - Verify all component imports use `@/components/...`
    - Verify all lib imports use `@/lib/...`
    - Verify all migrated client components retain `"use client"` directive
    - Verify all migrated route handlers retain `runtime` export declarations
    - Fix any remaining bare relative paths that would only resolve in the old sub-project
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 10. Build verification
  - [x] 10.1 Run `npm install` and verify it completes without errors
    - _Requirements: 8.4, 14.1_
  - [x] 10.2 Run `npm run lint` and fix any lint errors
    - _Requirements: 14.2_
  - [x] 10.3 Run `npm run build` and fix any build errors
    - Fix any TypeScript errors, missing imports, or module resolution failures
    - Preserve the architecture defined in the requirements while fixing
    - _Requirements: 14.3, 14.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Write property-based tests for correctness properties
  - [ ]* 12.1 Set up fast-check testing framework
    - Install `fast-check` as a dev dependency
    - Install `vitest` as a dev dependency if not already present
    - Create test configuration for property-based tests
    - _Requirements: 14.3_
  - [ ]* 12.2 Write property test for import alias correctness (Property 1)
    - **Property 1: Import alias correctness**
    - **Validates: Requirements 6.4, 11.1, 11.2, 11.3**
    - For any migrated file, all import statements SHALL use `@/` aliases and none SHALL reference `voice-agent/` as a root path
    - Generate file paths from the set of migrated files, parse their import statements, verify all use `@/` aliases
    - Minimum 100 iterations
    - Tag: `Feature: voice-agent-migration, Property 1: Import alias correctness`
  - [ ]* 12.3 Write property test for client directive and runtime export preservation (Property 2)
    - **Property 2: Client directive and runtime export preservation**
    - **Validates: Requirements 11.4, 11.5**
    - For any migrated file that was originally a client component or server-side route handler, the corresponding directive or export SHALL be preserved
    - Compare presence of `"use client"` and `runtime` exports against original source files
    - Minimum 100 iterations
    - Tag: `Feature: voice-agent-migration, Property 2: Client directive and runtime export preservation`
  - [ ]* 12.4 Write property test for topic context forwarding in session token (Property 3)
    - **Property 3: Topic context forwarding in session token**
    - **Validates: Requirements 7.2, 7.3**
    - For any non-empty `topicContext` string passed to `fetchSessionToken`, the function SHALL include it in the POST request body
    - When `topicContext` is omitted or undefined, the request body SHALL not contain a `topicContext` field
    - Mock `fetch`, generate random `topicContext` strings with fast-check, verify request body
    - Minimum 100 iterations
    - Tag: `Feature: voice-agent-migration, Property 3: Topic context forwarding in session token`

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `app/page.tsx`, `app/api/agent/route.ts`, and `lib/agent/` are never modified
- The `voice-agent/` sub-project directory is left in place (removal is out of scope for this migration)
