import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import mongoose, { Types } from 'mongoose'
import { EdgeTTS } from 'node-edge-tts'
import { Language, Grade, Unit, Chapter, Section, ContentBlock } from './models/index.js'

type ObjectId = Types.ObjectId

type WordData = {
  tamil: string
  roman: string
  meaning: string
  emoji: string
  wikiTitle?: string
}

type LetterData = {
  letter: string
  transliteration: string
  wikimediaAudio?: string
  words: WordData[]
}

type BasicWord = {
  tamil: string
  roman: string
  meaning: string
  emoji: string
  wikiTitle?: string
}

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL  = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
const AUDIO_DIR = path.join(process.cwd(), 'uploads', 'audio')
const IMAGE_DIR = path.join(process.cwd(), 'uploads', 'images')
const WIKI_UA   = 'LearnTamilEasy/1.0 (https://github.com/learntamileasy; contact@learntamileasy.com) Node.js'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const safe  = (s: string)  => s.replace(/[^a-z0-9]/gi, '_').toLowerCase()

const tts = new EdgeTTS({ voice: 'ta-IN-PallaviNeural', lang: 'ta-IN', rate: '-10%' })

async function fetchWithRetry(url: string, opts: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, opts)
    if (res.status === 429) {
      const wait = 2000 * (i + 1)
      process.stdout.write(`  ↺ 429 on ${url.slice(0, 60)}... retrying in ${wait}ms\n`)
      await sleep(wait)
      continue
    }
    return res
  }
  throw new Error('429 — max retries exceeded')
}

// ── Download helpers ──────────────────────────────────────────────────────────

async function downloadAudio(tamilText: string, filename: string): Promise<string | undefined> {
  await fs.mkdir(AUDIO_DIR, { recursive: true })
  const dest = path.join(AUDIO_DIR, filename)
  try { await fs.access(dest); return `${BASE_URL}/uploads/audio/${filename}` } catch {}

  try {
    await tts.ttsPromise(tamilText, dest)
    await sleep(200)
    return `${BASE_URL}/uploads/audio/${filename}`
  } catch (e) {
    process.stdout.write(`  ⚠ audio failed for "${tamilText}": ${e}\n`)
    return undefined
  }
}

async function downloadWikiImage(wikiTitle: string, filename: string): Promise<string | undefined> {
  await fs.mkdir(IMAGE_DIR, { recursive: true })
  const dest = path.join(IMAGE_DIR, filename)
  try { await fs.access(dest); return `${BASE_URL}/uploads/images/${filename}` } catch {}

  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&format=json&pithumbsize=400`
    const apiRes = await fetchWithRetry(apiUrl, { headers: { 'User-Agent': WIKI_UA } })
    if (!apiRes.ok) throw new Error(`api ${apiRes.status}`)
    const json  = await apiRes.json() as Record<string, unknown>
    const pages = (json.query as Record<string, unknown>)?.pages as Record<string, unknown>
    const page  = Object.values(pages ?? {})[0] as Record<string, unknown>
    const thumbUrl = (page?.thumbnail as Record<string, string>)?.source
    if (!thumbUrl) throw new Error('no thumbnail')
    await sleep(1000)
    const imgRes = await fetchWithRetry(thumbUrl, { headers: { 'User-Agent': WIKI_UA } })
    if (!imgRes.ok) throw new Error(`image ${imgRes.status}`)
    await fs.writeFile(dest, Buffer.from(await imgRes.arrayBuffer()))
    await sleep(1000)
    return `${BASE_URL}/uploads/images/${filename}`
  } catch (e) {
    process.stdout.write(`  ⚠ image failed for "${wikiTitle}": ${e}\n`)
    return undefined
  }
}

async function downloadRemoteAudio(remoteUrl: string, filename: string): Promise<string | undefined> {
  await fs.mkdir(AUDIO_DIR, { recursive: true })
  const dest = path.join(AUDIO_DIR, filename)
  try { await fs.access(dest); return `${BASE_URL}/uploads/audio/${filename}` } catch {}

  try {
    const res = await fetchWithRetry(remoteUrl, { headers: { 'User-Agent': WIKI_UA } })
    if (!res.ok) throw new Error(`${res.status}`)
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
    await sleep(800)
    return `${BASE_URL}/uploads/audio/${filename}`
  } catch (e) {
    process.stdout.write(`  ⚠ remote audio failed "${remoteUrl}": ${e}\n`)
    return undefined
  }
}

// ── Vowel data ────────────────────────────────────────────────────────────────

const VOWELS: LetterData[] = [
  {
    letter: 'அ', transliteration: 'ah',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Ta-%E0%AE%85.ogg',
    words: [
      { tamil: 'அம்மா',  roman: 'amma',   meaning: 'mother',       emoji: '👩',  wikiTitle: 'Mother' },
      { tamil: 'அப்பா',  roman: 'appa',   meaning: 'father',       emoji: '👨',  wikiTitle: 'Father' },
      { tamil: 'அணில்',  roman: 'anil',   meaning: 'squirrel',     emoji: '🐿️', wikiTitle: 'Squirrel' },
      { tamil: 'அக்கா',  roman: 'akka',   meaning: 'elder sister', emoji: '👧' },
      { tamil: 'அரிசி',  roman: 'arisi',  meaning: 'rice',         emoji: '🍚',  wikiTitle: 'Rice' },
      { tamil: 'அரசன்', roman: 'arasan', meaning: 'king',         emoji: '👑',  wikiTitle: 'King' },
    ],
  },
  {
    letter: 'ஆ', transliteration: 'aah',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Ta-%E0%AE%86.ogg',
    words: [
      { tamil: 'ஆடு',      roman: 'aadu',     meaning: 'goat',    emoji: '🐐',  wikiTitle: 'Goat' },
      { tamil: 'ஆமை',     roman: 'aamai',    meaning: 'tortoise', emoji: '🐢', wikiTitle: 'Turtle' },
      { tamil: 'ஆப்பிள்', roman: 'aappil',   meaning: 'apple',   emoji: '🍎',  wikiTitle: 'Apple' },
      { tamil: 'ஆரஞ்சு',  roman: 'aaranchu', meaning: 'orange',  emoji: '🍊',  wikiTitle: 'Orange (fruit)' },
      { tamil: 'ஆகாயம்', roman: 'aakaayam', meaning: 'sky',     emoji: '🌤️', wikiTitle: 'Sky' },
      { tamil: 'ஆறு',      roman: 'aaru',     meaning: 'river',   emoji: '🌊',  wikiTitle: 'River' },
    ],
  },
  {
    letter: 'இ', transliteration: 'e',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Ta-%E0%AE%87.ogg',
    words: [
      { tamil: 'இலை',     roman: 'elai',    meaning: 'leaf',   emoji: '🍃', wikiTitle: 'Leaf' },
      { tamil: 'இரண்டு', roman: 'erandu',  meaning: 'two',    emoji: '2️⃣' },
      { tamil: 'இஞ்சி',  roman: 'enji',    meaning: 'ginger', emoji: '🫚',  wikiTitle: 'Ginger' },
      { tamil: 'இரவு',    roman: 'eravu',   meaning: 'night',  emoji: '🌙',  wikiTitle: 'Night' },
      { tamil: 'இறால்',  roman: 'eraal',   meaning: 'prawn',  emoji: '🦐',  wikiTitle: 'Prawn' },
      { tamil: 'இதயம்',  roman: 'edhayam', meaning: 'heart',  emoji: '❤️',  wikiTitle: 'Heart' },
    ],
  },
  {
    letter: 'ஈ', transliteration: 'ee',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Ta-%E0%AE%88.ogg',
    words: [
      { tamil: 'ஈ',       roman: 'ee',     meaning: 'fly',        emoji: '🪰', wikiTitle: 'Housefly' },
      { tamil: 'ஈரம்',   roman: 'eeram',  meaning: 'moisture',   emoji: '💧' },
      { tamil: 'ஈட்டி',  roman: 'eeti',   meaning: 'spear',      emoji: '🏹' },
      { tamil: 'ஈசல்',   roman: 'eesal',  meaning: 'termite',    emoji: '🐛', wikiTitle: 'Termite' },
      { tamil: 'ஈகை',    roman: 'eekai',  meaning: 'generosity', emoji: '🤝', wikiTitle: 'Soup kitchen' },
    ],
  },
  {
    letter: 'உ', transliteration: 'u',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Ta-%E0%AE%89.ogg',
    words: [
      { tamil: 'உலகம்',  roman: 'ulagam',  meaning: 'world',  emoji: '🌍', wikiTitle: 'Earth' },
      { tamil: 'உடல்',   roman: 'udal',    meaning: 'body',   emoji: '🧍', wikiTitle: 'Human body' },
      { tamil: 'உதடு',   roman: 'uthadu',  meaning: 'lip',    emoji: '👄' },
      { tamil: 'உரல்',   roman: 'ural',    meaning: 'mortar', emoji: '🪨', wikiTitle: 'Mortar and pestle' },
      { tamil: 'உணவு',   roman: 'unavu',   meaning: 'food',   emoji: '🍱', wikiTitle: 'Food' },
      { tamil: 'உழவன்', roman: 'uzhavan', meaning: 'farmer', emoji: '🌾', wikiTitle: 'Farmer' },
    ],
  },
  {
    letter: 'ஊ', transliteration: 'uu',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Ta-%E0%AE%8A.ogg',
    words: [
      { tamil: 'ஊஞ்சல்', roman: 'uunjal', meaning: 'swing',   emoji: '🎢', wikiTitle: 'Swing (seat)' },
      { tamil: 'ஊசி',    roman: 'oosi',   meaning: 'needle',  emoji: '🪡', wikiTitle: 'Sewing needle' },
      { tamil: 'ஊதல்',   roman: 'oothal', meaning: 'blowing', emoji: '💨' },
      { tamil: 'ஊர்',    roman: 'uur',    meaning: 'town',    emoji: '🏘️', wikiTitle: 'Village' },
      { tamil: 'ஊக்கம்', roman: 'uukkam', meaning: 'motivation/encouragement', emoji: '💪' },
    ],
  },
  {
    letter: 'எ', transliteration: 'eh',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Ta-%E0%AE%8E.ogg',
    words: [
      { tamil: 'எறும்பு',    roman: 'erumbu',    meaning: 'ant',   emoji: '🐜', wikiTitle: 'Ant' },
      { tamil: 'எலுமிச்சை', roman: 'elumichai', meaning: 'lemon', emoji: '🍋', wikiTitle: 'Lemon' },
      { tamil: 'எட்டு',      roman: 'ettu',      meaning: 'eight', emoji: '8️⃣' },
      { tamil: 'எலி',        roman: 'eli',       meaning: 'rat',   emoji: '🐭', wikiTitle: 'Rat' },
      { tamil: 'எருது',      roman: 'erudu',     meaning: 'bull',  emoji: '🐂', wikiTitle: 'Bull' },
    ],
  },
  {
    letter: 'ஏ', transliteration: 'eeh',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Ta-%E0%AE%8F.ogg',
    words: [
      { tamil: 'ஏணி',  roman: 'eeni',  meaning: 'ladder', emoji: '🪜', wikiTitle: 'Ladder' },
      { tamil: 'ஏழு',  roman: 'eezhu', meaning: 'seven',  emoji: '7️⃣' },
      { tamil: 'ஏரு',  roman: 'earu',  meaning: 'plough', emoji: '🔧', wikiTitle: 'Plough' },
      { tamil: 'ஏரி',  roman: 'eari',  meaning: 'lake',   emoji: '🏞️', wikiTitle: 'Lake' },
      { tamil: 'ஏடு',  roman: 'eedu',  meaning: 'book',   emoji: '📖', wikiTitle: 'Book' },
    ],
  },
  {
    letter: 'ஐ', transliteration: 'ai',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Ta-%E0%AE%90.ogg',
    words: [
      { tamil: 'ஐந்து',   roman: 'aindhu',  meaning: 'five',        emoji: '5️⃣' },
      { tamil: 'ஐம்பது', roman: 'aimbadu', meaning: 'fifty',       emoji: '🔢' },
      { tamil: 'ஐவர்',   roman: 'iyvar',   meaning: 'five people', emoji: '👨‍👩‍👧‍👦' },
      { tamil: 'ஐயம்',   roman: 'aiyam',   meaning: 'doubt',       emoji: '🤔' },
    ],
  },
  {
    letter: 'ஒ', transliteration: 'o',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Ta-%E0%AE%92.ogg',
    words: [
      { tamil: 'ஒன்று',    roman: 'ondru',   meaning: 'one',   emoji: '1️⃣' },
      { tamil: 'ஒன்பது',  roman: 'onbathu', meaning: 'nine',  emoji: '9️⃣' },
      { tamil: 'ஒட்டகம்', roman: 'ottakam', meaning: 'camel', emoji: '🐪', wikiTitle: 'Dromedary' },
      { tamil: 'ஒளி',      roman: 'oli',     meaning: 'light', emoji: '💡', wikiTitle: 'Light' },
    ],
  },
  {
    letter: 'ஓ', transliteration: 'oo',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Ta-%E0%AE%93.ogg',
    words: [
      { tamil: 'ஓணான்', roman: 'oonaan',  meaning: 'lizard',  emoji: '🦎', wikiTitle: 'Lizard' },
      { tamil: 'ஓடம்',  roman: 'oodam',   meaning: 'boat',    emoji: '⛵', wikiTitle: 'Boat' },
      { tamil: 'ஓடு',   roman: 'oodu',    meaning: 'running', emoji: '🏃' },
      { tamil: 'ஓடை',   roman: 'oodai',   meaning: 'stream',  emoji: '🌊', wikiTitle: 'Stream' },
    ],
  },
  {
    letter: 'ஔ', transliteration: 'au',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Ta-%E0%AE%94.ogg',
    words: [
      { tamil: 'ஔவையார்', roman: 'avayar',    meaning: 'Avvaiyar', emoji: '📜' },
      { tamil: 'ஔஷதம்',  roman: 'avudatham', meaning: 'medicine', emoji: '💊', wikiTitle: 'Medicine' },
    ],
  },
]

// ── Consonant data ────────────────────────────────────────────────────────────

const CONSONANTS: LetterData[] = [
  {
    letter: 'க்', transliteration: 'ik',
    words: [
      { tamil: 'சக்கரம்',  roman: 'sakkaram', meaning: 'wheel',        emoji: '⚙️', wikiTitle: 'Wheel' },
      { tamil: 'அக்கா',    roman: 'akka',      meaning: 'elder sister', emoji: '👧' },
      { tamil: 'தக்காளி', roman: 'thakkali',  meaning: 'tomato',       emoji: '🍅', wikiTitle: 'Tomato' },
    ],
  },
  {
    letter: 'ங்', transliteration: 'ing',
    words: [
      { tamil: 'சிங்கம்',    roman: 'singam',   meaning: 'lion',  emoji: '🦁', wikiTitle: 'Lion' },
      { tamil: 'வெங்காயம்', roman: 'vengayam', meaning: 'onion', emoji: '🧅', wikiTitle: 'Onion' },
      { tamil: 'தங்கம்',    roman: 'thangam',  meaning: 'gold',  emoji: '🥇', wikiTitle: 'Gold' },
    ],
  },
  {
    letter: 'ச்', transliteration: 'ich',
    words: [
      { tamil: 'எலுமிச்சை', roman: 'elumichai', meaning: 'lemon',     emoji: '🍋', wikiTitle: 'Lemon' },
      { tamil: 'தச்சர்',    roman: 'thachar',   meaning: 'carpenter', emoji: '🪚' },
      { tamil: 'பச்சை',     roman: 'pachai',    meaning: 'green',     emoji: '🟢' },
    ],
  },
  {
    letter: 'ஞ்', transliteration: 'inj',
    words: [
      { tamil: 'பஞ்சு',    roman: 'panju',  meaning: 'cotton',   emoji: '🌸', wikiTitle: 'Cotton' },
      { tamil: 'ஊஞ்சல்', roman: 'uunjal', meaning: 'swing',    emoji: '🎢', wikiTitle: 'Swing (seat)' },
      { tamil: 'மஞ்சள்',  roman: 'manjal', meaning: 'turmeric', emoji: '🟡', wikiTitle: 'Turmeric' },
    ],
  },
  {
    letter: 'ட்', transliteration: 'itt',
    words: [
      { tamil: 'பட்டம்', roman: 'pattam', meaning: 'kite',   emoji: '🪁', wikiTitle: 'Fighter kite' },
      { tamil: 'தட்டு',  roman: 'thattu', meaning: 'plate',  emoji: '🍽️', wikiTitle: 'Ceramic plate' },
      { tamil: 'வட்டம்', roman: 'vattam', meaning: 'circle', emoji: '⭕' },
    ],
  },
  {
    letter: 'ண்', transliteration: 'inn (soft)',
    words: [
      { tamil: 'கண்', roman: 'kann', meaning: 'eye',  emoji: '👁️', wikiTitle: 'Eye' },
      { tamil: 'மண்', roman: 'mann', meaning: 'soil', emoji: '🟫',  wikiTitle: 'Soil' },
      { tamil: 'ஆண்', roman: 'aan',  meaning: 'male', emoji: '👨' },
    ],
  },
  {
    letter: 'த்', transliteration: 'ith',
    words: [
      { tamil: 'கத்தி',  roman: 'kathi',  meaning: 'knife',       emoji: '🔪', wikiTitle: 'Knife' },
      { tamil: 'தாத்தா', roman: 'thatha', meaning: 'grandfather', emoji: '👴' },
      { tamil: 'நத்தை', roman: 'nathai',  meaning: 'snail',       emoji: '🐌', wikiTitle: 'Snail' },
    ],
  },
  {
    letter: 'ந்', transliteration: 'inth',
    words: [
      { tamil: 'பந்து',    roman: 'panthu',   meaning: 'ball',  emoji: '⚽', wikiTitle: 'Ball' },
      { tamil: 'விருந்து', roman: 'virunthu', meaning: 'feast', emoji: '🍽️' },
      { tamil: 'தந்தம்',  roman: 'thantham', meaning: 'tusk',  emoji: '🐘', wikiTitle: 'Ivory' },
    ],
  },
  {
    letter: 'ப்', transliteration: 'ipp',
    words: [
      { tamil: 'அப்பா',  roman: 'appa',   meaning: 'father', emoji: '👨', wikiTitle: 'Father' },
      { tamil: 'கப்பல்', roman: 'kappal', meaning: 'ship',   emoji: '🚢', wikiTitle: 'Ship' },
      { tamil: 'பாப்பா', roman: 'paapa',  meaning: 'baby',   emoji: '👶' },
    ],
  },
  {
    letter: 'ம்', transliteration: 'imm',
    words: [
      { tamil: 'அம்மா', roman: 'amma',   meaning: 'mother', emoji: '👩', wikiTitle: 'Mother' },
      { tamil: 'மரம்',  roman: 'maram',  meaning: 'tree',   emoji: '🌳', wikiTitle: 'Tree' },
      { tamil: 'பழம்',  roman: 'pazham', meaning: 'fruit',  emoji: '🍎', wikiTitle: 'Fruit' },
    ],
  },
  {
    letter: 'ய்', transliteration: 'iyy',
    words: [
      { tamil: 'பை',   roman: 'pai',  meaning: 'bag',   emoji: '👜' },
      { tamil: 'நாய்', roman: 'naai', meaning: 'dog',   emoji: '🐕', wikiTitle: 'Dog' },
      { tamil: 'வாய்', roman: 'vaai', meaning: 'mouth', emoji: '👄', wikiTitle: 'Mouth' },
    ],
  },
  {
    letter: 'ர்', transliteration: 'irr (soft)',
    words: [
      { tamil: 'சர்க்கரை', roman: 'sarkarai', meaning: 'sugar',   emoji: '🍬', wikiTitle: 'Sugar' },
      { tamil: 'மலர்',      roman: 'malar',    meaning: 'flower',  emoji: '🌺', wikiTitle: 'Flower' },
      { tamil: 'தேர்',      roman: 'ther',     meaning: 'chariot', emoji: '🏎️', wikiTitle: 'Chariot' },
    ],
  },
  {
    letter: 'ல்', transliteration: 'ill (soft)',
    words: [
      { tamil: 'கல்',  roman: 'kal',   meaning: 'stone', emoji: '🪨', wikiTitle: 'Rock' },
      { tamil: 'கால்', roman: 'kaal',  meaning: 'leg',   emoji: '🦵', wikiTitle: 'Leg' },
      { tamil: 'கடல்', roman: 'kadal', meaning: 'sea',   emoji: '🌊', wikiTitle: 'Sea' },
    ],
  },
  {
    letter: 'வ்', transliteration: 'ivv',
    words: [
      { tamil: 'செவ்வாய்',  roman: 'sevvai',   meaning: 'Tuesday',  emoji: '🔴', wikiTitle: 'Tuesday' },
      { tamil: 'செவ்வகம்', roman: 'sevvagam', meaning: 'rectangle', emoji: '📐' },
      { tamil: 'அவ்வை',    roman: 'avvai',    meaning: 'Avvaiyar', emoji: '📜' },
    ],
  },
  {
    letter: 'ழ்', transliteration: 'izh',
    words: [
      { tamil: 'தமிழ்',    roman: 'thamizh',  meaning: 'Tamil',    emoji: '📜' },
      { tamil: 'யாழ்',     roman: 'yaazh',    meaning: 'lute',     emoji: '🎸', wikiTitle: 'Lute' },
      { tamil: 'வாழ்த்து', roman: 'vaazhthu', meaning: 'blessing', emoji: '🙏' },
    ],
  },
  {
    letter: 'ள்', transliteration: 'ill (hard)',
    words: [
      { tamil: 'பள்ளி',  roman: 'palli',  meaning: 'school',   emoji: '🏫', wikiTitle: 'School' },
      { tamil: 'மஞ்சள்', roman: 'manjal', meaning: 'turmeric', emoji: '🟡', wikiTitle: 'Turmeric' },
      { tamil: 'பொருள்', roman: 'porul',  meaning: 'meaning',  emoji: '💡' },
    ],
  },
  {
    letter: 'ற்', transliteration: 'irr (hard)',
    words: [
      { tamil: 'நாற்காலி', roman: 'naarkali',  meaning: 'chair',   emoji: '🪑', wikiTitle: 'Chair' },
      { tamil: 'நாற்பது',  roman: 'naarpathu', meaning: 'forty',   emoji: '🔢' },
      { tamil: 'புற்று',   roman: 'putru',     meaning: 'anthill', emoji: '🐜' },
    ],
  },
  {
    letter: 'ன்', transliteration: 'inn (hard)',
    words: [
      { tamil: 'மான்', roman: 'maan', meaning: 'deer', emoji: '🦌', wikiTitle: 'Deer' },
      { tamil: 'மீன்', roman: 'meen', meaning: 'fish', emoji: '🐟', wikiTitle: 'Fish' },
      { tamil: 'நான்', roman: 'naan', meaning: 'I/me', emoji: '👤' },
    ],
  },
]

// ── Basic word chapter data ───────────────────────────────────────────────────

const ANIMALS: BasicWord[] = [
  { tamil: 'நாய்',    roman: 'naai',    meaning: 'dog',      emoji: '🐕', wikiTitle: 'Dog' },
  { tamil: 'பூனை',   roman: 'poonai',  meaning: 'cat',      emoji: '🐱', wikiTitle: 'Cat' },
  { tamil: 'யானை',   roman: 'yaanai',  meaning: 'elephant', emoji: '🐘', wikiTitle: 'Asian elephant' },
  { tamil: 'குரங்கு', roman: 'kurangu', meaning: 'monkey',   emoji: '🐒', wikiTitle: 'Monkey' },
  { tamil: 'புலி',    roman: 'puli',    meaning: 'tiger',    emoji: '🐯', wikiTitle: 'Bengal tiger' },
  { tamil: 'மீன்',    roman: 'meen',    meaning: 'fish',     emoji: '🐟', wikiTitle: 'Fish' },
]

const NUMBERS: BasicWord[] = [
  { tamil: 'ஒன்று',  roman: 'ondru',   meaning: 'one',   emoji: '1️⃣' },
  { tamil: 'இரண்டு', roman: 'irandu',  meaning: 'two',   emoji: '2️⃣' },
  { tamil: 'மூன்று', roman: 'moondru', meaning: 'three', emoji: '3️⃣' },
  { tamil: 'நான்கு', roman: 'naangu',  meaning: 'four',  emoji: '4️⃣' },
  { tamil: 'ஐந்து',  roman: 'aindhu',  meaning: 'five',  emoji: '5️⃣' },
  { tamil: 'ஆறு',    roman: 'aaru',    meaning: 'six',   emoji: '6️⃣' },
  { tamil: 'ஏழு',    roman: 'eezhu',   meaning: 'seven', emoji: '7️⃣' },
  { tamil: 'எட்டு',  roman: 'ettu',    meaning: 'eight', emoji: '8️⃣' },
  { tamil: 'ஒன்பது', roman: 'onbadu',  meaning: 'nine',  emoji: '9️⃣' },
  { tamil: 'பத்து',  roman: 'pattu',   meaning: 'ten',   emoji: '🔟' },
]

const COLORS: BasicWord[] = [
  { tamil: 'சிவப்பு', roman: 'sivappu', meaning: 'red',    emoji: '🔴' },
  { tamil: 'பச்சை',   roman: 'pachai',  meaning: 'green',  emoji: '🟢' },
  { tamil: 'நீலம்',   roman: 'neelam',  meaning: 'blue',   emoji: '🔵' },
  { tamil: 'மஞ்சள்',  roman: 'manjal',  meaning: 'yellow', emoji: '🟡' },
  { tamil: 'வெள்ளை',  roman: 'vellai',  meaning: 'white',  emoji: '⚪' },
  { tamil: 'கறுப்பு', roman: 'karuppu', meaning: 'black',  emoji: '⚫' },
]

const BODY_PARTS: BasicWord[] = [
  { tamil: 'தலை',    roman: 'thalai', meaning: 'head',  emoji: '🧑' },
  { tamil: 'கண்',    roman: 'kan',    meaning: 'eye',   emoji: '👁️' },
  { tamil: 'மூக்கு', roman: 'mookku', meaning: 'nose',  emoji: '👃' },
  { tamil: 'வாய்',   roman: 'vaai',   meaning: 'mouth', emoji: '👄' },
  { tamil: 'காது',   roman: 'kaadhu', meaning: 'ear',   emoji: '👂' },
  { tamil: 'கை',     roman: 'kai',    meaning: 'hand',  emoji: '🤚' },
]

const COMMON_WORDS: BasicWord[] = [
  { tamil: 'வீடு',    roman: 'veedu',   meaning: 'house',    emoji: '🏠', wikiTitle: 'House' },
  { tamil: 'மரம்',    roman: 'maram',   meaning: 'tree',     emoji: '🌳', wikiTitle: 'Tree' },
  { tamil: 'நீர்',    roman: 'neer',    meaning: 'water',    emoji: '💧', wikiTitle: 'Drinking water' },
  { tamil: 'சூரியன்', roman: 'suuriyan', meaning: 'sun',   emoji: '🌅', wikiTitle: 'Sunset' },
  { tamil: 'நிலா',    roman: 'nilaa',   meaning: 'moon',     emoji: '🌙', wikiTitle: 'Moon' },
  { tamil: 'மலை',     roman: 'malai',   meaning: 'mountain', emoji: '⛰️', wikiTitle: 'Mountain' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveWord(w: WordData | BasicWord, prefix: string) {
  const audioUrl = await downloadAudio(w.tamil, `${prefix}_${safe(w.roman)}.mp3`)
  const imageUrl = w.wikiTitle
    ? await downloadWikiImage(w.wikiTitle, `${prefix}_${safe(w.roman)}.jpg`) ?? w.emoji
    : w.emoji
  return { audioUrl, imageUrl }
}

async function createLetterChapter(unitId: ObjectId, letter: LetterData, order: number) {
  const chapter = await Chapter.create({ unit_id: unitId, title: letter.letter, order, is_published: true })

  let letterAudioUrl: string | undefined
  if (letter.wikimediaAudio) {
    const fname = `letter_${safe(letter.transliteration)}.ogg`
    letterAudioUrl = await downloadRemoteAudio(letter.wikimediaAudio, fname)
  }
  letterAudioUrl ??= await downloadAudio(letter.letter, `letter_${safe(letter.transliteration)}.mp3`)

  // Page 1 — Introduction
  const introSection = await Section.create({ chapter_id: chapter._id, title: 'Introduction', section_type: 'INTRO', order: 1 })
  await ContentBlock.create({
    section_id: introSection._id, type: 'LETTER', order: 1,
    tamil_text: letter.letter, transliteration: letter.transliteration,
    audio_url: letterAudioUrl,
  })

  // Page 2 — Common Words (gallery)
  const wordsSection = await Section.create({ chapter_id: chapter._id, title: 'Common Words', section_type: 'GALLERY', order: 2 })
  const resolvedWords = []
  for (let i = 0; i < letter.words.length; i++) {
    const w = letter.words[i]
    const { audioUrl, imageUrl } = await resolveWord(w, 'word')
    await ContentBlock.create({
      section_id: wordsSection._id, type: 'WORD', order: i + 1,
      tamil_text: w.tamil, transliteration: w.roman, translation: w.meaning,
      audio_url: audioUrl, image_url: imageUrl,
    })
    resolvedWords.push({ ...w, audioUrl, imageUrl })
  }

  // Page 3 — Matching quiz
  const quizSection = await Section.create({ chapter_id: chapter._id, title: 'Match the Words', section_type: 'QUIZ_MATCHING', order: 3 })
  for (let i = 0; i < resolvedWords.length; i++) {
    const w = resolvedWords[i]
    await ContentBlock.create({
      section_id: quizSection._id, type: 'MATCHING_PAIR', order: i + 1,
      tamil_text: w.tamil, transliteration: w.roman, translation: w.meaning,
      image_url: w.imageUrl,
    })
  }
}

async function createBasicWordsChapter(unitId: ObjectId, title: string, order: number, words: BasicWord[], prefix: string) {
  const chapter = await Chapter.create({ unit_id: unitId, title, order, is_published: true })
  const resolved = []

  const gallerySection = await Section.create({ chapter_id: chapter._id, title: 'Words', section_type: 'GALLERY', order: 1 })
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const { audioUrl, imageUrl } = await resolveWord(w, prefix)
    await ContentBlock.create({
      section_id: gallerySection._id, type: 'WORD', order: i + 1,
      tamil_text: w.tamil, transliteration: w.roman, translation: w.meaning,
      audio_url: audioUrl, image_url: imageUrl,
    })
    resolved.push({ ...w, imageUrl })
  }

  const quizSection = await Section.create({ chapter_id: chapter._id, title: 'Match the Words', section_type: 'QUIZ_MATCHING', order: 2 })
  for (let i = 0; i < resolved.length; i++) {
    const w = resolved[i]
    await ContentBlock.create({
      section_id: quizSection._id, type: 'MATCHING_PAIR', order: i + 1,
      tamil_text: w.tamil, transliteration: w.roman, translation: w.meaning,
      image_url: w.imageUrl,
    })
  }
}

async function createStory(unitId: ObjectId, title: string, order: number, lines: { tamil: string; translation: string }[], prefix: string) {
  const chapter  = await Chapter.create({ unit_id: unitId, title, order, is_published: true })
  const section  = await Section.create({ chapter_id: chapter._id, title: 'கதை', section_type: 'STORY', order: 1 })
  for (const [i, l] of lines.entries()) {
    const audioUrl = await downloadAudio(l.tamil, `${prefix}_line${i + 1}.mp3`)
    await ContentBlock.create({ section_id: section._id, type: 'PARAGRAPH', order: i + 1, tamil_text: l.tamil, translation: l.translation, audio_url: audioUrl })
  }
}

async function createSong(unitId: ObjectId, title: string, order: number, lines: { tamil: string; roman: string; translation: string }[], prefix: string) {
  const chapter = await Chapter.create({ unit_id: unitId, title, order, is_published: true })
  const section = await Section.create({ chapter_id: chapter._id, title: 'பாடல்', section_type: 'SONG', order: 1 })
  for (const [i, l] of lines.entries()) {
    const audioUrl = await downloadAudio(l.tamil, `${prefix}_line${i + 1}.mp3`)
    await ContentBlock.create({ section_id: section._id, type: 'SENTENCE', order: i + 1, tamil_text: l.tamil, transliteration: l.roman, translation: l.translation, audio_url: audioUrl })
  }
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB')

  await Promise.all([
    Language.deleteMany({}), Grade.deleteMany({}), Unit.deleteMany({}),
    Chapter.deleteMany({}), Section.deleteMany({}), ContentBlock.deleteMany({}),
  ])
  console.log('Cleared existing data — downloading audio + images...\n')

  const lang  = await Language.create({ name: 'Tamil', code: 'ta' })
  const grade = await Grade.create({ language_id: lang._id, name: 'Kindergarten', order: 1 })

  // Unit 1 — Uyir Ezhuthu
  const uyirUnit = await Unit.create({ grade_id: grade._id, title: 'Uyir Ezhuthu', order: 1, description: 'உயிர் எழுத்து — Tamil vowels (12 letters)' })
  for (let i = 0; i < VOWELS.length; i++) {
    process.stdout.write(`Vowel ${VOWELS[i].letter}... `)
    await createLetterChapter(uyirUnit._id as ObjectId, VOWELS[i], i + 1)
    process.stdout.write('✓\n')
  }

  // Unit 2 — Kuril Ezhuthukal (short vowels: அ இ உ எ ஒ)
  const kurilVowels = [0, 2, 4, 6, 9].map(i => VOWELS[i])
  const kurilUnit = await Unit.create({ grade_id: grade._id, title: 'Kuril Ezhuthukal', order: 2, description: 'குறில் எழுத்துக்கள் — Short vowels (அ இ உ எ ஒ)' })
  for (let i = 0; i < kurilVowels.length; i++) {
    process.stdout.write(`Kuril ${kurilVowels[i].letter}... `)
    await createLetterChapter(kurilUnit._id as ObjectId, kurilVowels[i], i + 1)
    process.stdout.write('✓\n')
  }

  // Unit 3 — Nedil Ezhuthukal (long vowels: ஆ ஈ ஊ ஏ ஐ ஓ ஔ)
  const nedilVowels = [1, 3, 5, 7, 8, 10, 11].map(i => VOWELS[i])
  const nedilUnit = await Unit.create({ grade_id: grade._id, title: 'Nedil Ezhuthukal', order: 3, description: 'நெடில் எழுத்துக்கள் — Long vowels (ஆ ஈ ஊ ஏ ஐ ஓ ஔ)' })
  for (let i = 0; i < nedilVowels.length; i++) {
    process.stdout.write(`Nedil ${nedilVowels[i].letter}... `)
    await createLetterChapter(nedilUnit._id as ObjectId, nedilVowels[i], i + 1)
    process.stdout.write('✓\n')
  }

  // Unit 4 — Mei Ezhuthu
  const meiUnit = await Unit.create({ grade_id: grade._id, title: 'Mei Ezhuthu', order: 4, description: 'மெய் எழுத்து — Tamil consonants (18 letters)' })
  for (let i = 0; i < CONSONANTS.length; i++) {
    process.stdout.write(`Consonant ${CONSONANTS[i].letter}... `)
    await createLetterChapter(meiUnit._id as ObjectId, CONSONANTS[i], i + 1)
    process.stdout.write('✓\n')
  }

  // Unit 3 — Short Stories
  const storiesUnit = await Unit.create({ grade_id: grade._id, title: 'Short Stories', order: 5, description: 'சிறுகதைகள் — Simple Tamil stories' })

  await createStory(storiesUnit._id as ObjectId, 'சிங்கமும் எலியும்', 1, [
    { tamil: 'ஒரு அடர்ந்த காட்டில் ஒரு பெரிய சிங்கம் வாழ்ந்தது.',                             translation: 'In a thick forest, a big lion lived.' },
    { tamil: 'ஒரு நாள் சிங்கம் மரத்தடியில் ஆழமாக தூங்கியது.',                                translation: 'One day, the lion slept deeply under a tree.' },
    { tamil: 'ஒரு சின்னஞ்சிறிய எலி விளையாடிக்கொண்டு அதன் மேல் ஓடியது.',                      translation: 'A tiny mouse ran over it while playing.' },
    { tamil: 'சிங்கம் கோபத்துடன் எழுந்து எலியைப் பிடித்தது.',                                 translation: 'The lion woke up angrily and caught the mouse.' },
    { tamil: 'எலி நடுங்கியது. "என்னை மன்னி! நான் உனக்கு ஒரு நாள் உதவுவேன்" என்றது.',        translation: 'The mouse trembled. "Forgive me! I will help you one day," it said.' },
    { tamil: 'சிங்கம் சிரித்துக்கொண்டே எலியை விட்டது.',                                       translation: 'The lion laughed and let the mouse go.' },
    { tamil: 'சில நாட்கள் கழித்து சிங்கம் வேட்டைக்காரர் வலையில் மாட்டியது.',                  translation: 'A few days later, the lion got caught in a hunter\'s net.' },
    { tamil: 'சிங்கம் உரக்க கர்ஜித்தது. எலி அந்த சத்தம் கேட்டு ஓடி வந்தது.',                 translation: 'The lion roared loudly. The mouse heard and came running.' },
    { tamil: 'சிறிய எலி தன் கூரிய பற்களால் வலையை கடித்து அறுத்தது.',                          translation: 'The little mouse chewed through the net with its sharp teeth.' },
    { tamil: 'சிங்கம் விடுதலையானது. "நண்பா, நன்றி!" என்று சொன்னது.',                         translation: 'The lion was freed. "Friend, thank you!" it said.' },
    { tamil: 'சிறியவர்களை ஒருபோதும் அலட்சியப்படுத்தாதே.',                                     translation: 'Never underestimate the small.' },
  ], 'story1')
  console.log('✓ Story 1: சிங்கமும் எலியும்')

  await createStory(storiesUnit._id as ObjectId, 'காகமும் குடமும்', 2, [
    { tamil: 'ஒரு காகம் கடுமையான வெயிலில் தாகமாக இருந்தது.',                translation: 'A crow was very thirsty in the scorching sun.' },
    { tamil: 'அது தண்ணீர் தேடி நீண்ட நேரம் அலைந்தது.',                      translation: 'It wandered for a long time searching for water.' },
    { tamil: 'கடைசியில் ஒரு குடம் கண்டது.',                                  translation: 'Finally, it found a pot.' },
    { tamil: 'குடத்தில் கொஞ்சம் தண்ணீர் இருந்தது.',                         translation: 'There was a little water in the pot.' },
    { tamil: 'ஆனால் காகத்தின் அலகு தண்ணீரை எட்டவில்லை.',                   translation: 'But the crow\'s beak could not reach the water.' },
    { tamil: 'காகம் சோர்ந்து போகவில்லை. அது யோசித்தது.',                    translation: 'The crow did not give up. It thought carefully.' },
    { tamil: 'அருகிலிருந்த கல்களை ஒவ்வொன்றாக குடத்தில் போட்டது.',          translation: 'It dropped stones one by one into the pot.' },
    { tamil: 'கல் போக போக தண்ணீர் மேலே வந்தது.',                            translation: 'As stones were added, the water rose up.' },
    { tamil: 'காகம் தண்ணீர் குடித்து தன் தாகம் தணித்தது.',                   translation: 'The crow drank the water and quenched its thirst.' },
    { tamil: 'மூளையை பயன்படுத்தினால் எந்த தடையும் தீரும்.',                  translation: 'Using your mind can solve any problem.' },
  ], 'story2')
  console.log('✓ Story 2: காகமும் குடமும்')

  await createStory(storiesUnit._id as ObjectId, 'காகமும் நரியும்', 3, [
    { tamil: 'ஒரு காகம் உணவுத் துண்டை வாயில் வைத்துக்கொண்டு மரத்தில் அமர்ந்தது.', translation: 'A crow sat on a tree with a piece of food in its beak.' },
    { tamil: 'ஒரு நரி அதை பார்த்தது. அதன் வாயில் நீர் ஊறியது.',                   translation: 'A fox saw this. Its mouth watered.' },
    { tamil: 'நரி காகத்திடம் வந்தது.',                                              translation: 'The fox came to the crow.' },
    { tamil: '"உன் இறகுகள் எவ்வளவு அழகாக இருக்கின்றன!" என்றது.',                  translation: '"How beautiful your feathers are!" it said.' },
    { tamil: '"உன் குரல் இனிமையானது என்று கேள்விப்பட்டேன். ஒரு பாடல் பாடு!"',    translation: '"I heard your voice is sweet. Please sing a song!"' },
    { tamil: 'காகம் புகழ்ச்சியால் மகிழ்ந்தது. வாயைத் திறந்து பாட ஆரம்பித்தது.',  translation: 'The crow was pleased by the praise. It opened its beak to sing.' },
    { tamil: 'உணவுத் துண்டு கீழே விழுந்தது.',                                      translation: 'The piece of food fell down.' },
    { tamil: 'நரி உடனே எடுத்து ஓடிவிட்டது.',                                       translation: 'The fox quickly picked it up and ran away.' },
    { tamil: 'காகம் வருத்தப்பட்டது.',                                               translation: 'The crow felt sad.' },
    { tamil: 'புகழ்ச்சியில் மயங்கினால் ஏமாறுவோம்.',                               translation: 'We get fooled when we are blinded by flattery.' },
  ], 'story3')
  console.log('✓ Story 3: காகமும் நரியும்')

  // Unit 4 — Short Songs
  const songsUnit = await Unit.create({ grade_id: grade._id, title: 'Short Songs', order: 6, description: 'பாடல்கள் — Tamil songs and rhymes' })

  await createSong(songsUnit._id as ObjectId, 'அம்மா இங்கே வா வா', 1, [
    { tamil: 'அம்மா இங்கே வா! வா!',        roman: 'amma inge vaa vaa',        translation: 'Mother come here, come here!' },
    { tamil: 'ஆசை முத்தம் தா! தா!',        roman: 'aasai mutham thaa thaa',   translation: 'Give a loving kiss!' },
    { tamil: 'இலையில் சோறு போட்டு',        roman: 'ilaiyil soru pottu',       translation: 'Put rice on a leaf' },
    { tamil: 'ஈயைத் தூர ஓட்டு',           roman: 'eeyai thoora ottu',        translation: 'Shoo the flies away' },
    { tamil: 'உன்னைப் போன்ற நல்லார்',      roman: 'unnaip ponra nallaar',     translation: 'Who else is as good as you?' },
    { tamil: 'ஊரில் யாவர் உள்ளார்?',       roman: 'ooril yaavar ullaar',      translation: 'In this whole town?' },
    { tamil: 'என்னால் உனக்குத் தொல்லை',   roman: 'ennaal unakku thollaI',    translation: 'You never cause me trouble' },
    { tamil: 'ஏதும் இங்கே இல்லை',          roman: 'eedhum inge illai',        translation: 'Not a bit here' },
    { tamil: 'ஐயமின்றி சொல்லுவேன்',       roman: 'aiyaminri solluveen',      translation: 'I will say without doubt' },
    { tamil: 'ஒற்றுமை என்றும் பலமாம்',    roman: 'otrumai endrum palaman',   translation: 'Unity is always strength' },
    { tamil: 'ஓதும் செயலே நலமாம்',        roman: 'odhum seyale nalamaam',    translation: 'Learning is the good path' },
    { tamil: 'ஔவை சொன்ன மொழியாம்',       roman: 'avvai sonna mozhiyaam',    translation: 'These are the words of Avvaiyar' },
    { tamil: 'அஃதே எனக்கு வழியாம்',        roman: 'adhee enakku vazhiyaam',   translation: 'That is my way' },
  ], 'song1')
  console.log('✓ Song 1: அம்மா இங்கே வா வா')

  await createSong(songsUnit._id as ObjectId, 'நிலா நிலா ஓடி வா', 2, [
    { tamil: 'நிலா நிலா ஓடி வா',        roman: 'nila nila odi vaa',       translation: 'Moon moon come running' },
    { tamil: 'நில்லாமல் ஓடி வா',        roman: 'nillamal odi vaa',        translation: 'Come running without stopping' },
    { tamil: 'மலை மீது ஏறி வா',         roman: 'malai meethu eri vaa',    translation: 'Climb up the mountain' },
    { tamil: 'மல்லிகைப் பூ கொண்டு வா',  roman: 'malligai poo kondu vaa',  translation: 'Bring jasmine flowers' },
    { tamil: 'வட்ட வட்ட நிலாவே',        roman: 'vatta vatta nilaave',     translation: 'O round round moon' },
    { tamil: 'வண்ண முகில் பூவே',         roman: 'vanna mugil poove',       translation: 'O colorful cloud flower' },
    { tamil: 'பட்டம் போலே பறந்து வா',   roman: 'pattam pole parandhu vaa',translation: 'Come flying like a kite' },
    { tamil: 'பம்பரமாய் சுற்றி வா',      roman: 'pambaramaay sutri vaa',   translation: 'Come spinning like a top' },
  ], 'song2')
  console.log('✓ Song 2: நிலா நிலா ஓடி வா')

  await createSong(songsUnit._id as ObjectId, 'குள்ள குள்ள வாத்து', 3, [
    { tamil: 'குள்ள குள்ள வாத்து',      roman: 'kulla kulla vaathu',      translation: 'Short short duck' },
    { tamil: 'குவா குவா வாத்து',         roman: 'kuvaa kuvaa vaathu',      translation: 'Quack quack duck' },
    { tamil: 'மெல்ல உடலைச் சாய்த்து',  roman: 'mella udalaich saaithu',  translation: 'Gently tilting its body' },
    { tamil: 'மேலும் கீழும் பார்த்து',  roman: 'meelum keelum paarthu',   translation: 'Looking up and down' },
    { tamil: 'செல்லமாக நடக்கும்',       roman: 'sellamaaga nadakkum',     translation: 'Walking sweetly' },
    { tamil: 'சின்ன மணி வாத்து',        roman: 'sinna mani vaathu',       translation: 'Little gem duck' },
  ], 'song3')
  console.log('✓ Song 3: குள்ள குள்ள வாத்து')

  // Unit 5 — Basic Words
  const basicUnit = await Unit.create({ grade_id: grade._id, title: 'Basic Words', order: 7, description: 'அடிப்படை வார்த்தைகள்' })
  await createBasicWordsChapter(basicUnit._id as ObjectId, 'விலங்குகள் — Animals',              1, ANIMALS,      'animal')
  await createBasicWordsChapter(basicUnit._id as ObjectId, 'எண்கள் — Numbers',                  2, NUMBERS,      'number')
  await createBasicWordsChapter(basicUnit._id as ObjectId, 'நிறங்கள் — Colors',                 3, COLORS,       'color')
  await createBasicWordsChapter(basicUnit._id as ObjectId, 'உடல் உறுப்புகள் — Body Parts',       4, BODY_PARTS,   'body')
  await createBasicWordsChapter(basicUnit._id as ObjectId, 'பொதுவான வார்த்தைகள் — Common Words', 5, COMMON_WORDS, 'common')
  console.log('✓ Basic Words: 5 chapters')

  console.log('\n✓ Seed complete')
  await mongoose.disconnect()
}

seed().catch((err) => { console.error(err); process.exit(1) })
