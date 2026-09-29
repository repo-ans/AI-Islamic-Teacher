/**
 * ai-teacher — every AI interaction of the platform (OpenAI stays server-side).
 *
 * POST { action, learner, ... }  with the user's Supabase JWT.
 *   converse         interpret a reply during the guided lesson (answers questions too)
 *   answer           "Ask the Teacher" Q&A with verified references
 *   explain          explain differently (simple / child / analogy / example / summary / translate)
 *   review           ~30-second re-explanation of yesterday's missed questions
 *   evaluate_quiz    grade short answers, feedback on reflections, overall summary
 *   generate_lesson  (admin) draft a lesson: segments, references, quiz
 */
import { adminClient, corsHeaders, HttpError, isAdmin, json, requireUser } from '../_shared/http.ts'
import { chatJSON, MODEL } from '../_shared/openai.ts'
import { languageName, persona, REFERENCE_FORMAT, SOURCE_RULES, type Learner } from '../_shared/persona.ts'
import { normalizeRefs } from '../_shared/refs.ts'

interface LessonCtx {
  title?: string
  objectives?: string[]
  segment?: string
  references?: Array<{ citation: string; text: string }>
}
interface Turn {
  role: 'teacher' | 'student'
  text: string
}

const RATE_LIMIT_PER_MINUTE = 20

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '')

function lessonBlock(l?: LessonCtx) {
  if (!l?.title) return ''
  return `CURRENT LESSON: ${clip(l.title, 200)}
Objectives: ${(l.objectives ?? []).slice(0, 6).map((o) => clip(o, 200)).join('; ')}
${l.segment ? `Part being taught now: """${clip(l.segment, 2000)}"""` : ''}
Lesson sources (prefer these when relevant): ${(l.references ?? []).slice(0, 8).map((r) => clip(r.citation, 100)).join('; ')}`
}

function historyBlock(h?: Turn[]) {
  if (!h?.length) return ''
  return `RECENT CONVERSATION:\n${h
    .slice(-8)
    .map((t) => `${t.role === 'teacher' ? 'Teacher' : 'Student'}: ${clip(t.text, 600)}`)
    .join('\n')}`
}

const STAGE_GUIDE: Record<string, string> = {
  greeting:
    "You greeted the student with salam and asked how they are, how their day is going, and whether they are ready to start class. intent: 'affirm' = positive / ready, 'decline' = not ready now, 'question' = they asked something, 'other' = anything else. reply: respond warmly in 1–2 sentences to what they shared (make a short du'a if they are having a hard day). Do NOT ask whether they are ready — the app does that.",
  checkpoint:
    "The recorded lesson is paused. You asked whether they can hear clearly, understand, or have questions. intent: 'affirm' = fine / continue (also 'no questions'), 'confused' = they did not understand, 'question' = they asked something (answer it fully in reply, with references), 'decline'/'other' otherwise. For affirm/decline/other keep reply to one short sentence or an empty string.",
  review:
    "You just re-explained a quiz question they missed yesterday and asked whether it is clear now. intent: 'affirm' = clear, 'confused' = still unclear, 'question' = a question (answer it).",
  feedback:
    "The lesson just ended. You asked how they found it and whether they have questions. If they shared feedback, thank them in one sentence (intent 'other' or 'affirm'). If they said they have no questions, intent 'decline'. If they asked a question, intent 'question' and answer it with references.",
  pre_quiz:
    "You asked whether they are ready for a short quiz. intent 'affirm' = ready, 'decline' = wants to wait, 'question' = asked something (answer it). Keep other replies short.",
  open_qa: "Open Q&A after the quiz. Treat questions as 'question' and answer them with references.",
}

const EXPLAIN_MODE: Record<string, (lang: string) => string> = {
  simple: () => 'Explain this again more simply, with fewer and easier words.',
  child: () => 'Explain this the way you would to a 7-year-old, with a tiny story or everyday example.',
  analogy: () => 'Explain this using one clear, memorable analogy.',
  example: () => 'Give one or two concrete real-life examples that illustrate this.',
  summary: () => 'Summarise this in 2–3 short bullet points (use "• ").',
  translate: (lang) => `Explain this faithfully and naturally in ${lang} — not word-for-word, but complete and clear.`,
}

async function handle(action: string, body: Record<string, unknown>, ctx: { isAdmin: boolean }) {
  const learner = (body.learner ?? {}) as Learner
  const lang = languageName(learner.language)
  const lesson = body.lesson as LessonCtx | undefined
  const history = body.history as Turn[] | undefined

  switch (action) {
    case 'converse': {
      const stage = String(body.stage ?? 'checkpoint')
      const out = await chatJSON<{ intent?: string; reply?: string; references?: unknown }>(
        persona(learner),
        `${lessonBlock(lesson)}
${historyBlock(history)}

STAGE: ${STAGE_GUIDE[stage] ?? STAGE_GUIDE.checkpoint}

Student's latest message: """${clip(body.message, 1500)}"""

Return JSON: {"intent":"affirm|decline|confused|question|other","reply":"...","references":[...]}
${REFERENCE_FORMAT}`,
      )
      const intent = ['affirm', 'decline', 'confused', 'question', 'other'].includes(out.intent ?? '') ? out.intent : 'other'
      return { intent, reply: clip(out.reply, 4000), references: intent === 'question' ? await normalizeRefs(out.references) : [] }
    }

    case 'answer': {
      const out = await chatJSON<{ answer?: string; references?: unknown }>(
        persona(learner),
        `${lessonBlock(lesson)}
${historyBlock(history)}

The student asks: """${clip(body.question, 2000)}"""

Answer as their teacher, adapted to their level, in ${lang}. If the question is outside Islamic learning, kindly redirect.
Return JSON: {"answer":"...","references":[...]}
${REFERENCE_FORMAT}`,
      )
      return { answer: clip(out.answer, 6000), references: await normalizeRefs(out.references) }
    }

    case 'explain': {
      const mode = EXPLAIN_MODE[String(body.mode)] ?? EXPLAIN_MODE.simple
      const out = await chatJSON<{ explanation?: string }>(
        persona(learner),
        `${lessonBlock(lesson)}

${mode(lang)}
Text to explain: """${clip(body.text, 3000)}"""

Return JSON: {"explanation":"..."}`,
      )
      return { explanation: clip(out.explanation, 4000) }
    }

    case 'review': {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 3) as Array<Record<string, string>>
      const out = await chatJSON<{ script?: string }>(
        persona(learner),
        `Yesterday the student got these quiz questions wrong:
${items.map((i, n) => `${n + 1}. Q: ${clip(i.prompt, 300)} | Correct answer: ${clip(i.correct_answer, 300)} | Note: ${clip(i.explanation, 300)}`).join('\n')}

Write a friendly spoken re-explanation lasting about 30 seconds (60–80 words; up to 120 for several questions). Start with the key idea, state the correct answer clearly, and end with a short memory tip. Do not greet — the lesson has already started.
Return JSON: {"script":"..."}`,
      )
      return { script: clip(out.script, 2000) }
    }

    case 'evaluate_quiz': {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 20) as Array<Record<string, unknown>>
      const out = await chatJSON<{
        results?: Array<{ index: number; correct: boolean | null; feedback: string }>
        summary?: string
        improvement_areas?: string[]
        recommendations?: string[]
      }>(
        persona(learner),
        `${lessonBlock(lesson)}

Evaluate this quiz. Items:
${JSON.stringify(items.map((i) => ({ index: i.index, type: i.type, prompt: clip(i.prompt, 400), correct_answer: clip(i.correct_answer, 400), student_answer: clip(i.student_answer, 1500), topic: i.topic, auto_correct: i.auto_correct ?? null })))}

Rules:
- If auto_correct is true/false, keep exactly that correctness and write feedback consistent with it.
- short_answer: judge the meaning, not wording, spelling or language — accept answers in any language that express the right idea.
- reflection: correct = null; give warm, specific feedback linking their reflection to the lesson.
- Each feedback: at most 2 sentences, in ${lang}. When wrong, state the correct answer kindly.
- summary: 1–2 encouraging sentences in ${lang}. improvement_areas: topics to review (from item topics), empty if none. recommendations: 0–3 short actionable tips in ${lang}.
Return JSON: {"results":[{"index":0,"correct":true,"feedback":"..."}],"summary":"...","improvement_areas":[],"recommendations":[]}`,
      )
      const results = items.map((i) => {
        const r = out.results?.find((x) => x.index === i.index)
        const correct = i.type === 'reflection' ? null : typeof i.auto_correct === 'boolean' ? i.auto_correct : Boolean(r?.correct)
        return { index: i.index, correct, feedback: clip(r?.feedback, 600) }
      })
      return {
        results,
        summary: clip(out.summary, 600),
        improvement_areas: (out.improvement_areas ?? []).slice(0, 5).map((s) => clip(s, 80)),
        recommendations: (out.recommendations ?? []).slice(0, 3).map((s) => clip(s, 200)),
      }
    }

    case 'generate_lesson': {
      if (!ctx.isAdmin) throw new HttpError(403, 'Only admins can generate lessons')
      const level = String(body.level ?? 'adult')
      const out = await chatJSON<{
        lesson?: { title?: string; description?: string; objectives?: string[]; est_minutes?: number }
        segments?: Array<{ kind?: string; title?: string; content?: string; checkpoint?: boolean }>
        references?: unknown
        questions?: Array<{ type?: string; prompt?: string; options?: string[]; correct_answer?: string; explanation?: string; topic?: string }>
      }>(
        `You are an expert Islamic curriculum designer writing for an AI teacher that narrates lessons aloud. You follow mainstream Sunni scholarship and write accurate, gentle, engaging content.
${SOURCE_RULES}
Respond with a single JSON object only.`,
        `Write one lesson.
Course: ${clip(body.courseTitle, 120)} · Module: ${clip(body.moduleTitle, 120)}
Lesson title: ${clip(body.title, 160)}
Audience level: ${level}
Author notes: ${clip(body.notes, 2000) || '(none)'}

Requirements (English, spoken style, no markdown):
- lesson: {title, description (1 sentence), objectives (exactly 3), est_minutes (8–15)}
- segments: 5 items — intro, 2–3 of teaching/story/example, summary. Each 80–130 words. checkpoint true except the last.
- references: 3–5 items. ${REFERENCE_FORMAT}
- questions: exactly 5 — 2 "mcq" (4 options, correct_answer equals one option exactly), 1 "true_false" (options ["True","False"]), 1 "short_answer", 1 "reflection" (correct_answer ""). Each has explanation and a short topic.
Return JSON: {"lesson":{...},"segments":[...],"references":[...],"questions":[...]}`,
      )
      const kinds = ['intro', 'teaching', 'example', 'story', 'summary']
      const types = ['mcq', 'true_false', 'short_answer', 'reflection']
      return {
        lesson: {
          title: clip(out.lesson?.title ?? body.title, 200),
          description: clip(out.lesson?.description, 400),
          objectives: (out.lesson?.objectives ?? []).slice(0, 5).map((o) => clip(o, 200)),
          est_minutes: Math.min(30, Math.max(5, Number(out.lesson?.est_minutes) || 10)),
        },
        segments: (out.segments ?? []).slice(0, 8).map((s, i, all) => ({
          kind: kinds.includes(s.kind ?? '') ? s.kind : 'teaching',
          title: clip(s.title, 120),
          content: clip(s.content, 2000),
          checkpoint: s.checkpoint ?? i < all.length - 1,
          audio_url: null,
          order_index: i,
        })),
        references: await normalizeRefs(out.references),
        questions: (out.questions ?? []).slice(0, 10).map((q, i) => {
          const type = types.includes(q.type ?? '') ? q.type! : 'short_answer'
          return {
            type,
            prompt: clip(q.prompt, 400),
            options: type === 'true_false' ? ['True', 'False'] : type === 'mcq' ? (q.options ?? []).slice(0, 6).map((o) => clip(o, 200)) : [],
            correct_answer: clip(q.correct_answer, 400),
            explanation: clip(q.explanation, 400),
            topic: clip(q.topic, 80),
            order_index: i,
          }
        }),
      }
    }

    default:
      throw new HttpError(400, `Unknown action: ${action}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const admin = adminClient()
  const started = Date.now()
  let userId: string | null = null
  let action = 'unknown'

  try {
    const user = await requireUser(req, admin)
    userId = user.id
    const body = (await req.json()) as Record<string, unknown>
    action = String(body.action ?? '')

    const since = new Date(Date.now() - 60_000).toISOString()
    const { count } = await admin.from('ai_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since)
    if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) throw new HttpError(429, 'Too many requests — please slow down a little.')

    const result = await handle(action, body, { isAdmin: action === 'generate_lesson' && (await isAdmin(admin, user.id)) })
    await admin.from('ai_logs').insert({ user_id: userId, action, model: MODEL, latency_ms: Date.now() - started, ok: true })
    return json(result)
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    console.error(action, e)
    if (userId) await admin.from('ai_logs').insert({ user_id: userId, action, model: MODEL, latency_ms: Date.now() - started, ok: false })
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, status)
  }
})
