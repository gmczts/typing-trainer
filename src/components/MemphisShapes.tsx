/**
 * Decorative Memphis shapes — rendered on the home screen only when the
 * Memphis theme is active. Pure decoration (aria-hidden), in normal flow
 * so they can never overlap text or buttons.
 */
export function MemphisShapes() {
  return (
    <div className="memphis-decor" aria-hidden="true">
      <span className="shape-triangle" />
      <svg className="shape-squiggle" viewBox="0 0 64 16" fill="none">
        <path
          d="M2 8 Q 10 1, 18 8 T 34 8 T 50 8 T 62 8"
          stroke="#FF6B6B"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="shape-stripes" />
    </div>
  )
}
