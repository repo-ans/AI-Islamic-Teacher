/**
 * Scripted teacher lines for the guided lesson. They are instant (no AI round
 * trip) and localised; anything unscripted comes from the AI in the learner's
 * language. Languages without a script fall back to English.
 */
export interface TeacherLines {
  greeting: (name: string) => string
  greetReply: string
  askReady: (title: string) => string
  notReady: string
  startLesson: string
  reviewIntro: (prompt: string) => string
  reviewCheck: string
  checkpoints: string[]
  confusedIntro: string
  askGoAhead: string
  continueQ: string
  resumeQ: string
  lessonEnd: string
  beforeQuiz: string
  quizIntro: string
  quizWait: string
  quizQ: (n: number, total: number) => string
  acks: string[]
  grading: string
  result: (score: number, total: number) => string
  praise: (pct: number) => string
  otherQuestions: string
  finish: string
  chips: {
    ready: string
    notReady: string
    readyNow: string
    continue: string
    confused: string
    question: string
    noQuestions: string
    quizReady: string
    quizWait: string
    gotIt: string
    stillConfused: string
    anotherQuestion: string
    finish: string
    yesQuestion: string
  }
}

const en: TeacherLines = {
  greeting: (name) => `Assalamu alaikum, ${name}! 👋 How are you? How is your day going?`,
  greetReply: "Alhamdulillah, it's lovely to hear from you.",
  askReady: (title) => `Today's class is “${title}”. Are you ready to start?`,
  notReady: "No problem at all. Tell me whenever you're ready.",
  startLesson:
    "Wonderful! Bismillah — let's begin. Listen carefully, and tap “Raise hand” any time you want to ask something.",
  reviewIntro: (prompt) =>
    `Before we start — yesterday this question was tricky for you: “${prompt}”. Let me explain it once more.`,
  reviewCheck: 'Is it clear now?',
  checkpoints: [
    'Can you hear me clearly? Is everything making sense?',
    'Is anything difficult to understand so far?',
    'Do you have any questions so far?',
    'Still with me? Is this clear?',
  ],
  confusedIntro: 'No problem — let me explain it a different way.',
  askGoAhead: 'Of course! Type or say your question.',
  continueQ: 'Shall I continue the lesson?',
  resumeQ: 'Shall I continue from where we stopped?',
  lessonEnd: "That's the end of today's lesson! 🎉 How did you find it? Do you have any questions?",
  beforeQuiz: 'Any other questions before the quiz?',
  quizIntro: "Now I'll give you a short quiz on today's lesson. Are you ready?",
  quizWait: "Take your time. Tell me when you're ready.",
  quizQ: (n, total) => `Question ${n} of ${total}`,
  acks: ['Got it 👍', 'Thank you!', 'Noted.', 'Okay!'],
  grading: 'Let me check your answers…',
  result: (score, total) =>
    score === total
      ? `You answered all ${total} questions correctly!`
      : `You answered ${score} out of ${total} correctly, and missed ${total - score}.`,
  praise: (pct) =>
    pct >= 80
      ? 'MashaAllah, excellent work!'
      : pct >= 60
        ? 'Good job!'
        : "Good effort! We'll review what you missed at the start of tomorrow's lesson, in shaa Allah.",
  otherQuestions: 'Do you have any other questions now?',
  finish:
    "JazakAllahu khairan for learning today! This lesson is complete. Your next lesson unlocks tomorrow, in shaa Allah.",
  chips: {
    ready: "Yes, I'm ready",
    notReady: 'Not yet',
    readyNow: "I'm ready now",
    continue: 'Yes, continue',
    confused: "I didn't understand",
    question: 'I have a question',
    noQuestions: 'No questions',
    quizReady: 'Start the quiz',
    quizWait: 'Give me a minute',
    gotIt: "Got it, let's continue",
    stillConfused: "I still don't understand",
    anotherQuestion: 'Another question',
    finish: 'No, finish the lesson',
    yesQuestion: 'Yes, I have a question',
  },
}

const bn: TeacherLines = {
  greeting: (name) => `আসসালামু আলাইকুম, ${name}! 👋 কেমন আছেন? আজ আপনার দিন কেমন যাচ্ছে?`,
  greetReply: 'আলহামদুলিল্লাহ, শুনে ভালো লাগলো।',
  askReady: (title) => `আজকের ক্লাস: “${title}”। আপনি কি ক্লাস শুরু করতে প্রস্তুত?`,
  notReady: 'কোনো সমস্যা নেই। প্রস্তুত হলে আমাকে জানাবেন।',
  startLesson: 'চমৎকার! বিসমিল্লাহ — চলুন শুরু করি। মনোযোগ দিয়ে শুনুন, আর যেকোনো সময় প্রশ্ন করতে “হাত তুলুন” বাটনে চাপ দিন।',
  reviewIntro: (prompt) => `শুরু করার আগে — গতকাল এই প্রশ্নটি আপনার কঠিন লেগেছিল: “${prompt}”। চলুন আরেকবার বুঝে নিই।`,
  reviewCheck: 'এখন কি পরিষ্কার হয়েছে?',
  checkpoints: [
    'আপনি কি আমার কথা পরিষ্কার শুনতে পাচ্ছেন? সব বুঝতে পারছেন তো?',
    'এ পর্যন্ত কি কিছু বুঝতে সমস্যা হচ্ছে?',
    'এখন পর্যন্ত কোনো প্রশ্ন আছে?',
    'সব ঠিকঠাক বোঝা যাচ্ছে?',
  ],
  confusedIntro: 'কোনো সমস্যা নেই — আমি অন্যভাবে বুঝিয়ে বলছি।',
  askGoAhead: 'অবশ্যই! আপনার প্রশ্নটি লিখুন বা বলুন।',
  continueQ: 'আমি কি পাঠ চালিয়ে যাব?',
  resumeQ: 'যেখানে থেমেছিলাম, সেখান থেকে কি আবার শুরু করব?',
  lessonEnd: 'আজকের পাঠ এখানেই শেষ! 🎉 পাঠটি কেমন লাগলো? আপনার কি কোনো প্রশ্ন আছে?',
  beforeQuiz: 'কুইজের আগে আর কোনো প্রশ্ন আছে?',
  quizIntro: 'এবার আজকের পাঠের উপর আমি আপনার একটি ছোট কুইজ নেব। আপনি কি প্রস্তুত?',
  quizWait: 'সময় নিন। প্রস্তুত হলে জানাবেন।',
  quizQ: (n, total) => `প্রশ্ন ${n}/${total}`,
  acks: ['ঠিক আছে 👍', 'ধন্যবাদ!', 'উত্তর পেয়েছি।', 'বুঝেছি।'],
  grading: 'আপনার উত্তরগুলো দেখছি…',
  result: (score, total) =>
    score === total
      ? `আপনি ${total}টি প্রশ্নেরই সঠিক উত্তর দিয়েছেন!`
      : `আপনি ${total}টির মধ্যে ${score}টি সঠিক উত্তর দিয়েছেন, ${total - score}টি পারেননি।`,
  praise: (pct) =>
    pct >= 80
      ? 'মাশাআল্লাহ, চমৎকার!'
      : pct >= 60
        ? 'খুব ভালো করেছেন!'
        : 'ভালো চেষ্টা! যেগুলো ভুল হয়েছে, আগামীকালের পাঠের শুরুতে আমরা আবার দেখে নেব, ইনশাআল্লাহ।',
  otherQuestions: 'এখন কি আপনার আর কোনো প্রশ্ন আছে?',
  finish: 'জাযাকাল্লাহু খাইরান! আজকের পাঠ সম্পন্ন হয়েছে। পরবর্তী পাঠ আগামীকাল খুলবে, ইনশাআল্লাহ।',
  chips: {
    ready: 'হ্যাঁ, আমি প্রস্তুত',
    notReady: 'এখনো না',
    readyNow: 'এখন প্রস্তুত',
    continue: 'হ্যাঁ, চালিয়ে যান',
    confused: 'বুঝতে পারিনি',
    question: 'আমার প্রশ্ন আছে',
    noQuestions: 'কোনো প্রশ্ন নেই',
    quizReady: 'কুইজ শুরু করুন',
    quizWait: 'একটু সময় দিন',
    gotIt: 'বুঝেছি, চলুন এগোই',
    stillConfused: 'এখনো বুঝিনি',
    anotherQuestion: 'আরেকটি প্রশ্ন',
    finish: 'না, পাঠ শেষ করুন',
    yesQuestion: 'হ্যাঁ, প্রশ্ন আছে',
  },
}

const LINES: Record<string, TeacherLines> = { en, bn }

export const teacherLines = (lang: string): TeacherLines => LINES[lang] ?? en

/** Language the scripted lines are actually written in (for choosing a voice). */
export const linesLang = (lang: string) => (LINES[lang] ? lang : 'en')

export const pick = <T,>(arr: T[], i: number) => arr[i % arr.length]
