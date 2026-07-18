import { useRef, useState } from 'react'

interface Props {
  url?: string
  text?: string
}

export function AudioButton({ url }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  if (!url) return null
  const src = url

  const toggle = () => {
    const el = ref.current
    if (!el) return
    if (playing) {
      el.pause()
      el.currentTime = 0
      setPlaying(false)
    } else {
      el.src = src
      el.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <audio ref={ref} onEnded={() => setPlaying(false)} onError={() => setPlaying(false)} />
      <button
        onClick={toggle}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xl transition-colors"
        aria-label={playing ? 'Stop audio' : 'Play pronunciation'}
      >
        {playing ? '⏹' : '🔊'}
      </button>
      <button
        onClick={toggle}
        className="text-indigo-500 hover:underline text-sm font-medium"
      >
        {playing ? 'Stop audio' : 'Click for audio'}
      </button>
    </div>
  )
}
