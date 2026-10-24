// Decorative calligraphic line art (drawn in SVG, coloured with currentColor). Purely
// ornamental: hidden from screen readers and never placed over content.

// A horizontal swash with mirrored curls and a centre dot, used as a divider.
export function Swash({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d="M2 12 C 32 12 50 4 70 10 C 82 14 80 22 72 20 C 64 18 70 8 84 10 C 92 11 96 12 100 12" />
        <path d="M198 12 C 168 12 150 4 130 10 C 118 14 120 22 128 20 C 136 18 130 8 116 10 C 108 11 104 12 100 12" />
      </g>
      <path d="M100 7 L 103 12 L 100 17 L 97 12 Z" fill="currentColor" />
    </svg>
  )
}

// A tall flowing vine with tendrils and leaves, used along the sides of the page.
export function Vine({ className }) {
  return (
    <svg className={className} viewBox="0 0 60 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d="M30 8 C 52 60 8 110 30 160 C 52 210 8 260 30 320 C 52 380 8 430 30 480 C 52 530 8 580 30 632" />
        <path d="M41 70 C 58 66 60 88 48 92 C 40 95 38 84 46 83" />
        <path d="M19 230 C 2 226 0 248 12 252 C 20 255 22 244 14 243" />
        <path d="M41 390 C 58 386 60 408 48 412 C 40 415 38 404 46 403" />
        <path d="M19 550 C 2 546 0 568 12 572 C 20 575 22 564 14 563" />
      </g>
      <g fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
        <path d="M30 160 C 40 150 50 152 54 140 C 42 138 33 146 30 160 Z" />
        <path d="M30 320 C 20 310 10 312 6 300 C 18 298 27 306 30 320 Z" />
        <path d="M30 480 C 40 470 50 472 54 460 C 42 458 33 466 30 480 Z" />
      </g>
      <g fill="currentColor">
        <circle cx="30" cy="8" r="2" />
        <circle cx="30" cy="632" r="2" />
        <circle cx="46" cy="83" r="1.4" />
        <circle cx="14" cy="243" r="1.4" />
        <circle cx="46" cy="403" r="1.4" />
        <circle cx="14" cy="563" r="1.4" />
      </g>
    </svg>
  )
}
