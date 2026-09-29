/**
 * Starter curriculum (AI-assisted draft, to be reviewed by a qualified teacher).
 * Used to seed Supabase (`npm run seed`) and the local demo database.
 * Segment text is the "pre-recorded" narration the teacher plays; admins can
 * attach real recordings (audio_url) or generate them with the TTS function.
 */
import type { CourseColor, QuestionType, Reference, SegmentKind } from './types'

export interface SeedLesson {
  title: string
  description: string
  objectives: string[]
  est_minutes: number
  segments: Array<{ kind: SegmentKind; title: string; content: string; checkpoint?: boolean }>
  references: Reference[]
  questions: Array<{
    type: QuestionType
    prompt: string
    options?: string[]
    correct_answer: string
    explanation: string
    topic: string
  }>
}

export interface SeedCourse {
  slug: string
  title: string
  description: string
  category: string
  color: CourseColor
  modules: Array<{ title: string; description: string; lessons: SeedLesson[] }>
}

const quran = (surah: number, ayah?: string) => `https://quran.com/${surah}${ayah ? `/${ayah}` : ''}`
const sunnah = (collection: string, n: number) => `https://sunnah.com/${collection}:${n}`
const TF = ['True', 'False']

export const CURRICULUM: SeedCourse[] = [
  // ───────────────────────────── AQEEDAH ─────────────────────────────
  {
    slug: 'aqeedah',
    title: 'Aqeedah',
    description: 'Core Islamic belief — knowing Allah, the pillars of faith, and the unseen world.',
    category: 'Belief',
    color: 'brand',
    modules: [
      {
        title: 'Foundations of Belief',
        description: 'Tawhid, the six pillars of Iman, and belief in the angels.',
        lessons: [
          {
            title: 'Who Is Allah? Understanding Tawhid',
            description: 'The Oneness of Allah, Surah Al-Ikhlas, and the three categories of Tawhid.',
            objectives: [
              'Explain what Tawhid (the Oneness of Allah) means',
              'Understand the meaning of Surah Al-Ikhlas',
              'Name the three categories of Tawhid',
            ],
            est_minutes: 12,
            segments: [
              {
                kind: 'intro',
                title: 'Welcome',
                content:
                  'Bismillah. In this lesson we begin with the most important question in Islam: who is Allah? Allah is the Arabic name for the One God — the Creator of the heavens and the earth and everything in them. Arabic-speaking Christians and Jews also use the word Allah for God. Everything a Muslim believes, and every act of worship, is built on knowing Allah correctly. This belief in the Oneness of Allah is called Tawhid.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'Surah Al-Ikhlas',
                content:
                  'Allah describes Himself in a short chapter of the Quran called Surah Al-Ikhlas: "Say, He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, and there is none comparable to Him." In four short verses we learn that Allah is One, that everything depends on Him while He depends on nothing, that He has no parents and no children, and that nothing in creation is like Him. The Prophet ﷺ said this surah is equal to one third of the Quran.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'The Three Parts of Tawhid',
                content:
                  'Scholars explain Tawhid in three parts to help us understand it. First, Tawhid ar-Rububiyyah: Allah alone is the Lord — He creates, provides, and controls all affairs. Second, Tawhid al-Uluhiyyah: Allah alone deserves worship — our prayers, du\'a and sacrifice are for Him only. Third, Tawhid al-Asma\' was-Sifat: Allah has beautiful names and perfect attributes, and we affirm them as He described Himself, without comparing Him to His creation. The opposite of Tawhid is shirk — associating partners with Allah — which is the greatest sin.',
                checkpoint: true,
              },
              {
                kind: 'example',
                title: 'Tawhid in Daily Life',
                content:
                  'How does Tawhid look in everyday life? When you are worried about an exam or your work, you do your best and then place your trust in Allah, because He controls every outcome. When you make du\'a, you ask Allah directly — no middleman is needed. When you see a beautiful sunset, you remember the Creator behind it. Allah says in Ayat al-Kursi: "Allah — there is no deity except Him, the Ever-Living, the Sustainer of all existence."',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  "Let's review. Allah is the One God, the Creator of everything. Surah Al-Ikhlas teaches that He is One, Eternal, has no parents or children, and nothing is like Him. Tawhid has three parts: Allah alone is Lord, Allah alone is worshipped, and His names and attributes are unique. Living with Tawhid means trusting Allah, worshipping Him alone, and remembering Him in everything we see.",
              },
            ],
            references: [
              {
                source_type: 'quran',
                citation: 'Quran 112:1-4 (Surah Al-Ikhlas)',
                arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
                text: 'Say, "He is Allah, [who is] One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent."',
                url: quran(112),
              },
              {
                source_type: 'quran',
                citation: 'Quran 2:255 (Ayat al-Kursi)',
                arabic: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ',
                text: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.',
                url: quran(2, '255'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 42:11',
                arabic: 'لَيْسَ كَمِثْلِهِۦ شَىْءٌ ۖ وَهُوَ ٱلسَّمِيعُ ٱلْبَصِيرُ',
                text: 'There is nothing like unto Him, and He is the Hearing, the Seeing.',
                url: quran(42, '11'),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 5013',
                text: 'The Prophet ﷺ said about Surah Al-Ikhlas: "By Him in Whose Hand my life is, it is equal to one-third of the Quran."',
                url: sunnah('bukhari', 5013),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'What does "Tawhid" mean?',
                options: ['The Oneness of Allah', 'The five daily prayers', 'Charity given to the poor', 'The life of the Prophet ﷺ'],
                correct_answer: 'The Oneness of Allah',
                explanation: 'Tawhid is the belief that Allah is One — in His Lordship, in worship, and in His names and attributes.',
                topic: 'Meaning of Tawhid',
              },
              {
                type: 'true_false',
                prompt: 'According to Surah Al-Ikhlas, Allah has children.',
                options: TF,
                correct_answer: 'False',
                explanation: 'Surah Al-Ikhlas says: "He neither begets nor is born."',
                topic: 'Surah Al-Ikhlas',
              },
              {
                type: 'mcq',
                prompt: 'Which category of Tawhid means that Allah alone deserves worship?',
                options: ['Tawhid ar-Rububiyyah', 'Tawhid al-Uluhiyyah', "Tawhid al-Asma' was-Sifat", 'None of these'],
                correct_answer: 'Tawhid al-Uluhiyyah',
                explanation: 'Uluhiyyah is directing all worship — prayer, du\'a, sacrifice — to Allah alone.',
                topic: 'Categories of Tawhid',
              },
              {
                type: 'short_answer',
                prompt: 'What is the opposite of Tawhid called?',
                correct_answer: 'Shirk — associating partners with Allah',
                explanation: 'Shirk means associating partners with Allah, and it is the greatest sin.',
                topic: 'Shirk',
              },
              {
                type: 'reflection',
                prompt: 'Name one way you can live with Tawhid in your daily life this week.',
                correct_answer: '',
                explanation: '',
                topic: 'Living Tawhid',
              },
            ],
          },
          {
            title: 'The Six Pillars of Iman',
            description: 'The Hadith of Jibril and the six articles of faith.',
            objectives: [
              'List the six pillars of Iman',
              'Retell the Hadith of Jibril',
              'Explain the difference between Islam, Iman and Ihsan',
            ],
            est_minutes: 12,
            segments: [
              {
                kind: 'story',
                title: 'The Hadith of Jibril',
                content:
                  'One day the companions were sitting with the Prophet ﷺ when a man appeared wearing very white clothes, with very black hair. No sign of travel was on him, yet none of them knew him. He sat close to the Prophet ﷺ and asked about Islam, Iman and Ihsan. After he left, the Prophet ﷺ told Umar that this was the angel Jibril, who had come to teach them their religion. This famous hadith is recorded in Sahih Muslim.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'What Is Iman?',
                content:
                  'When asked about Iman, the Prophet ﷺ answered: "That you believe in Allah, His angels, His books, His messengers and the Last Day, and that you believe in the divine decree, its good and its bad." These are the six pillars of Iman. Iman is faith that lives in the heart, is spoken by the tongue, and shows in our actions.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'The Six Pillars Explained',
                content:
                  "One — belief in Allah, the One God. Two — belief in the angels, created beings who always obey Allah. Three — belief in the books Allah revealed, such as the Torah, the Psalms, the Gospel, and finally the Quran. Four — belief in all the prophets and messengers, from Adam and Nuh to Ibrahim, Musa, 'Isa, and the final messenger, Muhammad ﷺ. Five — belief in the Last Day, when everyone will be raised and held accountable. Six — belief in Qadar: that Allah knows and has decreed all things.",
                checkpoint: true,
              },
              {
                kind: 'example',
                title: 'Islam, Iman and Ihsan',
                content:
                  'In the same hadith, Jibril asked three questions. Islam is the outward actions: the testimony of faith, prayer, zakah, fasting in Ramadan, and Hajj. Iman is the inner belief in the six pillars. Ihsan is the highest level: "to worship Allah as though you see Him, and if you do not see Him, He surely sees you." Think of a tree: Iman is the roots, Islam is the trunk and branches, and Ihsan is the beautiful fruit.',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  'To summarise: the Hadith of Jibril teaches us the levels of our religion. The six pillars of Iman are belief in Allah, His angels, His books, His messengers, the Last Day, and Qadar — the divine decree. Islam is what we do, Iman is what we believe, and Ihsan is worshipping Allah with excellence, knowing He always sees us.',
              },
            ],
            references: [
              {
                source_type: 'hadith',
                citation: 'Sahih Muslim 8 (Hadith of Jibril)',
                text: '"Tell me about Iman." He said: "That you affirm your faith in Allah, in His angels, in His Books, in His Messengers, in the Day of Judgement, and that you affirm your faith in the Divine Decree, the good and the evil thereof."',
                url: sunnah('muslim', 8),
              },
              {
                source_type: 'quran',
                citation: 'Quran 2:285',
                text: 'The Messenger has believed in what was revealed to him from his Lord, and [so have] the believers. All of them have believed in Allah and His angels and His books and His messengers.',
                url: quran(2, '285'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 4:136',
                text: 'O you who have believed, believe in Allah and His Messenger and the Book that He sent down upon His Messenger and the Scripture which He sent down before.',
                url: quran(4, '136'),
              },
              {
                source_type: 'hadith',
                citation: "An-Nawawi's Forty Hadith, No. 2",
                text: 'The Hadith of Jibril is the second hadith in Imam an-Nawawi\'s collection of forty foundational hadith.',
                url: sunnah('nawawi40', 2),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'How many pillars of Iman are there?',
                options: ['Four', 'Five', 'Six', 'Seven'],
                correct_answer: 'Six',
                explanation: 'Allah, the angels, the books, the messengers, the Last Day, and Qadar.',
                topic: 'Pillars of Iman',
              },
              {
                type: 'mcq',
                prompt: 'Who was the stranger in the Hadith of Jibril?',
                options: ['The angel Jibril', 'Abu Bakr', 'A traveller from Yemen', 'Umar ibn al-Khattab'],
                correct_answer: 'The angel Jibril',
                explanation: 'The Prophet ﷺ told Umar: "That was Jibril, who came to teach you your religion."',
                topic: 'Hadith of Jibril',
              },
              {
                type: 'true_false',
                prompt: 'Belief in Qadar (the divine decree) is one of the pillars of Iman.',
                options: TF,
                correct_answer: 'True',
                explanation: 'Qadar is the sixth pillar of Iman.',
                topic: 'Qadar',
              },
              {
                type: 'short_answer',
                prompt: 'What is Ihsan, as described in the Hadith of Jibril?',
                correct_answer: 'To worship Allah as though you see Him, and if you do not see Him, He sees you.',
                explanation: 'Ihsan is the highest level of the religion — excellence in worship.',
                topic: 'Ihsan',
              },
              {
                type: 'reflection',
                prompt: 'Which pillar of Iman would you like to learn more about, and why?',
                correct_answer: '',
                explanation: '',
                topic: 'Reflection on Iman',
              },
            ],
          },
          {
            title: 'Belief in the Angels',
            description: 'What angels are, their duties, and how this belief shapes our behaviour.',
            objectives: [
              'Describe what angels are created from',
              'Name key angels and their duties',
              'Explain how belief in angels affects our behaviour',
            ],
            est_minutes: 11,
            segments: [
              {
                kind: 'intro',
                title: 'The Unseen World',
                content:
                  'Muslims believe in the unseen — things that are real even though we cannot see them. Angels are part of this unseen world. The Prophet ﷺ told us that angels were created from light, the jinn from smokeless fire, and Adam from clay. Angels do not eat or drink, they never get tired, and they never disobey Allah. The Quran says they "do not disobey Allah in what He commands them, but do what they are commanded."',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'Angels and Their Duties',
                content:
                  "Allah has given the angels different tasks. Jibril brought revelation to the prophets, including the Quran to Muhammad ﷺ. Mika'il is entrusted with rain and provision. Israfil will blow the trumpet on the Last Day. The Angel of Death takes souls at their appointed time. Munkar and Nakir question people in the grave, and Malik guards the Hellfire. There are countless angels — only Allah knows their number.",
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'The Honourable Recorders',
                content:
                  'Every person has angels with them, writing down their deeds. Allah says: "When the two receivers receive, seated on the right and on the left, man does not utter any word except that with him is an observer prepared to record." The angel on the right records good deeds, and the angel on the left records bad deeds. On the Day of Judgement, each person will receive the book of their deeds.',
                checkpoint: true,
              },
              {
                kind: 'example',
                title: 'Living with This Belief',
                content:
                  'Believing in angels changes how we live. When you are alone and tempted to do something wrong, you remember that the angels are recording. When you say something kind, you know it is written for you. Angels also make du\'a for the believers and attend gatherings where Allah is remembered. Knowing this gives us both good manners and comfort — we are never truly alone.',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  "In summary: angels are honoured servants of Allah created from light, and they always obey Him. Jibril brought the revelation, Mika'il is in charge of rain, Israfil will blow the trumpet, and the Angel of Death takes souls. Two noble angels record everything we do and say. Remembering them helps us do good and avoid wrong, even when no one else is watching.",
              },
            ],
            references: [
              {
                source_type: 'hadith',
                citation: 'Sahih Muslim 2996',
                text: 'The Messenger of Allah ﷺ said: "The angels were created from light, the jinn were created from smokeless fire, and Adam was created from that which has been described to you."',
                url: sunnah('muslim', 2996),
              },
              {
                source_type: 'quran',
                citation: 'Quran 66:6',
                text: '...over which are [appointed] angels, harsh and severe; they do not disobey Allah in what He commands them but do what they are commanded.',
                url: quran(66, '6'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 50:17-18',
                text: 'When the two receivers receive, seated on the right and on the left. Man does not utter any word except that with him is an observer prepared [to record].',
                url: quran(50, '17-18'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 35:1',
                text: 'Praise to Allah, Creator of the heavens and the earth, [who] made the angels messengers having wings, two or three or four.',
                url: quran(35, '1'),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'What were the angels created from?',
                options: ['Light', 'Clay', 'Smokeless fire', 'Water'],
                correct_answer: 'Light',
                explanation: 'Sahih Muslim 2996: angels from light, jinn from smokeless fire, Adam from clay.',
                topic: 'Nature of angels',
              },
              {
                type: 'mcq',
                prompt: 'Which angel brought the revelation to the prophets?',
                options: ['Jibril', "Mika'il", 'Israfil', 'Malik'],
                correct_answer: 'Jibril',
                explanation: 'Jibril (Gabriel) is the angel of revelation.',
                topic: 'Angels and their duties',
              },
              {
                type: 'true_false',
                prompt: 'Angels sometimes disobey Allah.',
                options: TF,
                correct_answer: 'False',
                explanation: 'Quran 66:6 — they do not disobey Allah in what He commands them.',
                topic: 'Nature of angels',
              },
              {
                type: 'short_answer',
                prompt: 'What do the two recording angels do?',
                correct_answer: 'They record our good and bad deeds.',
                explanation: 'Quran 50:17-18 — one on the right, one on the left, recording every word and deed.',
                topic: 'Recording angels',
              },
              {
                type: 'reflection',
                prompt: 'How could remembering the recording angels change one thing you do this week?',
                correct_answer: '',
                explanation: '',
                topic: 'Living with belief in angels',
              },
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────── SALAH ──────────────────────────────
  {
    slug: 'salah',
    title: 'Salah',
    description: 'Prayer — why we pray, how to prepare with wudu, and the five daily prayers.',
    category: 'Worship',
    color: 'lime',
    modules: [
      {
        title: 'Preparing for Prayer',
        description: 'The purpose of Salah, purification, and the prayer times.',
        lessons: [
          {
            title: 'Why Do We Pray?',
            description: 'The purpose and virtues of Salah, the second pillar of Islam.',
            objectives: [
              'Explain the purpose of Salah',
              "Know Salah's place among the five pillars of Islam",
              'Describe the benefits of regular prayer',
            ],
            est_minutes: 11,
            segments: [
              {
                kind: 'intro',
                title: 'Created to Worship',
                content:
                  'Allah tells us why we were created: "And I did not create the jinn and mankind except to worship Me." Worship in Islam is wide — being honest, being kind to parents, and helping others are all worship when done for Allah. But the most important act of worship after the testimony of faith is Salah, the five daily prayers. Salah is a direct meeting between the servant and the Lord, five times every day.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'The Second Pillar',
                content:
                  "The Prophet ﷺ said: \"Islam is built upon five: testifying that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing the prayer, giving zakah, Hajj, and fasting in Ramadan.\" Salah is the second pillar. It was made obligatory during the Night Journey, Al-Isra' wal-Mi'raj, when the Prophet ﷺ was taken up through the heavens — showing how special it is.",
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'Prayer as Remembrance',
                content:
                  'Allah said to Musa: "Establish prayer for My remembrance." Prayer keeps our heart connected to Allah throughout the day. Allah also says that "prayer prohibits immorality and wrongdoing." When a person stands before Allah five times a day, it becomes harder to forget Him in between. The Prophet ﷺ also taught that the first deed a person will be asked about on the Day of Judgement is their prayer.',
                checkpoint: true,
              },
              {
                kind: 'example',
                title: 'The River of Five Baths',
                content:
                  'The Prophet ﷺ once asked his companions: "If there was a river at the door of one of you and he bathed in it five times a day, would any dirt remain on him?" They said: "No dirt would remain." He said: "That is the example of the five prayers, with which Allah wipes away sins." Just as water cleans the body, prayer cleans the heart.',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  "To summarise: we were created to worship Allah, and Salah is the greatest act of worship after the shahadah. It is the second pillar of Islam, gifted during the Mi'raj. Prayer keeps us remembering Allah, protects us from wrongdoing, and washes away sins like a river washes away dirt. It will be the first deed we are asked about.",
              },
            ],
            references: [
              {
                source_type: 'quran',
                citation: 'Quran 51:56',
                arabic: 'وَمَا خَلَقْتُ ٱلْجِنَّ وَٱلْإِنسَ إِلَّا لِيَعْبُدُونِ',
                text: 'And I did not create the jinn and mankind except to worship Me.',
                url: quran(51, '56'),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 8',
                text: 'Islam is based on five: to testify that none has the right to be worshipped but Allah and Muhammad is Allah\'s Messenger, to offer the prayers, to pay zakah, to perform Hajj, and to observe fast during the month of Ramadan.',
                url: sunnah('bukhari', 8),
              },
              {
                source_type: 'quran',
                citation: 'Quran 20:14',
                arabic: 'وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ',
                text: 'Indeed, I am Allah. There is no deity except Me, so worship Me and establish prayer for My remembrance.',
                url: quran(20, '14'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 29:45',
                text: 'Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater.',
                url: quran(29, '45'),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 528',
                text: '"If there was a river at the door of anyone of you and he took a bath in it five times a day, would you notice any dirt on him?" They said, "Not a trace of dirt would be left." He said: "That is the example of the five prayers with which Allah blots out evil deeds."',
                url: sunnah('bukhari', 528),
              },
              {
                source_type: 'hadith',
                citation: "Jami' at-Tirmidhi 413",
                text: 'The first of his deeds for which a servant will be held accountable on the Day of Resurrection is his prayer.',
                url: sunnah('tirmidhi', 413),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'Salah is which pillar of Islam?',
                options: ['First', 'Second', 'Third', 'Fifth'],
                correct_answer: 'Second',
                explanation: 'The shahadah is first, then Salah (Sahih al-Bukhari 8).',
                topic: 'Pillars of Islam',
              },
              {
                type: 'mcq',
                prompt: 'When were the five daily prayers made obligatory?',
                options: [
                  "During the Night Journey (Al-Isra' wal-Mi'raj)",
                  'At the Battle of Badr',
                  'During the first revelation in Cave Hira',
                  'On the day of Hajj',
                ],
                correct_answer: "During the Night Journey (Al-Isra' wal-Mi'raj)",
                explanation: "Salah was gifted directly to the Prophet ﷺ during the Mi'raj.",
                topic: 'History of Salah',
              },
              {
                type: 'true_false',
                prompt: 'The Prophet ﷺ compared the five prayers to bathing in a river five times a day.',
                options: TF,
                correct_answer: 'True',
                explanation: 'Sahih al-Bukhari 528 — the five prayers wipe away sins like water removes dirt.',
                topic: 'Virtues of prayer',
              },
              {
                type: 'short_answer',
                prompt: 'According to the hadith, what is the first deed a person will be asked about on the Day of Judgement?',
                correct_answer: 'Their prayer (Salah)',
                explanation: "Jami' at-Tirmidhi 413.",
                topic: 'Importance of prayer',
              },
              {
                type: 'reflection',
                prompt: 'Which prayer of the day is hardest for you, and what could help you pray it on time?',
                correct_answer: '',
                explanation: '',
                topic: 'Personal prayer habits',
              },
            ],
          },
          {
            title: 'Wudu: Purity Before Prayer',
            description: 'Why we purify ourselves, the steps of wudu, and what breaks it.',
            objectives: [
              'Explain why purification is needed for prayer',
              'Perform the steps of wudu in order',
              'Know what breaks wudu',
            ],
            est_minutes: 12,
            segments: [
              {
                kind: 'intro',
                title: 'Why Wudu?',
                content:
                  'Before we stand in front of Allah, we prepare ourselves. The Prophet ﷺ said: "No prayer is accepted without purification." Wudu is the washing we do before prayer. It cleans the body, and the Prophet ﷺ taught that as we wash, our minor sins fall away with the drops of water. So wudu is both physical cleanliness and spiritual preparation.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'The Verse of Wudu',
                content:
                  'Allah describes wudu in Surah Al-Ma\'idah: "O you who have believed, when you rise to perform prayer, wash your faces and your forearms to the elbows, and wipe over your heads, and wash your feet to the ankles." These four actions — washing the face, washing the arms to the elbows, wiping the head, and washing the feet — are the essential parts of wudu mentioned in the Quran.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'Step by Step',
                content:
                  'Here is wudu as the Prophet ﷺ performed it. Make the intention in your heart and say Bismillah. Wash your hands three times. Rinse your mouth and nose three times. Wash your face three times. Wash your right arm, then your left, up to the elbows, three times. Wipe over your head once, and wipe your ears. Finally, wash your right foot, then your left, up to the ankles, three times. Do it in order, without long breaks.',
                checkpoint: true,
              },
              {
                kind: 'example',
                title: 'What Breaks Wudu',
                content:
                  'Once you have wudu, it stays until something breaks it. Things that break wudu include using the toilet, passing wind, deep sleep, and losing consciousness. If your wudu breaks, simply make it again before the next prayer. Many Muslims try to stay in a state of wudu throughout the day — a beautiful habit that keeps you ready for prayer and remembrance.',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  "Let's review: prayer is not accepted without purification. The Quran mentions four essential parts of wudu: washing the face, the arms to the elbows, wiping the head, and washing the feet. The Sunnah adds washing the hands, mouth, nose and ears, usually three times each. Wudu breaks by using the toilet, passing wind or deep sleep — and then we simply renew it.",
              },
            ],
            references: [
              {
                source_type: 'quran',
                citation: "Quran 5:6 (Surah Al-Ma'idah)",
                text: 'O you who have believed, when you rise to [perform] prayer, wash your faces and your forearms to the elbows and wipe over your heads and wash your feet to the ankles.',
                url: quran(5, '6'),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih Muslim 224',
                text: 'No prayer is accepted without purification, and no charity from ill-gotten wealth.',
                url: sunnah('muslim', 224),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 159',
                text: "Humran reported that he saw 'Uthman ibn 'Affan call for water and perform wudu — washing his hands, mouth, nose, face, arms, wiping his head and washing his feet — and then say he saw the Prophet ﷺ perform wudu like this.",
                url: sunnah('bukhari', 159),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih Muslim 244',
                text: 'When a Muslim servant washes his face in wudu, every sin he looked at with his eyes will be washed away from his face with the water, or with the last drop of water.',
                url: sunnah('muslim', 244),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'Which surah contains the verse describing wudu?',
                options: ["Al-Ma'idah", 'Al-Fatihah', 'Al-Ikhlas', 'Ya-Sin'],
                correct_answer: "Al-Ma'idah",
                explanation: "Quran 5:6 is in Surah Al-Ma'idah.",
                topic: 'Verse of wudu',
              },
              {
                type: 'mcq',
                prompt: 'Up to where do we wash our arms in wudu?',
                options: ['The elbows', 'The wrists', 'The shoulders', 'The fingertips'],
                correct_answer: 'The elbows',
                explanation: 'Quran 5:6 — "your forearms to the elbows".',
                topic: 'Steps of wudu',
              },
              {
                type: 'true_false',
                prompt: 'Deep sleep breaks wudu.',
                options: TF,
                correct_answer: 'True',
                explanation: 'Deep sleep is among the things that break wudu.',
                topic: 'What breaks wudu',
              },
              {
                type: 'short_answer',
                prompt: 'Name the four parts of wudu mentioned in the Quran.',
                correct_answer: 'Washing the face, washing the arms to the elbows, wiping the head, and washing the feet to the ankles.',
                explanation: 'These four are listed in Quran 5:6.',
                topic: 'Essentials of wudu',
              },
              {
                type: 'reflection',
                prompt: 'How does knowing that wudu washes away sins change the way you make it?',
                correct_answer: '',
                explanation: '',
                topic: 'Reflection on purity',
              },
            ],
          },
          {
            title: 'The Five Daily Prayers',
            description: 'The names, times and rak\'ahs of the five obligatory prayers.',
            objectives: [
              'Name the five daily prayers in order',
              "Know the number of rak'ahs in each prayer",
              'Understand the general time of each prayer',
            ],
            est_minutes: 11,
            segments: [
              {
                kind: 'intro',
                title: 'Prayers at Fixed Times',
                content:
                  'Allah says: "Indeed, prayer has been decreed upon the believers at specified times." Muslims pray five times a day, and each prayer has its own window of time, linked to the movement of the sun. This means our whole day is organised around meeting Allah — from before sunrise until the night.',
                checkpoint: true,
              },
              {
                kind: 'story',
                title: 'From Fifty to Five',
                content:
                  'During the Night Journey, Allah first made fifty prayers obligatory. On his way back, the Prophet ﷺ met Musa, who advised him to ask Allah to reduce them for his people. The Prophet ﷺ returned several times until they became five. Allah said they are five in number but fifty in reward. This shows Allah\'s mercy — five prayers, with the reward of fifty.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'The Five Prayers',
                content:
                  "Fajr is the dawn prayer, before sunrise — two rak'ahs. Dhuhr is just after the sun passes its highest point at midday — four rak'ahs. Asr is in the afternoon — four rak'ahs. Maghrib is just after sunset — three rak'ahs. Isha is at night, after the twilight disappears — four rak'ahs. Altogether that is seventeen obligatory rak'ahs every day. A rak'ah is one unit of prayer: standing, bowing, and prostrating twice.",
                checkpoint: true,
              },
              {
                kind: 'example',
                title: 'Planning Your Day',
                content:
                  "Here's a practical tip: look up the prayer times for your city — many apps and mosque timetables show them. Set gentle reminders on your phone. Try to pray each prayer early in its time: the Prophet ﷺ was asked which deed is most beloved to Allah, and he said: \"Prayer offered on time.\" Link prayers to your routine — Fajr before breakfast, Dhuhr at your lunch break, and so on.",
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  "In summary: prayers have fixed times. Allah reduced fifty prayers to five, with the reward of fifty. The five prayers are Fajr with two rak'ahs, Dhuhr with four, Asr with four, Maghrib with three, and Isha with four — seventeen rak'ahs a day. Praying on time is among the deeds most beloved to Allah, so plan your day around your prayers.",
              },
            ],
            references: [
              {
                source_type: 'quran',
                citation: 'Quran 4:103',
                arabic: 'إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَٰبًا مَّوْقُوتًا',
                text: 'Indeed, prayer has been decreed upon the believers a decree of specified times.',
                url: quran(4, '103'),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 349',
                text: 'The long hadith of the Mi\'raj, in which fifty prayers were reduced to five, and Allah said: "These are five prayers and they are all (equal to) fifty (in reward)."',
                url: sunnah('bukhari', 349),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 527',
                text: 'I asked the Prophet ﷺ: "Which deed is the dearest to Allah?" He replied: "To offer the prayers at their fixed times."',
                url: sunnah('bukhari', 527),
              },
              {
                source_type: 'quran',
                citation: 'Quran 11:114',
                text: 'And establish prayer at the two ends of the day and at the approach of the night. Indeed, good deeds do away with misdeeds.',
                url: quran(11, '114'),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: "How many rak'ahs is the Maghrib prayer?",
                options: ['2', '3', '4', '5'],
                correct_answer: '3',
                explanation: "Maghrib is the only obligatory prayer with three rak'ahs.",
                topic: "Rak'ahs of each prayer",
              },
              {
                type: 'mcq',
                prompt: 'Which prayer is prayed before sunrise?',
                options: ['Fajr', 'Dhuhr', 'Asr', 'Isha'],
                correct_answer: 'Fajr',
                explanation: 'Fajr is the dawn prayer, prayed before sunrise.',
                topic: 'Prayer times',
              },
              {
                type: 'true_false',
                prompt: 'Allah first prescribed fifty prayers, which were reduced to five.',
                options: TF,
                correct_answer: 'True',
                explanation: 'Sahih al-Bukhari 349 — five in number, fifty in reward.',
                topic: 'History of Salah',
              },
              {
                type: 'short_answer',
                prompt: "How many obligatory rak'ahs are prayed in total each day?",
                correct_answer: '17',
                explanation: '2 + 4 + 4 + 3 + 4 = 17.',
                topic: "Rak'ahs of each prayer",
              },
              {
                type: 'reflection',
                prompt: 'What is one reminder or habit you will use to pray on time?',
                correct_answer: '',
                explanation: '',
                topic: 'Praying on time',
              },
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────── SEERAH ──────────────────────────────
  {
    slug: 'seerah',
    title: 'Seerah',
    description: 'The life of Prophet Muhammad ﷺ — his character, his mission, and his example.',
    category: 'History',
    color: 'amber',
    modules: [
      {
        title: 'Early Life in Makkah',
        description: 'From the Year of the Elephant to the first revelation.',
        lessons: [
          {
            title: 'The Birth of the Prophet ﷺ',
            description: 'Arabia before Islam, the Year of the Elephant, and his childhood.',
            objectives: [
              'Describe Arabia before the Prophet ﷺ',
              'Know the story of the Year of the Elephant',
              'Recall key facts about his birth and childhood',
            ],
            est_minutes: 12,
            segments: [
              {
                kind: 'intro',
                title: 'Arabia Before Islam',
                content:
                  "Around one thousand four hundred years ago, Makkah was a busy trading town in the desert of Arabia. The Ka'bah, built by Prophet Ibrahim and his son Isma'il for the worship of Allah alone, was now surrounded by idols. People were known for their poetry, hospitality and courage, but also for tribal wars, injustice to the poor, and cruelty to girls. This time is called Jahiliyyah — the age of ignorance.",
                checkpoint: true,
              },
              {
                kind: 'story',
                title: 'The Year of the Elephant',
                content:
                  "In the year the Prophet ﷺ was born, a ruler named Abrahah marched on Makkah with an army and elephants to destroy the Ka'bah. The people of Makkah withdrew to the mountains. But Allah sent flocks of birds carrying small stones of baked clay, and the army was destroyed. Allah tells this story in Surah Al-Fil. That year became known as the Year of the Elephant, around 570 CE.",
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'His Birth',
                content:
                  'Muhammad ﷺ was born in Makkah into the respected tribe of Quraysh, in the clan of Banu Hashim. When the Prophet ﷺ was asked about fasting on Mondays, he said: "That is the day on which I was born." His father, Abdullah, died before he was born. His mother was Aminah. His grandfather, Abd al-Muttalib, named him Muhammad — "the praised one".',
                checkpoint: true,
              },
              {
                kind: 'story',
                title: 'An Orphan in Allah\'s Care',
                content:
                  'As was the custom, the baby Muhammad ﷺ was sent to the desert to be nursed by Halimah as-Sa\'diyyah, where he grew strong and learned pure Arabic. When he was six, his mother Aminah died. His grandfather cared for him until he passed away two years later, and then his uncle Abu Talib raised him. Allah later reminded him: "Did He not find you an orphan and give you refuge?"',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  "To summarise: before Islam, Arabia was in the age of ignorance and the Ka'bah was filled with idols. In the Year of the Elephant, Allah protected the Ka'bah from Abrahah's army. That same year, Muhammad ﷺ was born in Makkah on a Monday. He lost his father before birth and his mother at six, and was raised by his grandfather and then his uncle Abu Talib — always under Allah's care.",
              },
            ],
            references: [
              {
                source_type: 'quran',
                citation: 'Quran 105:1-5 (Surah Al-Fil)',
                text: 'Have you not considered how your Lord dealt with the companions of the elephant? Did He not make their plan into misguidance? And He sent against them birds in flocks, striking them with stones of hard clay, and He made them like eaten straw.',
                url: quran(105),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih Muslim 1162',
                text: 'The Messenger of Allah ﷺ was asked about fasting on Monday, and he said: "That is the day on which I was born and on which revelation came to me."',
                url: sunnah('muslim', 1162),
              },
              {
                source_type: 'quran',
                citation: 'Quran 93:6',
                arabic: 'أَلَمْ يَجِدْكَ يَتِيمًا فَـَٔاوَىٰ',
                text: 'Did He not find you an orphan and give [you] refuge?',
                url: quran(93, '6'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 2:127',
                text: 'And [mention] when Abraham was raising the foundations of the House and [with him] Ishmael, [saying], "Our Lord, accept [this] from us."',
                url: quran(2, '127'),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'Why is it called the "Year of the Elephant"?',
                options: [
                  "Abrahah's army marched on Makkah with elephants",
                  'A famous elephant lived in Makkah',
                  'A trade caravan brought elephants',
                  'It was named after a poem',
                ],
                correct_answer: "Abrahah's army marched on Makkah with elephants",
                explanation: "Abrahah came with elephants to destroy the Ka'bah (Surah Al-Fil).",
                topic: 'Year of the Elephant',
              },
              {
                type: 'mcq',
                prompt: 'Who raised the Prophet ﷺ after his grandfather died?',
                options: ['Abu Talib', 'Abu Lahab', 'Abdullah', 'Halimah'],
                correct_answer: 'Abu Talib',
                explanation: 'His uncle Abu Talib raised and protected him.',
                topic: 'Childhood of the Prophet ﷺ',
              },
              {
                type: 'true_false',
                prompt: 'The Prophet ﷺ was born on a Monday.',
                options: TF,
                correct_answer: 'True',
                explanation: 'Sahih Muslim 1162 — "That is the day on which I was born."',
                topic: 'Birth of the Prophet ﷺ',
              },
              {
                type: 'short_answer',
                prompt: 'Which surah tells the story of the army of the elephant?',
                correct_answer: 'Surah Al-Fil (chapter 105)',
                explanation: 'Surah Al-Fil, the 105th chapter of the Quran.',
                topic: 'Year of the Elephant',
              },
              {
                type: 'reflection',
                prompt: 'The Prophet ﷺ grew up as an orphan. What does his story teach us about how we should treat orphans?',
                correct_answer: '',
                explanation: '',
                topic: 'Caring for orphans',
              },
            ],
          },
          {
            title: 'Al-Amin: The Trustworthy',
            description: 'His character before prophethood, the Black Stone, and marriage to Khadijah.',
            objectives: [
              "Describe the Prophet's character before prophethood",
              'Tell the story of the Black Stone',
              'Know about his marriage to Khadijah',
            ],
            est_minutes: 11,
            segments: [
              {
                kind: 'intro',
                title: 'A Young Shepherd',
                content:
                  'As a young man, Muhammad ﷺ worked as a shepherd, looking after sheep for the people of Makkah. He later said that every prophet sent by Allah had shepherded sheep. Caring for a flock teaches patience, responsibility and gentleness — the very qualities needed to guide people.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'Al-Amin',
                content:
                  'Even before he became a prophet, the people of Makkah called Muhammad ﷺ "Al-Amin" — the Trustworthy — and "As-Sadiq" — the Truthful. People left their valuables with him for safekeeping. He never lied, never worshipped idols, and was known for keeping his promises and helping the weak. Allah later praised him: "And indeed, you are of a great moral character."',
                checkpoint: true,
              },
              {
                kind: 'story',
                title: 'The Black Stone',
                content:
                  "When the Prophet ﷺ was about thirty-five, the Quraysh rebuilt the Ka'bah. When it was time to put the Black Stone back in place, the tribes argued over who would have the honour, and a fight nearly broke out. They agreed that the next man to enter would judge — and it was Muhammad ﷺ. He placed the stone on a cloth, asked a leader from each tribe to lift a corner, and then set it in place himself. Everyone was satisfied.",
                checkpoint: true,
              },
              {
                kind: 'story',
                title: 'Marriage to Khadijah',
                content:
                  'Khadijah bint Khuwaylid was a noble and successful businesswoman. She hired Muhammad ﷺ to lead her trade caravan to Syria and was impressed by his honesty and character. She proposed marriage, and they married when he was about twenty-five. Khadijah became his greatest supporter, and later the first person to believe in his message.',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  'In summary: the Prophet ﷺ worked as a shepherd, learning patience and care. He was known as Al-Amin, the Trustworthy, long before revelation. He wisely solved the dispute over the Black Stone, bringing the tribes together. He married Khadijah, who loved and supported him. His character is our example — Allah calls him "an excellent example" for us to follow.',
              },
            ],
            references: [
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 2262',
                text: 'The Prophet ﷺ said: "Allah did not send any prophet but that he shepherded sheep." His companions asked: "Did you do the same?" He said: "Yes, I used to shepherd them for the people of Makkah for some qirats."',
                url: sunnah('bukhari', 2262),
              },
              {
                source_type: 'quran',
                citation: 'Quran 68:4',
                arabic: 'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ',
                text: 'And indeed, you are of a great moral character.',
                url: quran(68, '4'),
              },
              {
                source_type: 'quran',
                citation: 'Quran 33:21',
                text: 'There has certainly been for you in the Messenger of Allah an excellent pattern for anyone whose hope is in Allah and the Last Day and [who] remembers Allah often.',
                url: quran(33, '21'),
              },
              {
                source_type: 'book',
                citation: 'Ibn Hisham, As-Sirah an-Nabawiyyah',
                text: "The classical biography of the Prophet ﷺ records the rebuilding of the Ka'bah and his placing of the Black Stone on a cloth carried by all the clans.",
                url: null,
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'What title did the people of Makkah give Muhammad ﷺ before prophethood?',
                options: ['Al-Amin (the Trustworthy)', 'Al-Faruq', 'Dhun-Nurayn', 'Sayf Allah'],
                correct_answer: 'Al-Amin (the Trustworthy)',
                explanation: 'He was known as Al-Amin and As-Sadiq long before revelation.',
                topic: 'Character of the Prophet ﷺ',
              },
              {
                type: 'mcq',
                prompt: 'How did the Prophet ﷺ solve the Black Stone dispute?',
                options: [
                  'He put the stone on a cloth and had every tribe lift it together',
                  'He chose the strongest tribe',
                  'He asked them to draw lots',
                  'He postponed the decision',
                ],
                correct_answer: 'He put the stone on a cloth and had every tribe lift it together',
                explanation: 'Every clan shared the honour, and he placed the stone himself.',
                topic: 'The Black Stone',
              },
              {
                type: 'true_false',
                prompt: "Khadijah was the first person to believe in the Prophet's message.",
                options: TF,
                correct_answer: 'True',
                explanation: 'Khadijah was the first to accept Islam.',
                topic: 'Khadijah',
              },
              {
                type: 'short_answer',
                prompt: 'What work did the Prophet ﷺ do as a young man, like other prophets before him?',
                correct_answer: 'He was a shepherd — he looked after sheep.',
                explanation: 'Sahih al-Bukhari 2262 — every prophet shepherded sheep.',
                topic: 'Early life',
              },
              {
                type: 'reflection',
                prompt: 'Which quality of Al-Amin would you like to build in yourself, and how?',
                correct_answer: '',
                explanation: '',
                topic: 'Following his character',
              },
            ],
          },
          {
            title: 'The First Revelation',
            description: 'Cave Hira, the first verses of the Quran, and Khadijah\'s support.',
            objectives: [
              "Describe the Prophet's retreats in the Cave of Hira",
              'Recall the first verses revealed',
              "Explain Khadijah's role in supporting him",
            ],
            est_minutes: 12,
            segments: [
              {
                kind: 'intro',
                title: 'The Cave of Hira',
                content:
                  'As he approached forty, the Prophet ﷺ began to love seclusion. He would go to the Cave of Hira on the Mountain of Light near Makkah, taking food with him, and spend days reflecting and worshipping. He was troubled by the idol worship and injustice around him. Before revelation began, he would see true dreams that came to pass like the light of dawn.',
                checkpoint: true,
              },
              {
                kind: 'story',
                title: '"Read!"',
                content:
                  'One night in Ramadan, when he was forty, the angel Jibril came to him in the cave and said: "Read!" The Prophet ﷺ replied: "I am not a reader." Jibril embraced him tightly and repeated the command three times. Then he recited the first verses ever revealed: "Read in the name of your Lord who created — created man from a clinging substance. Read, and your Lord is the Most Generous — who taught by the pen, taught man that which he knew not."',
                checkpoint: true,
              },
              {
                kind: 'story',
                title: "Khadijah's Comfort",
                content:
                  'The Prophet ﷺ returned home trembling and said: "Cover me, cover me!" When he told Khadijah what had happened, she comforted him: "By Allah, Allah will never disgrace you. You keep good relations with your family, help the weak, serve your guests generously, and assist those struck by hardship." She then took him to her cousin Waraqah ibn Nawfal, a scholar of the earlier scriptures, who told him this was the same angel that had come to Musa.',
                checkpoint: true,
              },
              {
                kind: 'teaching',
                title: 'Lessons from the First Revelation',
                content:
                  'The very first word revealed was "Read" — showing how much Islam values knowledge. The verses remind us that Allah is our Creator and the best Teacher, who "taught by the pen". We also learn from Khadijah: when someone we love is afraid, we support them with kind words and remind them of their good deeds. And we learn that even the Prophet ﷺ felt fear, yet Allah gave him strength.',
                checkpoint: true,
              },
              {
                kind: 'summary',
                title: 'Summary',
                content:
                  'In summary: the Prophet ﷺ used to reflect in the Cave of Hira. At forty, in Ramadan, Jibril brought the first revelation: the opening verses of Surah Al-\'Alaq, beginning with "Read". Khadijah comforted him by reminding him of his good character, and Waraqah confirmed that this was the angel sent to Musa. This was the beginning of his prophethood and the message of Islam.',
              },
            ],
            references: [
              {
                source_type: 'quran',
                citation: "Quran 96:1-5 (Surah Al-'Alaq)",
                arabic: 'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ',
                text: 'Recite in the name of your Lord who created — created man from a clinging substance. Recite, and your Lord is the most Generous — who taught by the pen — taught man that which he knew not.',
                url: quran(96, '1-5'),
              },
              {
                source_type: 'hadith',
                citation: 'Sahih al-Bukhari 3',
                text: "Aishah narrated how revelation began with true dreams, the Prophet's seclusion in Hira, Jibril's command \"Read!\", Khadijah's words of comfort, and Waraqah ibn Nawfal's confirmation that it was the angel sent to Moses.",
                url: sunnah('bukhari', 3),
              },
              {
                source_type: 'quran',
                citation: 'Quran 2:185',
                text: 'The month of Ramadan [is that] in which was revealed the Quran, a guidance for the people.',
                url: quran(2, '185'),
              },
            ],
            questions: [
              {
                type: 'mcq',
                prompt: 'What was the first word of the Quran revealed?',
                options: ["Read (Iqra')", 'Pray', 'Say', 'Praise'],
                correct_answer: "Read (Iqra')",
                explanation: "Surah Al-'Alaq begins: \"Read in the name of your Lord who created.\"",
                topic: 'First revelation',
              },
              {
                type: 'mcq',
                prompt: 'Where did the first revelation come to the Prophet ﷺ?',
                options: ['The Cave of Hira', 'The Cave of Thawr', "The Ka'bah", 'Madinah'],
                correct_answer: 'The Cave of Hira',
                explanation: 'He was worshipping in the Cave of Hira on the Mountain of Light.',
                topic: 'Cave of Hira',
              },
              {
                type: 'true_false',
                prompt: 'The Prophet ﷺ was forty years old when revelation began.',
                options: TF,
                correct_answer: 'True',
                explanation: 'Revelation began when he was forty.',
                topic: 'First revelation',
              },
              {
                type: 'short_answer',
                prompt: 'Who comforted the Prophet ﷺ when he returned home after the first revelation?',
                correct_answer: 'Khadijah, his wife',
                explanation: 'Sahih al-Bukhari 3 — Khadijah reminded him of his good character.',
                topic: 'Khadijah',
              },
              {
                type: 'reflection',
                prompt: 'The first command revealed was "Read". What is one thing you will do to keep learning about Islam?',
                correct_answer: '',
                explanation: '',
                topic: 'Seeking knowledge',
              },
            ],
          },
        ],
      },
    ],
  },
]
