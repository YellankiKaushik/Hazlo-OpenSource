# Hazlo - Voice-Powered Thought Organizer

## Project Overview

Hazlo is a voice-powered AI productivity and thought organization system designed to reduce mental overload, organize unstructured thoughts, capture ideas instantly, and help users execute tasks faster with less friction.

## Project Status

- **Project Type**: React + TypeScript Web Application
- **Entry Point**: `src/main.tsx`
- **Build System**: Vite 7.x
- **Styling System**: Tailwind CSS 3.4.x
- **State Management**: Zustand with persist middleware

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand (with localStorage persistence)
- **Speech-to-Text**: Web Speech API (Browser SpeechRecognition)
- **Icons**: Lucide React

## Key Features Implemented

### 1. Voice Input
- Tap microphone to start recording
- Uses Browser SpeechRecognition API
- Supports continuous speech recognition
- Real-time transcript preview

### 2. Intelligent Structuring
### Expanded Categorization System

The categorization system is designed to evolve into an intent-aware structuring engine.

Future supported categories include:
- Tasks
- Habits
- Planning
- Workflows
- Ideas
- Notes
- Journal
- Learnings
- Insights
- Project Notes
- Business Thoughts
- Reminders
- Random Thoughts

Future categorization examples:

Input:
"This should go into habits: drink water daily."

Expected Output:
- Category: Habit
- Task: Drink water daily

Input:
"This belongs to planning: finish frontend architecture this week."

Expected Output:
- Category: Planning
- Structured planning item

The system should preserve the original user meaning while intelligently structuring information.

### 3. Task Extraction
Automatically extracts actionable tasks from voice input:
- Numbered lists (1. task, 2. task)
- Bullet points (- task, * task)
- "and" separated tasks
- Imperative verbs at start

### 4. Smart Reminder Detection
Detects natural language reminders:
- "remind me at 7 PM"
- "remind me tomorrow at 9am"
- "remind me in 30 minutes"

### 5. Daily Task System
- Tasks appear daily
- Support completion toggle
- Incomplete tasks rollover to next day automatically

### 6. Structured Storage
Everything stored with:
- Date (YYYY-MM-DD)
- Time (HH:mm)
- Category
- Task status

## Directory Structure

```
src/
├── types/
│   └── index.ts           # Entry, Task, Category types
├── store/
│   └── useStore.ts        # Zustand store for state management
├── utils/
│   ├── taskExtractor.ts   # Parse tasks from raw text
│   ├── categoryDetector.ts # Detect category from content
│   ├── reminderDetector.ts # Extract reminder times
│   └── dateUtils.ts       # Date formatting and helpers
├── components/
│   ├── VoiceInput.tsx     # Microphone with SpeechRecognition
│   ├── EntryList.tsx     # Display entries grouped by date
│   ├── EntryCard.tsx     # Individual entry display
│   ├── TaskItem.tsx       # Task with completion toggle
│   ├── CategoryBadge.tsx  # Visual category indicator
│   └── Header.tsx        # App header
├── pages/
│   └── Home.tsx          # Main page
├── App.tsx                # Entry point
└── index.css             # Global styles
```

## Future Roadmap

- Notion API integration for cloud storage
- Google Docs integration
- Ollama/local AI integration for better structuring
- Multi-language support
- Calendar integrations
- WhatsApp integrations
- Notification system

## Development Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start development server
pnpm build     # Production build
pnpm preview   # Preview production build
```

## Product Philosophy

Hazlo EXISTS to:
- Empower human memory
- Reduce mental overload
- Organize thoughts
- Help users execute faster

Hazlo is NOT:
- A replacement for human thinking
- A therapist
- Emotionally manipulative
- A chat-focused AI
## Updated Product Direction

Hazlo is evolving from a lightweight voice journaling MVP into a structured voice-powered productivity and thought organization ecosystem.

The long-term system direction focuses on:
- reducing cognitive overload,
- organizing unstructured thoughts,
- extracting actionable tasks,
- structuring information automatically,
- and helping users execute faster with less manual effort.

Hazlo should behave like:
- a lightweight cognitive operating system,
- an intelligent task aggregation engine,
- and a voice-first execution assistant.

The system should remain:
- minimal,
- modular,
- scalable,
- lightweight,
- highly usable,
- and privacy-focused.

The project prioritizes:
- speed,
- simplicity,
- organization,
- low friction workflows,
- and reliable data persistence.
# Phase 2 - Reliable Cloud Storage

## Objective

Move from local-only persistence to reliable cloud-backed structured storage.

Current localStorage persistence is useful for MVP development but is not sufficient for long-term reliability.

Phase 2 focuses on:
- cloud persistence,
- sync-safe architecture,
- structured entry storage,
- and backup reliability.

---

## Planned Features

### 1. Notion API Integration

Primary cloud storage system.

Store:
- raw text,
- category,
- extracted tasks,
- reminder metadata,
- timestamps,
- task status.

The Notion integration should:
- preserve structure,
- support future searchability,
- and maintain user data organization.

---

### 2. Google Docs Integration

Secondary backup/archive layer.

Purpose:
- additional redundancy,
- long-form storage,
- manual review.

Google Docs is NOT intended to become the primary database system.

---

### 3. Hybrid Persistence Strategy

Future architecture:

- localStorage → temporary fast cache
- Notion → structured cloud storage
- Google Docs → backup/archive layer

This ensures:
- reduced data loss risk,
- fast UI performance,
- reliable synchronization.

---

## Engineering Priorities

Phase 2 should prioritize:
- storage reliability,
- sync consistency,
- modular API integration,
- and maintainable architecture.

Avoid:
- overengineering backend systems,
- complex database infrastructure,
- unnecessary abstractions.
# Phase 3 - Open Source AI Structuring Layer

## Objective

Improve information structuring and task understanding using lightweight open-source AI models.

The AI layer should remain:
- lightweight,
- efficient,
- practical,
- low-token,
- and execution-focused.

---

## AI Responsibilities

The AI should:
- remove noise from speech,
- structure unorganized thoughts,
- extract actionable tasks,
- detect reminders,
- improve categorization,
- and reduce manual organization effort.

The AI should NOT:
- become emotionally manipulative,
- act like a therapist,
- perform deep psychological analysis,
- or rewrite user intent heavily.

---

## Planned Open Source Stack

Planned technologies:
- Ollama
- Llama 3
- Mistral
- Gemma

---

## Future AI Capabilities

### 1. Better Task Extraction

Example:

Input:
"I need to redesign the dashboard and call the client tomorrow."

Expected Output:
- Redesign dashboard
- Call client tomorrow

---

### 2. Noise Reduction

Convert unstructured speech into:
- clean actionable entries,
- organized thoughts,
- structured tasks.

---

### 3. Subtask Generation

Future capability:

Input:
"Build landing page"

Expected Output:
1. Create layout
2. Build navbar
3. Add hero section
4. Add CTA section
5. Test responsiveness

Purpose:
Reduce task start friction.

---

## Important Rule

The AI exists to:
- improve execution,
- improve organization,
- and reduce cognitive overload.

The AI does NOT exist to replace human thinking.
# Phase 4 - Authentication & Google Ecosystem Integration

## Objective

Introduce authenticated cloud-connected workflows and Google ecosystem integrations.

---

## Planned Features

### 1. Google Login

Future authentication system:
- Google OAuth
- user accounts
- synced cloud sessions

Purpose:
- secure personalization,
- cloud synchronization,
- future Google integrations.

---

### 2. Google Services Integration

Future integrations may include:
- Google Calendar
- Google Drive
- Google Docs
- Google Notifications
- Google Tasks

---

## Future Workflow Example

Voice Input →
Task Extraction →
Reminder Detection →
Google Notification →
Task Reminder

---

## Important Engineering Direction

Authentication should only be introduced AFTER:
- stable storage,
- reliable synchronization,
- and modular architecture are completed.

Avoid:
- premature backend complexity,
- unnecessary authentication layers too early.
# Phase 5 - Productivity Execution Layer

## Objective

Transform Hazlo from a thought organizer into a structured execution assistance system.

---

## Planned Features

### 1. Habit System

Users should be able to:
- store recurring habits,
- track consistency,
- organize routine-based actions.

Example:
"This should go into habits."

---

### 2. Planning System

Support:
- planning entries,
- structured planning workflows,
- future execution pipelines.

---

### 3. Workflow Categorization

The system should support:
- workflow entries,
- multi-step execution systems,
- productivity structures.

---

### 4. Intelligent Execution Assistance

Future AI should:
- break large tasks into smaller steps,
- reduce execution friction,
- simplify overwhelming workflows.

---

## Productivity Philosophy

Hazlo should help users:
- start faster,
- think less about organization,
- reduce overwhelm,
- and execute consistently.

The system should focus on:
- reducing cognitive load,
- and improving actionability.
# Phase 6 - Full Hazlo Ecosystem

## Long-Term Vision

Hazlo evolves into:
- a voice-powered productivity operating system,
- a structured cognitive organization system,
- and an intelligent execution ecosystem.

---

## Ecosystem Goals

The final system should support:
- thought capture,
- task execution,
- planning,
- reminders,
- workflows,
- habits,
- structured organization,
- and intelligent productivity assistance.

---

## Long-Term Product Direction

Hazlo should become:
- lightweight,
- fast,
- scalable,
- highly usable,
- and execution-focused.

The product should continue prioritizing:
- simplicity,
- organization,
- speed,
- and low-friction interactions.

---

## Final System Philosophy

Hazlo exists to:
- reduce mental clutter,
- preserve important thoughts,
- structure unorganized information,
- and help users move from thinking → execution faster.

Created and envisioned by Kaushik.