// Exhibit media for media-dependent questions (questions.image_url).
// Renders nothing when the question has no media, so it is safe to drop into
// any stem surface unconditionally. Video URLs (.mp4/.webm/.mov/.m4v) render
// as a click-to-play player — controls only, no autoplay, matching how the
// real exam presents video items. Images open full size in a new tab on click.
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i

export default function QuestionImage({ src, className = '', maxHeightClass = 'max-h-80' }) {
  if (!src) return null
  if (VIDEO_RE.test(src)) {
    return (
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className={`${maxHeightClass} w-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-black ${className}`}
      />
    )
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title="Open full size in a new tab"
      className={`block w-fit ${className}`}
    >
      <img
        src={src}
        alt="Question exhibit"
        loading="lazy"
        className={`${maxHeightClass} w-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white`}
      />
    </a>
  )
}
