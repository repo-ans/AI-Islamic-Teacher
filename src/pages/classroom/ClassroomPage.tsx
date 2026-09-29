import { ArrowLeft, Hand, Lock, Mic, Send, Target, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ReferenceDrawer, ReferenceList } from '../../components/References'
import { Button, buttonClasses, Card, CourseBadge, PageLoader, Pill } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { formatDay } from '../../lib/clock'
import { useData } from '../../lib/data'
import { languageLabel } from '../../lib/levels'
import { speechSupported, useNarrator, type Narrator } from '../../lib/narrator'
import { courseLessons, isOpen, reviewQueue } from '../../lib/progress'
import { repo } from '../../lib/repo'
import { useSpeechInput } from '../../lib/speech-input'
import type { Course, LessonContent, MissedQuestion, Profile, Reference } from '../../lib/types'
import type { ExplainMode } from '../../lib/ai'
import { cn } from '../../lib/utils'
import { MessageView, TeacherAvatar, Typing, Waveform } from './Messages'
import { EXPLAIN_LABEL, useClassroom, type Classroom } from './useClassroom'

const STAGES = ['Greeting', 'Lesson', 'Discussion', 'Quiz', 'Q&A']
const VOICE_KEY = 'ilm-ai-voice'

export function ClassroomPage() {
  const { lessonId = '' } = useParams()
  const { profile } = useAuth()
  const { catalog, state, refresh } = useData()
  const [content, setContent] = useState<LessonContent | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    setContent(undefined)
    repo
      .getLessonContent(lessonId)
      .then((c) => alive && setContent(c))
      .catch(() => alive && setContent(null))
    return () => {
      alive = false
    }
  }, [lessonId])

  // Snapshot review items once so they don't change mid-lesson.
  const [review, setReview] = useState<MissedQuestion[] | null>(null)
  useEffect(() => {
    if (content && review === null) setReview(reviewQueue(state, content.lesson.course_id))
  }, [content, state, review])

  if (content === undefined || !profile || (content && review === null)) return <PageLoader />
  if (!content) {
    return (
      <div className="p-5">
        <Card>
          <p className="text-sm text-muted">This lesson could not be found.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-medium underline">
            Back to dashboard
          </Link>
        </Card>
      </div>
    )
  }

  const course = catalog.courses.find((c) => c.id === content.lesson.course_id)
  const status = courseLessons(catalog, state.progress, content.lesson.course_id).find((l) => l.lesson.id === lessonId)
  const enrolled = state.enrollments.some((e) => e.course_id === content.lesson.course_id)

  if (!course || !status || !enrolled || !isOpen(status.status)) {
    return (
      <div className="grid min-h-screen place-items-center p-5">
        <Card className="max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-soft">
            <Lock className="size-5 text-muted" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">{content.lesson.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {!enrolled
              ? 'Enroll in this course to start learning.'
              : status?.status === 'tomorrow' && status.unlockAt
                ? `One lesson a day keeps knowledge firm. This lesson opens ${formatDay(status.unlockAt, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}, in shaa Allah.`
                : 'Complete the previous lesson first.'}
          </p>
          <Link to={course ? `/courses/${course.id}` : '/courses'} className={buttonClasses('primary', 'md', 'mt-5')}>
            Back to course
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <Room
      key={lessonId}
      content={content}
      course={course}
      profile={profile}
      review={review ?? []}
      alreadyCompleted={status.status === 'completed'}
      onSaved={refresh}
    />
  )
}

function Room(props: {
  content: LessonContent
  course: Course
  profile: Profile
  review: MissedQuestion[]
  alreadyCompleted: boolean
  onSaved: () => Promise<void>
}) {
  const { content, course, profile } = props
  const narrator = useNarrator()
  const [voiceOn, setVoiceOn] = useState(() => {
    try {
      return speechSupported && localStorage.getItem(VOICE_KEY) !== 'off'
    } catch {
      return speechSupported
    }
  })
  const room = useClassroom({
    content,
    course,
    profile,
    review: props.review,
    narrator,
    voiceOn,
    alreadyCompleted: props.alreadyCompleted,
    onSaved: () => void props.onSaved(),
  })
  const [openRef, setOpenRef] = useState<Reference | null>(null)
  const moduleTitle = useData().catalog.modules.find((m) => m.id === content.lesson.module_id)?.title

  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [room.msgs.length, room.thinking])

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    try {
      localStorage.setItem(VOICE_KEY, next ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen flex-col p-3 sm:p-5">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 rounded-[24px] bg-white px-4 py-3">
        <Link to={`/courses/${course.id}`} className="grid size-10 place-items-center rounded-full border border-line hover:bg-soft" aria-label="Leave lesson">
          <ArrowLeft className="size-4" />
        </Link>
        <CourseBadge title={course.title} color={course.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">
            {course.title}
            {moduleTitle ? ` · ${moduleTitle}` : ''}
          </p>
          <h1 className="truncate font-semibold">{content.lesson.title}</h1>
        </div>
        <ol className="hidden items-center gap-1.5 xl:flex">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  i < room.stage ? 'bg-ok-soft text-ok' : i === room.stage ? 'bg-ink text-white' : 'bg-soft text-muted',
                )}
              >
                {s}
              </span>
              {i < STAGES.length - 1 && <span className="h-px w-3 bg-dash" />}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2">
          <select
            value={narrator.rate}
            onChange={(e) => narrator.setRate(Number(e.target.value))}
            className="h-10 rounded-xl border border-line bg-white px-2 text-sm outline-none"
            aria-label="Narration speed"
          >
            {[0.75, 0.9, 1, 1.15, 1.3, 1.5].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
          <Button variant={voiceOn ? 'lime' : 'outline'} onClick={toggleVoice} disabled={!speechSupported} title="Teacher voice">
            {voiceOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            <span className="hidden sm:inline">{voiceOn ? 'Voice on' : 'Voice off'}</span>
          </Button>
        </div>
      </header>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Conversation */}
        <section className="flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col rounded-[24px] bg-white">
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4 scroll-thin sm:p-6">
            {room.msgs.map((m) => (
              <MessageView key={m.id} msg={m} content={content} room={room} narratorState={narrator.state} voiceOn={voiceOn} onRef={setOpenRef} />
            ))}
            {room.thinking && <Typing />}
          </div>
          <Composer room={room} language={profile.language} />
        </section>

        {/* Side panel */}
        <aside className="space-y-4 lg:h-[calc(100vh-8.5rem)] lg:overflow-y-auto lg:scroll-thin">
          <TeacherCard room={room} narrator={narrator} />
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-brand" /> Today you will
            </p>
            <ul className="mt-3 space-y-2">
              {content.lesson.objectives.map((o) => (
                <li key={o} className="flex gap-2 text-sm text-ink/80">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                  {o}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-1">
              {content.segments.map((s, i) => (
                <span
                  key={s.id}
                  className={cn('h-1.5 flex-1 rounded-full', i < room.segIdx || room.stage > 1 ? 'bg-ink' : i === room.segIdx ? 'bg-lime-strong' : 'bg-line')}
                />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">Explain differently</p>
            <p className="mt-0.5 text-xs text-muted">Applies to the part you're on now.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Object.keys(EXPLAIN_LABEL) as ExplainMode[])
                .filter((m) => m !== 'translate' || profile.language !== 'en')
                .map((m) => (
                  <button
                    key={m}
                    disabled={room.thinking || room.phase === 'done' || room.phase === 'quiz' || room.phase === 'grading'}
                    onClick={() => room.explainDifferently(m)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium transition hover:border-ink hover:bg-soft disabled:opacity-40"
                  >
                    {m === 'translate' ? `In ${languageLabel(profile.language).split(' (')[0]}` : EXPLAIN_LABEL[m]}
                  </button>
                ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">Sources in this lesson</p>
            <p className="mb-3 text-xs text-muted">Quran, Hadith and scholarly references used.</p>
            <ReferenceList refs={content.references} onOpen={setOpenRef} />
          </Card>
          <p className="px-2 text-[11px] leading-relaxed text-subtle">
            Your AI teacher is a learning companion, not a mufti. For personal rulings, please consult a qualified scholar.
          </p>
        </aside>
      </div>

      {openRef && <ReferenceDrawer reference={openRef} onClose={() => setOpenRef(null)} />}
    </div>
  )
}

function TeacherCard({ room, narrator }: { room: Classroom; narrator: Narrator }) {
  const status = room.thinking
    ? 'Thinking…'
    : narrator.state === 'playing'
      ? 'Teaching'
      : narrator.state === 'loading'
        ? 'Preparing audio…'
        : room.phase === 'asking' || room.phase === 'quiz'
          ? 'Listening to you'
          : room.phase === 'done'
            ? 'Class finished'
            : 'Waiting for you'
  return (
    <div className="rounded-[24px] bg-brand p-5 text-white">
      <div className="flex items-center gap-3">
        <TeacherAvatar className="size-11 bg-white/10" />
        <div className="flex-1">
          <p className="font-semibold">Noor</p>
          <p className="text-xs text-white/60">Your AI Islamic teacher</p>
        </div>
        <Waveform active={narrator.state === 'playing'} light />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-white/25 px-3 py-2.5">
        <span className="text-sm">{status}</span>
        {room.thinking && <span className="size-2 animate-pulse rounded-full bg-lime" />}
      </div>
    </div>
  )
}

function Composer({ room, language }: { room: Classroom; language: string }) {
  const [text, setText] = useState('')
  const speech = useSpeechInput(language, (t, final) => {
    setText(t)
    if (final && t.trim()) {
      room.sendText(t)
      setText('')
    }
  })
  const placeholder = useMemo(() => {
    if (room.phase === 'quiz' && room.currentQuestion) {
      return room.currentQuestion.type === 'reflection' ? 'Write your reflection…' : 'Type your answer…'
    }
    if (room.phase === 'segment') return 'Type a question — the recording will pause'
    if (room.phase === 'asking' || room.phase === 'open_qa') return 'Ask your question…'
    return 'Reply to your teacher…'
  }, [room.phase, room.currentQuestion])

  const submit = () => {
    if (!text.trim()) return
    room.sendText(text)
    setText('')
  }

  return (
    <div className="border-t border-dashed border-dash p-3 sm:p-4">
      {room.chips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {room.chips.map((c) => (
            <button
              key={c.label}
              disabled={room.thinking}
              onClick={() => room.sendChip(c)}
              className="rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-sm font-medium transition hover:border-ink hover:bg-lime disabled:opacity-40"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        {room.phase === 'segment' && (
          <Button variant="lime" onClick={room.raiseHand} title="Pause and ask a question" className="shrink-0">
            <Hand className="size-4" /> <span className="hidden sm:inline">Raise hand</span>
          </Button>
        )}
        <textarea
          rows={1}
          value={text}
          disabled={!room.inputEnabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={room.inputEnabled ? placeholder : room.phase === 'quiz' ? 'Choose an option above' : ''}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-soft px-3.5 py-2.5 text-[15px] outline-none placeholder:text-subtle focus:border-brand focus:bg-white disabled:opacity-60"
        />
        {speech.supported && (
          <button
            onClick={speech.listening ? speech.stop : speech.start}
            disabled={!room.inputEnabled}
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-xl border transition disabled:opacity-40',
              speech.listening ? 'animate-pulse border-danger bg-danger-soft text-danger' : 'border-line hover:bg-soft',
            )}
            aria-label={speech.listening ? 'Stop listening' : 'Speak'}
          >
            <Mic className="size-4" />
          </button>
        )}
        <Button onClick={submit} disabled={!room.inputEnabled || !text.trim()} className="size-11 shrink-0 px-0" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
      {room.phase === 'segment' && <Pill className="mt-2">Recording in progress — tap “Raise hand” or type to ask a question</Pill>}
    </div>
  )
}
