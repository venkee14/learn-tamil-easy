import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useChapter, useChapters } from '../hooks/index.js'
import { ContentBlockRenderer } from '../components/ContentBlockRenderer.js'
import { QuizBlock } from '../components/quiz/QuizBlock.js'
import { MatchingQuiz } from '../components/quiz/MatchingQuiz.js'
import { AudioButton } from '../components/blocks/AudioButton.js'
import type { ContentBlock, Section } from '../types/index.js'

function FlashCard({ block }: { block: ContentBlock }) {
  const isUrl = block.image_url && (block.image_url.startsWith('http') || block.image_url.startsWith('/'))
  const isEmoji = block.image_url && !isUrl

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Image area */}
      <div className="w-full max-w-xs aspect-square rounded-3xl bg-indigo-50 flex items-center justify-center overflow-hidden shadow-md">
        {isUrl ? (
          <img
            src={block.image_url!}
            alt={block.translation ?? block.tamil_text}
            className="w-full h-full object-cover"
          />
        ) : isEmoji ? (
          <span className="text-9xl">{block.image_url}</span>
        ) : (
          <span className="text-9xl text-gray-200">?</span>
        )}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-6xl font-bold text-indigo-700 mb-2" style={{ lineHeight: '1.6' }}>{block.tamil_text}</p>
        {block.transliteration && (
          <p className="text-xl text-gray-500 mb-1">{block.transliteration}</p>
        )}
        {block.translation && (
          <p className="text-lg text-indigo-400 font-medium">{block.translation}</p>
        )}
      </div>

      <AudioButton url={block.audio_url} text={block.tamil_text} />
    </div>
  )
}

function GallerySection({
  section,
  canGoPrevPage,
  canGoNextPage,
  goPrevPage,
  goNextPage,
  nextChapterTitle,
  goNextChapter,
}: {
  section: Section
  canGoPrevPage: boolean
  canGoNextPage: boolean
  goPrevPage: () => void
  goNextPage: () => void
  nextChapterTitle?: string
  goNextChapter: () => void
}) {
  const [cardIndex, setCardIndex] = useState(0)
  const blocks = section.content_blocks
  const block = blocks[cardIndex]
  if (!block) return null

  const isFirstCard = cardIndex === 0
  const isLastCard = cardIndex === blocks.length - 1
  const atChapterEnd = isLastCard && !canGoNextPage

  const handlePrev = () => {
    if (!isFirstCard) setCardIndex((i) => i - 1)
    else if (canGoPrevPage) goPrevPage()
  }

  const handleNext = () => {
    if (!isLastCard) setCardIndex((i) => i + 1)
    else if (canGoNextPage) goNextPage()
    else if (nextChapterTitle) goNextChapter()
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
        {section.title}
      </h2>

      <FlashCard block={block} />

      {/* Card counter + navigation — crosses into the adjacent section at the first/last card */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={handlePrev}
          disabled={isFirstCard && !canGoPrevPage}
          className="px-5 py-3 rounded-xl border-2 border-indigo-200 text-indigo-600 font-semibold disabled:opacity-30 hover:bg-indigo-50 transition-colors"
        >
          ← Prev
        </button>

        <span className="text-sm text-gray-400 font-medium">
          {cardIndex + 1} / {blocks.length}
        </span>

        <button
          onClick={handleNext}
          disabled={atChapterEnd && !nextChapterTitle}
          className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-30 hover:bg-indigo-700 transition-colors"
        >
          {atChapterEnd && nextChapterTitle ? 'Next Chapter →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

function SectionView({
  section,
  canGoPrevPage,
  canGoNextPage,
  goPrevPage,
  goNextPage,
  nextChapterTitle,
  goNextChapter,
}: {
  section: Section
  canGoPrevPage: boolean
  canGoNextPage: boolean
  goPrevPage: () => void
  goNextPage: () => void
  nextChapterTitle?: string
  goNextChapter: () => void
}) {
  const { section_type, content_blocks, title } = section

  const heading = (
    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
      {title}
    </h2>
  )

  if (section_type === 'QUIZ_MATCHING') {
    const pairs = content_blocks.filter((b) => b.type === 'MATCHING_PAIR')
    const hasPictures = pairs.some(
      (p) => p.image_url && (p.image_url.startsWith('http') || p.image_url.startsWith('/'))
    )
    return (
      <div>
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">
          {hasPictures ? 'Match the word to its picture!' : 'Match the word to its meaning!'}
        </h2>
        <MatchingQuiz pairs={pairs} />
      </div>
    )
  }

  if (section_type === 'QUIZ_MCQ') {
    const questions = content_blocks.filter((b) => b.type === 'QUIZ_QUESTION')
    return (
      <div>
        {heading}
        <QuizBlock questions={questions} />
      </div>
    )
  }

  if (section_type === 'GALLERY') {
    return (
      <GallerySection
        section={section}
        canGoPrevPage={canGoPrevPage}
        canGoNextPage={canGoNextPage}
        goPrevPage={goPrevPage}
        goNextPage={goNextPage}
        nextChapterTitle={nextChapterTitle}
        goNextChapter={goNextChapter}
      />
    )
  }

  // INTRO, STORY, SONG — linear layout
  return (
    <div>
      {section_type !== 'INTRO' && heading}
      <div className="flex flex-col gap-4">
        {content_blocks.map((block) => (
          <ContentBlockRenderer key={block._id} block={block} />
        ))}
      </div>
    </div>
  )
}

export function ChapterPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const { data: chapter, isLoading, isError } = useChapter(chapterId ?? '')
  const { data: siblingChapters } = useChapters(chapter?.unit_id ?? '')
  const [pageIndex, setPageIndex] = useState(0)

  // ChapterPage stays mounted across /chapter/:chapterId navigations (same route),
  // so pageIndex must be reset explicitly or a "Next Chapter" click lands on the same page index.
  useEffect(() => {
    setPageIndex(0)
  }, [chapterId])

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (isError || !chapter) return <div className="p-8 text-center text-red-400">Chapter not found.</div>

  const sections = chapter.sections
  const section = sections[pageIndex]
  const totalPages = sections.length

  const currentIndex = siblingChapters?.findIndex((c) => c._id === chapter._id) ?? -1
  const nextChapter = currentIndex >= 0 ? siblingChapters?.[currentIndex + 1] : undefined
  const goNextChapter = () => { if (nextChapter) navigate(`/chapter/${nextChapter._id}`) }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button onClick={() => navigate(`/unit/${chapter.unit_id}`)} className="text-indigo-500 mb-6 hover:underline text-sm">
        ← Back to Chapters
      </button>

      <h1 className="text-4xl font-bold text-indigo-700 mb-2">{chapter.title}</h1>

      {/* Page indicator dots */}
      {totalPages > 1 && (
        <div className="flex gap-2 mb-8 mt-3">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => setPageIndex(i)}
              className={[
                'w-2.5 h-2.5 rounded-full transition-all',
                i === pageIndex ? 'bg-indigo-600 w-6' : 'bg-gray-300 hover:bg-gray-400',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {/* Current section */}
      <SectionView
        key={section._id}
        section={section}
        canGoPrevPage={pageIndex > 0}
        canGoNextPage={pageIndex < totalPages - 1}
        goPrevPage={() => setPageIndex((i) => i - 1)}
        goNextPage={() => setPageIndex((i) => i + 1)}
        nextChapterTitle={nextChapter?.title}
        goNextChapter={goNextChapter}
      />

      {/* Prev / Next navigation — Gallery sections have their own, which also crosses page boundaries.
          On the last page, Next becomes Next Chapter if there is one, instead of staying disabled. */}
      {totalPages > 1 && section.section_type !== 'GALLERY' && (
        <div className="flex justify-between mt-12">
          <button
            onClick={() => setPageIndex((i) => i - 1)}
            disabled={pageIndex === 0}
            className="px-6 py-3 rounded-xl border-2 border-indigo-200 text-indigo-600 font-semibold disabled:opacity-30 hover:bg-indigo-50 transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => (pageIndex < totalPages - 1 ? setPageIndex((i) => i + 1) : goNextChapter())}
            disabled={pageIndex === totalPages - 1 && !nextChapter}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-30 hover:bg-indigo-700 transition-colors"
          >
            {pageIndex === totalPages - 1 && nextChapter ? 'Next Chapter →' : 'Next →'}
          </button>
        </div>
      )}

      {/* Jump directly to the adjacent section, regardless of card position within it */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-8 mt-8 text-sm">
          <button
            onClick={() => setPageIndex((i) => i - 1)}
            disabled={pageIndex === 0}
            className="text-indigo-500 hover:underline disabled:opacity-30 disabled:no-underline font-medium"
          >
            ← Previous Section
          </button>
          <button
            onClick={() => (pageIndex < totalPages - 1 ? setPageIndex((i) => i + 1) : goNextChapter())}
            disabled={pageIndex === totalPages - 1 && !nextChapter}
            className="text-indigo-500 hover:underline disabled:opacity-30 disabled:no-underline font-medium"
          >
            {pageIndex === totalPages - 1 && nextChapter ? 'Next Chapter →' : 'Next Section →'}
          </button>
        </div>
      )}

      <button onClick={() => navigate(`/unit/${chapter.unit_id}`)} className="text-indigo-500 mt-10 hover:underline text-sm">
        ← Back to Chapters
      </button>
    </div>
  )
}
