import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import mongoose, { Types } from 'mongoose'
import { Language, Grade, Unit, Chapter, Section, ContentBlock } from './models/index.js'

type ObjectId = Types.ObjectId

// ── Types ─────────────────────────────────────────────────────────────────────

type WordData = {
  tamil: string
  roman: string
  meaning: string
  emoji: string        // always shown in matching quiz tiles
  wikiTitle?: string   // if set, download Wikipedia thumbnail as real image
}

type LetterData = {
  letter: string
  transliteration: string
  wikimediaAudio?: string  // direct Wikimedia Commons .ogg URL (vowels only)
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

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
const AUDIO_DIR = path.join(process.cwd(), 'uploads', 'audio')
const IMAGE_DIR = path.join(process.cwd(), 'uploads', 'images')

// Wikipedia requires a descriptive User-Agent with contact info to avoid rate limits
const WIKI_UA = 'LearnTamilEasy/1.0 (https://github.com/learntamileasy; contact@learntamileasy.com) Node.js'
const TTS_UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '_').toLowerCase()

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

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(tamilText)}&tl=ta&client=tw-ob`
  try {
    const res = await fetchWithRetry(url, { headers: { 'User-Agent': TTS_UA } })
    if (!res.ok) throw new Error(`${res.status}`)
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
    await sleep(500)
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
    const json = await apiRes.json() as Record<string, unknown>
    const pages = (json.query as Record<string, unknown>)?.pages as Record<string, unknown>
    const page = Object.values(pages ?? {})[0] as Record<string, unknown>
    const thumbUrl = (page?.thumbnail as Record<string, string>)?.source
    if (!thumbUrl) throw new Error('no thumbnail')
    await sleep(1000)   // pause between API call and image download

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

// Download a remote audio file (e.g. Wikimedia .ogg) and store locally
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

// ── Letter data ───────────────────────────────────────────────────────────────

const VOWELS: LetterData[] = [
  {
    letter: 'அ', transliteration: 'a',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Ta-%E0%AE%85.ogg',
    words: [
      { tamil: 'அம்மா',    roman: 'amma',     meaning: 'mother',   emoji: '👩',  wikiTitle: 'Mother' },
      { tamil: 'அரிசி',    roman: 'arisi',    meaning: 'rice',     emoji: '🍚',  wikiTitle: 'Rice' },
      { tamil: 'அணில்',    roman: 'anil',     meaning: 'squirrel', emoji: '🐿️', wikiTitle: 'Squirrel' },
      { tamil: 'அரசன்',   roman: 'arasan',   meaning: 'king',     emoji: '👑',  wikiTitle: 'King' },
    ],
  },
  {
    letter: 'ஆ', transliteration: 'aa',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Ta-%E0%AE%86.ogg',
    words: [
      { tamil: 'ஆடு',      roman: 'aadu',     meaning: 'goat',     emoji: '🐐',  wikiTitle: 'Goat' },
      { tamil: 'ஆமை',     roman: 'aamai',    meaning: 'tortoise', emoji: '🐢',  wikiTitle: 'Turtle' },
      { tamil: 'ஆகாயம்', roman: 'aakaayam', meaning: 'sky',      emoji: '🌤️', wikiTitle: 'Sky' },
      { tamil: 'ஆறு',      roman: 'aaru',     meaning: 'river',    emoji: '🌊',  wikiTitle: 'River' },
      { tamil: 'ஆப்பிள்', roman: 'aappil',   meaning: 'apple',    emoji: '🍎',  wikiTitle: 'Apple' },
    ],
  },
  {
    letter: 'இ', transliteration: 'i',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Ta-%E0%AE%87.ogg',
    words: [
      { tamil: 'இலை',      roman: 'ilai',     meaning: 'leaf',     emoji: '🍃',  wikiTitle: 'Leaf' },
      { tamil: 'இரவு',     roman: 'iravu',    meaning: 'night',    emoji: '🌙',  wikiTitle: 'Night' },
      { tamil: 'இறால்',   roman: 'iraal',    meaning: 'prawn',    emoji: '🦐',  wikiTitle: 'Prawn' },
      { tamil: 'இதயம்',   roman: 'idhayam',  meaning: 'heart',    emoji: '❤️',  wikiTitle: 'Heart' },
      { tamil: 'இரும்பு', roman: 'irumbu',   meaning: 'iron',     emoji: '⚙️',  wikiTitle: 'Iron' },
    ],
  },
  {
    letter: 'ஈ', transliteration: 'ii',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Ta-%E0%AE%88.ogg',
    words: [
      { tamil: 'ஈ',         roman: 'ii',      meaning: 'fly',         emoji: '🪰',  wikiTitle: 'Housefly' },
      { tamil: 'ஈகை',      roman: 'iikai',   meaning: 'generosity',  emoji: '🤝', wikiTitle: 'Volunteering' },
      { tamil: 'ஈரம்',     roman: 'iiram',   meaning: 'moisture',    emoji: '💧' },
    ],
  },
  {
    letter: 'உ', transliteration: 'u',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Ta-%E0%AE%89.ogg',
    words: [
      { tamil: 'உடல்',     roman: 'udal',    meaning: 'body',        emoji: '🫀' },
      { tamil: 'உணவு',     roman: 'unavu',   meaning: 'food',        emoji: '🍱',  wikiTitle: 'Food' },
      { tamil: 'உலகம்',   roman: 'ulagam',  meaning: 'world',       emoji: '🌍',  wikiTitle: 'Earth' },
      { tamil: 'உழவன்',   roman: 'uzhavan', meaning: 'farmer',      emoji: '🌾',  wikiTitle: 'Farmer' },
      { tamil: 'உயிர்',    roman: 'uyir',    meaning: 'life',        emoji: '💓' },
    ],
  },
  {
    letter: 'ஊ', transliteration: 'uu',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Ta-%E0%AE%8A.ogg',
    words: [
      { tamil: 'ஊர்',      roman: 'uur',     meaning: 'town',        emoji: '🏘️', wikiTitle: 'Village' },
      { tamil: 'ஊஞ்சல்', roman: 'uunjal',  meaning: 'swing',       emoji: '🎢',  wikiTitle: 'Swing (seat)' },
      { tamil: 'ஊக்கம்', roman: 'uukkam',  meaning: 'enthusiasm',  emoji: '💪' },
      { tamil: 'ஊடகம்',  roman: 'uudagam', meaning: 'media',     emoji: '📺',  wikiTitle: 'Mass media' },
    ],
  },
  {
    letter: 'எ', transliteration: 'e',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Ta-%E0%AE%8E.ogg',
    words: [
      { tamil: 'எலி',       roman: 'eli',      meaning: 'rat',       emoji: '🐭',  wikiTitle: 'Rat' },
      { tamil: 'எண்',       roman: 'en',       meaning: 'number',    emoji: '🔢' },
      { tamil: 'எருது',     roman: 'erudu',    meaning: 'bull',      emoji: '🐂',  wikiTitle: 'Bull' },
      { tamil: 'எறும்பு',  roman: 'erumbu',   meaning: 'ant',       emoji: '🐜',  wikiTitle: 'Ant' },
      { tamil: 'எலுமிச்சை', roman: 'elumichai', meaning: 'lemon',   emoji: '🍋',  wikiTitle: 'Lemon' },
    ],
  },
  {
    letter: 'ஏ', transliteration: 'ee',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Ta-%E0%AE%8F.ogg',
    words: [
      { tamil: 'ஏணி',     roman: 'eeni',   meaning: 'ladder',    emoji: '🪜',  wikiTitle: 'Ladder' },
      { tamil: 'ஏரி',     roman: 'eeri',   meaning: 'lake',      emoji: '🏞️', wikiTitle: 'Lake' },
      { tamil: 'ஏடு',     roman: 'eedu',   meaning: 'book',      emoji: '📖',  wikiTitle: 'Book' },
      { tamil: 'ஏழு',     roman: 'eezhu',  meaning: 'seven',     emoji: '7️⃣' },
      { tamil: 'ஏர்',     roman: 'eer',    meaning: 'plough',    emoji: '🔧',  wikiTitle: 'Plough' },
    ],
  },
  {
    letter: 'ஐ', transliteration: 'ai',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Ta-%E0%AE%90.ogg',
    words: [
      { tamil: 'ஐந்து',   roman: 'aindhu', meaning: 'five',      emoji: '5️⃣' },
      { tamil: 'ஐயன்',   roman: 'aiyan',  meaning: 'father',    emoji: '👨' },
      { tamil: 'ஐயம்',   roman: 'aiyam',  meaning: 'doubt',     emoji: '🤔' },
      { tamil: 'ஐஸ்',    roman: 'ais',    meaning: 'ice',       emoji: '🧊',  wikiTitle: 'Ice' },
    ],
  },
  {
    letter: 'ஒ', transliteration: 'o',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Ta-%E0%AE%92.ogg',
    words: [
      { tamil: 'ஒட்டகம்', roman: 'ottakam', meaning: 'camel',   emoji: '🐪',  wikiTitle: 'Dromedary' },
      { tamil: 'ஒலி',      roman: 'oli',     meaning: 'sound',   emoji: '🔊' },
      { tamil: 'ஒளி',      roman: 'oli2',    meaning: 'light',   emoji: '💡',  wikiTitle: 'Light' },
      { tamil: 'ஒன்று',    roman: 'ondru',   meaning: 'one',     emoji: '1️⃣' },
    ],
  },
  {
    letter: 'ஓ', transliteration: 'oo',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Ta-%E0%AE%93.ogg',
    words: [
      { tamil: 'ஓடு',     roman: 'oodu',   meaning: 'shell',    emoji: '🐚',  wikiTitle: 'Seashell' },
      { tamil: 'ஓடை',     roman: 'oodai',  meaning: 'stream',   emoji: '🌊',  wikiTitle: 'Stream' },
      { tamil: 'ஓணான்',  roman: 'oonaan', meaning: 'lizard',   emoji: '🦎',  wikiTitle: 'Lizard' },
      { tamil: 'ஓடம்',    roman: 'oodam',  meaning: 'boat',     emoji: '⛵',  wikiTitle: 'Boat' },
    ],
  },
  {
    letter: 'ஔ', transliteration: 'au',
    wikimediaAudio: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Ta-%E0%AE%94.ogg',
    words: [
      { tamil: 'ஔஷதம்',  roman: 'aushadam', meaning: 'medicine', emoji: '💊', wikiTitle: 'Medicine' },
      { tamil: 'ஔவை',    roman: 'auvai',    meaning: 'Avvaiyar', emoji: '📜' },
      { tamil: 'ஔடதம்',  roman: 'audadam',  meaning: 'drug',     emoji: '💊' },
    ],
  },
]

const CONSONANTS: LetterData[] = [
  {
    letter: 'க', transliteration: 'ka',
    words: [
      { tamil: 'கை',     roman: 'kai',     meaning: 'hand',    emoji: '🤚',  wikiTitle: 'Hand' },
      { tamil: 'கண்',    roman: 'kan',     meaning: 'eye',     emoji: '👁️', wikiTitle: 'Eye' },
      { tamil: 'காடு',   roman: 'kaadu',   meaning: 'forest',  emoji: '🌲',  wikiTitle: 'Forest' },
      { tamil: 'கரடி',   roman: 'karadi',  meaning: 'bear',    emoji: '🐻',  wikiTitle: 'Brown bear' },
      { tamil: 'கடல்',   roman: 'kadal',   meaning: 'sea',     emoji: '🌊',  wikiTitle: 'Sea' },
    ],
  },
  {
    letter: 'ங', transliteration: 'nga',
    words: [
      { tamil: 'அங்கம்',  roman: 'angam',  meaning: 'body part', emoji: '💪' },
      { tamil: 'பங்கு',   roman: 'pangu',  meaning: 'share',     emoji: '📊' },
      { tamil: 'சங்கம்',  roman: 'sangam', meaning: 'academy',   emoji: '📚' },
    ],
  },
  {
    letter: 'ச', transliteration: 'sa',
    words: [
      { tamil: 'சிரிப்பு',  roman: 'sirippu',  meaning: 'laughter', emoji: '😄' },
      { tamil: 'சூரியன்',  roman: 'suuriyan', meaning: 'sun',      emoji: '☀️',  wikiTitle: 'Sun' },
      { tamil: 'சேவல்',   roman: 'seeval',   meaning: 'rooster',  emoji: '🐓',  wikiTitle: 'Rooster' },
      { tamil: 'சாப்பாடு', roman: 'saappadu', meaning: 'meal',     emoji: '🍛',  wikiTitle: 'Indian cuisine' },
      { tamil: 'சந்திரன்', roman: 'chandhiran', meaning: 'moon',   emoji: '🌙',  wikiTitle: 'Moon' },
    ],
  },
  {
    letter: 'ஞ', transliteration: 'nya',
    words: [
      { tamil: 'ஞாயிறு',  roman: 'nyaayiru',  meaning: 'Sunday',  emoji: '☀️' },
      { tamil: 'ஞாபகம்',  roman: 'nyaabagam', meaning: 'memory',  emoji: '🧠' },
      { tamil: 'ஞானம்',   roman: 'nyaanam',   meaning: 'wisdom',  emoji: '📚' },
      { tamil: 'ஞாலம்',   roman: 'nyaalam',   meaning: 'world',   emoji: '🌍' },
    ],
  },
  {
    letter: 'ட', transliteration: 'da',
    words: [
      { tamil: 'டமாரம்',  roman: 'damaaram', meaning: 'drum',    emoji: '🥁',  wikiTitle: 'Drum' },
      { tamil: 'டாக்டர்', roman: 'daaktar',  meaning: 'doctor',  emoji: '👨‍⚕️', wikiTitle: 'Physician' },
      { tamil: 'படம்',    roman: 'padam',    meaning: 'picture', emoji: '🖼️', wikiTitle: 'Painting' },
      { tamil: 'டிரெய்ன்', roman: 'dreyn',  meaning: 'train',   emoji: '🚂',  wikiTitle: 'Train' },
    ],
  },
  {
    letter: 'ண', transliteration: 'na2',
    words: [
      { tamil: 'பண்',    roman: 'pan',    meaning: 'melody',  emoji: '🎵' },
      { tamil: 'மண்',    roman: 'man',    meaning: 'soil',    emoji: '🟫',  wikiTitle: 'Soil' },
      { tamil: 'கண்',    roman: 'kan2',   meaning: 'eye',     emoji: '👁️', wikiTitle: 'Eye' },
    ],
  },
  {
    letter: 'த', transliteration: 'tha',
    words: [
      { tamil: 'தாய்',     roman: 'thaai',    meaning: 'mother',  emoji: '👩',  wikiTitle: 'Mother' },
      { tamil: 'தண்ணீர்', roman: 'thanneer', meaning: 'water',   emoji: '💧',  wikiTitle: 'Water' },
      { tamil: 'தமிழ்',   roman: 'thamizh',  meaning: 'Tamil',   emoji: '📜' },
      { tamil: 'தலை',     roman: 'thalai',   meaning: 'head',    emoji: '🧠',  wikiTitle: 'Head' },
      { tamil: 'தாமரை',  roman: 'thaamarai', meaning: 'lotus',  emoji: '🌸',  wikiTitle: 'Nelumbo nucifera' },
    ],
  },
  {
    letter: 'ந', transliteration: 'na3',
    words: [
      { tamil: 'நாய்',    roman: 'naai',   meaning: 'dog',     emoji: '🐕',  wikiTitle: 'Dog' },
      { tamil: 'நண்டு',  roman: 'nandu',  meaning: 'crab',    emoji: '🦀',  wikiTitle: 'Crab' },
      { tamil: 'நிலா',    roman: 'nilaa',  meaning: 'moon',    emoji: '🌙',  wikiTitle: 'Moon' },
      { tamil: 'நாடு',    roman: 'naadu',  meaning: 'country', emoji: '🗺️' },
      { tamil: 'நெல்',    roman: 'nel',    meaning: 'paddy',   emoji: '🌾',  wikiTitle: 'Rice (plant)' },
    ],
  },
  {
    letter: 'ப', transliteration: 'pa',
    words: [
      { tamil: 'பூ',      roman: 'poo',     meaning: 'flower',  emoji: '🌸',  wikiTitle: 'Flower' },
      { tamil: 'பறவை',   roman: 'paravai', meaning: 'bird',    emoji: '🐦',  wikiTitle: 'Bird' },
      { tamil: 'பழம்',    roman: 'pazham',  meaning: 'fruit',   emoji: '🍎',  wikiTitle: 'Fruit' },
      { tamil: 'பசு',     roman: 'pasu',    meaning: 'cow',     emoji: '🐄',  wikiTitle: 'Cattle' },
      { tamil: 'பள்ளி',  roman: 'palli',   meaning: 'school',  emoji: '🏫',  wikiTitle: 'School' },
    ],
  },
  {
    letter: 'ம', transliteration: 'ma',
    words: [
      { tamil: 'மரம்',    roman: 'maram',   meaning: 'tree',    emoji: '🌳',  wikiTitle: 'Tree' },
      { tamil: 'மலர்',    roman: 'malar',   meaning: 'flower',  emoji: '🌺',  wikiTitle: 'Flower' },
      { tamil: 'மழை',     roman: 'mazhai',  meaning: 'rain',    emoji: '🌧️', wikiTitle: 'Rain' },
      { tamil: 'மான்',    roman: 'maan',    meaning: 'deer',    emoji: '🦌',  wikiTitle: 'Deer' },
      { tamil: 'மல்லிகை', roman: 'malligai', meaning: 'jasmine', emoji: '🌼', wikiTitle: 'Jasmine' },
    ],
  },
  {
    letter: 'ய', transliteration: 'ya',
    words: [
      { tamil: 'யானை',   roman: 'yaanai', meaning: 'elephant', emoji: '🐘', wikiTitle: 'Asian elephant' },
      { tamil: 'யாழ்',   roman: 'yaazh',  meaning: 'lute',     emoji: '🎸', wikiTitle: 'Lute' },
      { tamil: 'யோகம்', roman: 'yogam',  meaning: 'yoga',     emoji: '🧘', wikiTitle: 'Yoga' },
      { tamil: 'யாரு',   roman: 'yaaru',  meaning: 'who',      emoji: '🤷' },
    ],
  },
  {
    letter: 'ர', transliteration: 'ra',
    words: [
      { tamil: 'ரோஜா',    roman: 'roojaa',   meaning: 'rose',      emoji: '🌹', wikiTitle: 'Rose' },
      { tamil: 'ரதம்',    roman: 'ratham',   meaning: 'chariot',   emoji: '🏎️', wikiTitle: 'Chariot' },
      { tamil: 'ராஜா',   roman: 'raajaa',   meaning: 'king',      emoji: '👑', wikiTitle: 'King' },
      { tamil: 'ரம்மியம்', roman: 'rammiyam', meaning: 'beautiful', emoji: '✨' },
    ],
  },
  {
    letter: 'ல', transliteration: 'la',
    words: [
      { tamil: 'லாரி',     roman: 'laari',    meaning: 'truck',   emoji: '🚛', wikiTitle: 'Truck' },
      { tamil: 'லட்டு',   roman: 'laddu',    meaning: 'sweet',   emoji: '🍬', wikiTitle: 'Laddu' },
      { tamil: 'லயம்',    roman: 'layam',    meaning: 'rhythm',  emoji: '🎶' },
      { tamil: 'லட்சியம்', roman: 'lacchiyam', meaning: 'goal',  emoji: '🎯' },
    ],
  },
  {
    letter: 'வ', transliteration: 'va',
    words: [
      { tamil: 'வீடு',    roman: 'veedu',   meaning: 'house',   emoji: '🏠', wikiTitle: 'House' },
      { tamil: 'வானம்',  roman: 'vaanam',  meaning: 'sky',     emoji: '🌤️', wikiTitle: 'Sky' },
      { tamil: 'வாழை',   roman: 'vaazhai', meaning: 'banana',  emoji: '🍌', wikiTitle: 'Banana' },
      { tamil: 'வண்ணம்', roman: 'vannam',  meaning: 'color',   emoji: '🎨', wikiTitle: 'Color' },
      { tamil: 'வண்டி',  roman: 'vandi',   meaning: 'vehicle', emoji: '🚗', wikiTitle: 'Vehicle' },
    ],
  },
  {
    letter: 'ழ', transliteration: 'zha',
    words: [
      { tamil: 'தமிழ்',  roman: 'thamizh2', meaning: 'Tamil',       emoji: '📜' },
      { tamil: 'வாழை',   roman: 'vaazhai2', meaning: 'banana',      emoji: '🍌', wikiTitle: 'Banana' },
      { tamil: 'முழம்',  roman: 'muzham',   meaning: 'forearm',     emoji: '📏' },
      { tamil: 'தாழ்',   roman: 'thaazh',   meaning: 'lock',        emoji: '🔒', wikiTitle: 'Lock' },
    ],
  },
  {
    letter: 'ள', transliteration: 'la2',
    words: [
      { tamil: 'கள்',    roman: 'kal',     meaning: 'toddy',   emoji: '🍶' },
      { tamil: 'வள்ளி', roman: 'valli',   meaning: 'Valli',   emoji: '🌿' },
      { tamil: 'ஆள்',   roman: 'aal',     meaning: 'person',  emoji: '👤' },
    ],
  },
  {
    letter: 'ற', transliteration: 'tra',
    words: [
      { tamil: 'மற்றும்', roman: 'matrum',  meaning: 'and',         emoji: '➕' },
      { tamil: 'பற்று',   roman: 'patru',   meaning: 'attachment',  emoji: '💪' },
      { tamil: 'உற்றார்', roman: 'utraar',  meaning: 'relatives',   emoji: '👨‍👩‍👧' },
    ],
  },
  {
    letter: 'ன', transliteration: 'na4',
    words: [
      { tamil: 'மன்னன்', roman: 'mannan',  meaning: 'king',  emoji: '👑', wikiTitle: 'King' },
      { tamil: 'கன்னம்', roman: 'kannam',  meaning: 'cheek', emoji: '😊' },
      { tamil: 'பன்றி',  roman: 'pundri', meaning: 'pig',   emoji: '🐷', wikiTitle: 'Pig' },
      { tamil: 'உன்னை',  roman: 'unnai',   meaning: 'you',   emoji: '👆' },
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
  { tamil: 'ஐந்து',  roman: 'aindhu2', meaning: 'five',  emoji: '5️⃣' },
  { tamil: 'ஆறு',    roman: 'aaru2',   meaning: 'six',   emoji: '6️⃣' },
  { tamil: 'ஏழு',    roman: 'eezhu2',  meaning: 'seven', emoji: '7️⃣' },
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
  { tamil: 'தலை',    roman: 'thalai2', meaning: 'head',  emoji: '🧠', wikiTitle: 'Head' },
  { tamil: 'கண்',    roman: 'kan3',    meaning: 'eye',   emoji: '👁️', wikiTitle: 'Eye' },
  { tamil: 'மூக்கு', roman: 'mookku',  meaning: 'nose',  emoji: '👃', wikiTitle: 'Nose' },
  { tamil: 'வாய்',   roman: 'vaai',    meaning: 'mouth', emoji: '👄', wikiTitle: 'Mouth' },
  { tamil: 'காது',   roman: 'kaadhu',  meaning: 'ear',   emoji: '👂', wikiTitle: 'Ear' },
  { tamil: 'கை',     roman: 'kai2',    meaning: 'hand',  emoji: '🤚', wikiTitle: 'Hand' },
]

const COMMON_WORDS: BasicWord[] = [
  { tamil: 'வீடு',    roman: 'veedu2',   meaning: 'house',    emoji: '🏠', wikiTitle: 'House' },
  { tamil: 'மரம்',    roman: 'maram2',   meaning: 'tree',     emoji: '🌳', wikiTitle: 'Tree' },
  { tamil: 'நீர்',    roman: 'neer',     meaning: 'water',    emoji: '💧', wikiTitle: 'Water' },
  { tamil: 'சூரியன்', roman: 'suuriyan2', meaning: 'sun',    emoji: '☀️', wikiTitle: 'Sun' },
  { tamil: 'நிலா',    roman: 'nilaa2',   meaning: 'moon',     emoji: '🌙', wikiTitle: 'Moon' },
  { tamil: 'மலை',     roman: 'malai',    meaning: 'mountain', emoji: '⛰️', wikiTitle: 'Mountain' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveWord(w: { tamil: string; roman: string; meaning: string; emoji: string; wikiTitle?: string }, prefix: string) {
  const audioUrl = await downloadAudio(w.tamil, `${prefix}_${safe(w.roman)}.mp3`)
  const imageUrl = w.wikiTitle
    ? await downloadWikiImage(w.wikiTitle, `${prefix}_${safe(w.roman)}.jpg`) ?? w.emoji
    : w.emoji
  return { audioUrl, imageUrl }
}

async function createLetterChapter(unitId: ObjectId, letter: LetterData, order: number) {
  const chapter = await Chapter.create({ unit_id: unitId, title: letter.letter, order, is_published: true })

  // Letter intro audio: prefer Wikimedia ogg, fall back to TTS
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
    const { audioUrl, imageUrl } = await resolveWord(w, `word`)
    await ContentBlock.create({
      section_id: wordsSection._id, type: 'WORD', order: i + 1,
      tamil_text: w.tamil, transliteration: w.roman, translation: w.meaning,
      audio_url: audioUrl, image_url: imageUrl,
    })
    resolvedWords.push({ ...w, audioUrl, imageUrl })
  }

  // Page 3 — Matching quiz (word ↔ image)
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

  // Page 1 — Gallery
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

  // Page 2 — Matching quiz
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

  // Unit 2 — Mei Ezhuthu
  const meiUnit = await Unit.create({ grade_id: grade._id, title: 'Mei Ezhuthu', order: 2, description: 'மெய் எழுத்து — Tamil consonants (18 letters)' })
  for (let i = 0; i < CONSONANTS.length; i++) {
    process.stdout.write(`Consonant ${CONSONANTS[i].letter}... `)
    await createLetterChapter(meiUnit._id as ObjectId, CONSONANTS[i], i + 1)
    process.stdout.write('✓\n')
  }

  // Unit 3 — Short Stories
  const storiesUnit = await Unit.create({ grade_id: grade._id, title: 'Short Stories', order: 3, description: 'சிறுகதைகள் — Simple Tamil stories' })
  const story1 = await Chapter.create({ unit_id: storiesUnit._id, title: 'நல்ல பையன்', order: 1, is_published: true })
  const storyPage = await Section.create({ chapter_id: story1._id, title: 'கதை', section_type: 'STORY', order: 1 })
  const storyLines = [
    { tamil: 'ஒரு சிறுவன் இருந்தான்.',    translation: 'There was a little boy.' },
    { tamil: 'அவன் தினமும் படித்தான்.',    translation: 'He studied every day.' },
    { tamil: 'அவன் அம்மாவுக்கு உதவினான்.', translation: 'He helped his mother.' },
    { tamil: 'ஆசிரியர் அவனை மெச்சினார்.',  translation: 'The teacher praised him.' },
  ]
  for (const [i, l] of storyLines.entries()) {
    const audioUrl = await downloadAudio(l.tamil, `story1_line${i + 1}.mp3`)
    await ContentBlock.create({ section_id: storyPage._id, type: 'PARAGRAPH', order: i + 1, tamil_text: l.tamil, translation: l.translation, audio_url: audioUrl })
  }
  const storyQuizPage = await Section.create({ chapter_id: story1._id, title: 'வினா விடை', section_type: 'QUIZ_MCQ', order: 2 })
  const q1 = await ContentBlock.create({ section_id: storyQuizPage._id, type: 'QUIZ_QUESTION', order: 1, tamil_text: 'சிறுவன் தினமும் என்ன செய்தான்?', translation: 'What did the boy do every day?' })
  await ContentBlock.create({ parent_id: q1._id, type: 'QUIZ_OPTION', order: 1, tamil_text: 'படித்தான்',     translation: 'Studied', is_correct: true  })
  await ContentBlock.create({ parent_id: q1._id, type: 'QUIZ_OPTION', order: 2, tamil_text: 'தூங்கினான்',    translation: 'Slept',   is_correct: false })
  await ContentBlock.create({ parent_id: q1._id, type: 'QUIZ_OPTION', order: 3, tamil_text: 'விளையாடினான்', translation: 'Played',  is_correct: false })
  console.log('✓ Story: நல்ல பையன்')

  // Unit 4 — Short Songs
  const songsUnit = await Unit.create({ grade_id: grade._id, title: 'Short Songs', order: 4, description: 'பாடல்கள் — Tamil songs and rhymes' })
  const song1 = await Chapter.create({ unit_id: songsUnit._id, title: 'மழை மழை', order: 1, is_published: true })
  const songPage = await Section.create({ chapter_id: song1._id, title: 'பாடல்', section_type: 'SONG', order: 1 })
  const songLines = [
    { tamil: 'மழை மழை வா வா',         roman: 'mazhai mazhai vaa vaa',  translation: 'Rain rain come come' },
    { tamil: 'வயலில் பொழி வா',         roman: 'vayalil pozhi vaa',      translation: 'Pour down in the fields' },
    { tamil: 'பயிர் பயிர் வளர வா',     roman: 'payir payir valara vaa', translation: 'Come to grow the crops' },
    { tamil: 'பசுமை கொண்டு வா',        roman: 'passumai kondu vaa',     translation: 'Bring the greenery' },
  ]
  for (const [i, l] of songLines.entries()) {
    const audioUrl = await downloadAudio(l.tamil, `song1_line${i + 1}.mp3`)
    await ContentBlock.create({ section_id: songPage._id, type: 'SENTENCE', order: i + 1, tamil_text: l.tamil, transliteration: l.roman, translation: l.translation, audio_url: audioUrl })
  }
  console.log('✓ Song: மழை மழை')

  // Unit 5 — Basic Words
  const basicUnit = await Unit.create({ grade_id: grade._id, title: 'Basic Words', order: 5, description: 'அடிப்படை வார்த்தைகள்' })
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
