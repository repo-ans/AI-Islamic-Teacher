# Ilm AI — AI Islamic Teacher (MVP v1.0)

An interactive AI Islamic teacher. Students sign up for free, tell the teacher their age, language, country and level, pick a course, and then learn **one guided lesson per day**. The lessons are pre-recorded, and the AI steps in whenever the student needs it.

**Stack:** React 19 + Vite + TypeScript + Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage, Edge Functions) · OpenAI GPT-5 · ElevenLabs or Azure Speech · n8n

---

## How a class works

| Step | What happens | Where in code |
|---|---|---|
| Greeting | Teacher says salam, asks how the student is and how their day is going, then asks if they are ready | `useClassroom.ts → start()` |
| Review | If the student missed quiz questions **yesterday**, the teacher re-explains them in about 30 seconds before the new lesson | `reviewQueue()` + AI `review` |
| Lesson | Recorded segments play one by one (uploaded audio, AI voice, or browser voice) | `playSegment()` |
| Check-ins | Between segments: "Can you hear me? Is it clear? Any questions?" | `checkpoint()` |
| Raise hand | During a recording the student can raise a hand or type. The recording pauses, the AI answers with sources in the student's language, then the recording resumes | `raiseHand()`, `answerQuestion()` |
| Feedback | "How did you find it? Any questions?" | `lessonEnd()` |
| Quiz | "Ready for a quiz?", then questions one at a time (MCQ, true/false, short answer, reflection) | `askQuestion()` |
| Evaluation | "You answered 4 out of 5 correctly — good job!", with per-question feedback and areas to improve. Missed questions are saved for tomorrow's review | `grade()` + AI `evaluate_quiz` |
| Q&A | Open questions. Every answer shows clickable Quran, Hadith and book references | `ReferenceDrawer` |
| Unlock | The next lesson opens **the next calendar day** | `courseLessons()` in `progress.ts` |

The teacher adapts to each **level**: Child, Teen, Adult Muslim, New Muslim, and Exploring Islam (non-Muslim). It also uses the student's **language**. Scripted teacher lines are in English and Bangla. AI replies can be in any supported language.

---

## Quick start (demo mode — no keys needed)

```bash
npm install
npm run dev
```

Open http://localhost:5173 and create an account. With no Supabase keys, the app runs in **demo mode**:
- data is stored in your browser (localStorage)
- the teacher is an offline, rule-based fallback that answers only from the lesson notes
- every demo account is an admin, so you can explore the curriculum portal
- **Settings → Demo tools → "Simulate next day"** lets you test the daily unlock and next-day review

---

## Full setup

### 1. Supabase

1. Create a project at https://supabase.com.
2. Run the schema. Either paste `supabase/migrations/20260929000000_init.sql` into the SQL editor, or use the CLI:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Seed the starter curriculum (Aqeedah, Salah, Seerah — 9 lessons):
   ```bash
   npm run seed            # add --force to re-seed
   ```
5. Make yourself an admin (SQL editor):
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
6. **Auth → URL configuration:** set the Site URL to your app URL and add `http://localhost:5173/**` to the redirect URLs.
7. **Google login:** Auth → Providers → Google. Add the OAuth client ID and secret from Google Cloud, and set the Google redirect URI to `https://<ref>.supabase.co/auth/v1/callback`.

### 2. AI teacher (OpenAI GPT-5)

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...        # required
npx supabase secrets set OPENAI_MODEL=gpt-5           # optional (default gpt-5)
npx supabase secrets set OPENAI_REASONING_EFFORT=low  # optional (default low — keeps the class responsive)
npx supabase functions deploy ai-teacher
```

The key stays on the server. The function:
- checks the user's session
- rate-limits each user to 20 requests per minute
- logs each call to `ai_logs`
- **checks every Quran citation against a real Quran API.** A verse that doesn't exist is dropped, and verified text replaces the model's wording.
- builds sunnah.com and quran.com links itself, instead of trusting links written by the model

### 3. Voice (ElevenLabs or Azure)

```bash
# ElevenLabs
npx supabase secrets set TTS_PROVIDER=elevenlabs ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=...
# — or Azure Speech
npx supabase secrets set TTS_PROVIDER=azure AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus
npx supabase functions deploy tts
```

Then set `VITE_TTS_ENABLED=true` in `.env`.

Narration priority for each segment:
1. `audio_url` — a real recording, uploaded or pasted in the admin portal
2. The AI voice
3. The browser's built-in voice

In the admin portal, **Generate audio** narrates a saved segment once and stores the MP3 in the `lesson-audio` bucket, so students don't trigger TTS costs.

### 4. n8n — daily reminders

1. Import `n8n/daily-reminder.workflow.json`.
2. Fill in the **Config** node (Supabase URL, service-role key, app URL).
3. Add SMTP credentials to the email node.

Every day at 18:00 it emails enrolled students who haven't studied yet that day (`students_due_reminder()` RPC, callable only with the service role).

### 5. Deploy the frontend (Vercel)

Import the repo on Vercel and add the `VITE_*` env vars. `vercel.json` already rewrites all routes to the SPA. Build command: `npm run build`, output: `dist`.

---

## Project structure

```
src/
  lib/
    curriculum.ts       starter curriculum (segments, references, quizzes)
    repo/               data layer — supabase.ts (production) | local.ts (demo)
    ai.ts               client for the ai-teacher edge function (+ offline fallback)
    ai-fallback.ts      rule-based teacher for demo / outages
    progress.ts         daily unlock, streaks, weak topics, review queue
    narrator.ts         audio / TTS / browser-voice playback with pause & resume
    speech-input.ts     microphone input (Web Speech API)
    teacher-lines.ts    scripted teacher lines (English + Bangla)
  pages/
    classroom/          the interactive lesson (useClassroom.ts is the flow engine)
    DashboardPage, CoursesPage, CourseDetailPage, AskPage, RevisionPage,
    ProgressPage, AssessmentPage, AdminPage, OnboardingPage, AuthPages, SettingsPage
supabase/
  migrations/           schema, RLS policies, RPCs, storage bucket
  functions/ai-teacher  converse · answer · explain · review · evaluate_quiz · generate_lesson
  functions/tts         ElevenLabs / Azure narration (+ admin audio storage)
n8n/                    daily reminder workflow
scripts/seed.ts         seeds the curriculum into Supabase
```

## PRD feature coverage

| # | Feature | Status |
|---|---|---|
| 1 | Auth (email, Google, password reset, profile) | ✅ |
| 2 | Learning profile (child / teen / adult / new Muslim / non-Muslim + age, language, country) | ✅ |
| 3 | Structured curriculum (Aqeedah, Salah, Seerah) | ✅ AI-drafted starter content — **needs scholar review** |
| 4 | Daily lesson (objectives, lesson, examples, reflection, summary, references) | ✅ |
| 5 | AI voice teacher (speed, pause/resume, replay, skip) | ✅ |
| 6 | Explain differently (simply, like a child, analogy, example, summary, in my language) | ✅ |
| 7 | Reflection engine | ✅ reflection questions + AI feedback, saved to Progress |
| 8–9 | Quiz engine + AI evaluation | ✅ |
| 10–11 | Ask the Teacher + source transparency | ✅ verified Quran text, sunnah.com links |
| 12 | Progress dashboard | ✅ |
| 13 | AI memory (lessons, scores, reflections, questions) | ✅ stored per student |
| 14 | Weakness-based revision | ✅ next-day 30-second review + Revision page |
| 15 | Daily streak | ✅ |
| 16 | End-of-module assessment | ✅ |
| 17 | Admin curriculum portal | ✅ incl. "Draft with AI" and audio generation |

## Before going live

- **Scholar review:** the starter curriculum and every AI-drafted lesson must be checked by a qualified teacher before publishing.
- **Quiz answers** are readable by signed-in students through the API (fine for learning; move grading server-side if quizzes ever become high-stakes).
- **Hadith citations** from the AI are not verified the way Quran citations are (sunnah.com has no free public API). Links are built from structured data, and the UI tells students to read the source.
