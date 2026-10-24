import { useId } from 'react'

// Decorative calligraphic line art in a gold gradient, drawn in SVG. Purely ornamental:
// hidden from screen readers and never placed over content.

// Bronze to champagne. Decorative only: never used for text or data.
const GOLD = ['#8c6a3a', '#b38c50', '#d9bd86']

function GoldGradient({ id, x1, y1, x2, y2, stops = GOLD }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map((color, i) => (
        <stop key={i} offset={i / (stops.length - 1)} stopColor={color} />
      ))}
    </linearGradient>
  )
}

// React ids contain characters that url(#...) references can trip over.
function useGradientId() {
  return `gold${useId().replace(/[^a-zA-Z0-9]/g, '')}`
}

// A horizontal swash with mirrored curls and a small bud in the centre, used as a divider.
export function Swash({ className }) {
  const gold = useGradientId()
  return (
    <svg className={className} viewBox="0 0 200 24" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id={gold} x1="0" y1="0" x2="200" y2="0" stops={[GOLD[2], GOLD[0], GOLD[2]]} />
      </defs>
      <g fill="none" stroke={`url(#${gold})`} strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d="M2 12 C 32 12 50 4 70 10 C 82 14 80 22 72 20 C 64 18 70 8 84 10 C 92 11 96 12 100 12" />
        <path d="M198 12 C 168 12 150 4 130 10 C 118 14 120 22 128 20 C 136 18 130 8 116 10 C 108 11 104 12 100 12" />
      </g>
      <path
        fill={`url(#${gold})`}
        d="M100 14C97.1 11.2 97 6.4 99.8 2.6C99 6.2 99.2 9.8 100 14ZM100 14C100 9.8 99.7 6.2 99.8 2.6C102.1 6.3 102.2 11.1 100 14ZM100 14C96.8 14.6 93.6 12.4 92.5 8.8C94.5 11 96.9 12.5 100 14ZM100 14C97.3 12 94.8 10.5 92.5 8.8C96 9 99.1 11.2 100 14ZM100 14C100.4 10.8 103.5 8.5 107.3 8.5C104.6 9.7 102.4 11.5 100 14ZM100 14C102.7 12 104.9 10.2 107.3 8.5C106 11.7 102.9 14.1 100 14Z"
      />
    </svg>
  )
}

// Corner flourish: a vine rising up the left side and running along the bottom, with
// spiralling tendrils, veined leaves, a three-petal bud and seed dots. Drawn for the
// bottom-left corner; rotate it 180° for the top-right.
const STEM =
  'M64 16 C48 44 50 70 66 92 C82 114 80 140 62 162 C46 182 46 208 62 228 C78 248 88 274 116 288 C144 302 172 288 202 292 C232 296 250 310 278 302 C292 298 302 290 310 284'

const TENDRILS = [
  'M53 52.4 C63.5 40.4 67.6 30.7 81.9 28.2 C88.4 27 93.2 32.6 94.1 38.2 C95.1 43.8 90.2 47.6 85.5 48.5 C80.8 49.3 77.9 45 77.2 41.2 C76.5 37.4 80.3 35.4 83.1 34.9 C85.9 34.4 87.1 37.5 87.4 39.4',
  'M76.8 127 C63.7 114.6 55.2 101.2 38.4 98.2 C30.8 96.9 25.3 103.4 24.2 109.9 C23 116.4 28.8 120.9 34.3 121.8 C39.7 122.8 43.1 117.7 43.9 113.4 C44.6 109 40.3 106.7 37 106.1 C33.8 105.5 32.4 109.1 32.1 111.3',
  'M50.7 203.3 C61.1 188.6 69.6 180.7 83.9 178.2 C90.4 177 95.2 182.6 96.1 188.2 C97.1 193.8 92.2 197.6 87.5 198.5 C82.8 199.3 79.9 195 79.2 191.2 C78.5 187.4 82.3 185.4 85.1 184.9 C87.9 184.4 89.1 187.5 89.4 189.4',
  'M84.5 260.3 C65.3 266 67 268 50 268 C42.3 268 38 275.4 38 282 C38 288.6 44.5 292 50 292 C55.5 292 58 286.4 58 282 C58 277.6 53.3 276 50 276 C46.7 276 46 279.8 46 282',
  'M162.5 293.3 C177.3 277.1 191 277.8 191 262 C191 254.8 197.9 250.9 204 250.9 C210.1 250.9 213.2 256.9 213.2 262 C213.2 267.1 208 269.3 204 269.3 C200 269.3 198.6 265 198.6 262 C198.6 259 202.1 258.5 204 258.5',
  'M240.8 301.5 C260.2 291.3 274 283 274 266 C274 258.3 281.4 254 288 254 C294.6 254 298 260.5 298 266 C298 271.5 292.4 274 288 274 C283.6 274 282 269.3 282 266 C282 262.7 285.8 262 288 262',
  'M75.4 247.1 C83.5 231 100 238 118 224',
]

// Each leaf is two filled halves; the gap between them is the vein.
const LEAVES =
  'M64 16C60.4 7 64.8 -3.7 74.7 -9.2C69.5 -2.2 66.3 5.9 64 16ZM64 16C68 6.8 71 -1.4 74.7 -9.2C76.1 1.1 71.7 11.7 64 16ZM57.5 76.9C46 80.6 33.1 74.2 27 61.4C35.3 68.5 45.1 73.1 57.5 76.9ZM57.5 76.9C46.3 71.1 36.4 66.6 27 61.4C39.9 60.5 52.9 66.9 57.5 76.9ZM69.5 97.4C61.6 86.5 63.9 70.7 75.4 59.8C70.8 71.1 69.3 83 69.5 97.4ZM69.5 97.4C71.8 83.6 73.1 71.6 75.4 59.8C80.8 73.2 78.4 89.1 69.5 97.4ZM68.6 152.5C72.9 141.9 85.4 136.4 98.4 139.9C88.1 141.6 78.9 145.9 68.6 152.5ZM68.6 152.5C79.6 148 88.8 143.5 98.4 139.9C91.1 149.7 78.6 155.2 68.6 152.5ZM51.9 181.3C40.5 178 33.6 165.8 35.7 152C38.5 162.4 44 171.5 51.9 181.3ZM51.9 181.3C46 170.5 40.4 161.4 35.7 152C46.6 158.4 53.6 170.7 51.9 181.3ZM104.5 281C111.1 270 125.8 266.2 139.6 272.2C128 272.4 117 275.5 104.5 281ZM104.5 281C117.4 277.9 128.4 274.6 139.6 272.2C129.8 281.9 115.1 285.7 104.5 281ZM141.3 294.3C152 293 162.2 300.8 165.3 313C159.2 305.4 151.4 299.7 141.3 294.3ZM141.3 294.3C150.1 301.3 157.9 306.9 165.3 313C153.8 311.6 143.7 303.8 141.3 294.3ZM212.3 293.8C215 281.3 227.6 272.9 242.6 274.1C231.7 278 222.3 284.5 212.3 293.8ZM212.3 293.8C223.5 286.7 232.8 280 242.6 274.1C236.5 286.4 223.9 294.8 212.3 293.8ZM266 304.2C274.9 301.1 285 305.9 289.9 315.9C283.3 310.5 275.7 307 266 304.2ZM266 304.2C274.8 308.6 282.5 311.9 289.9 315.9C279.9 316.7 269.7 311.9 266 304.2ZM310 284C310.3 275.1 318 267.8 328.4 266.9C321.4 270.8 315.7 276.4 310 284ZM310 284C316.8 277.8 322.4 272.1 328.4 266.9C325.7 276 318 283.3 310 284ZM118 224C112.3 220.4 110.4 212.6 113.7 205.5C113.7 211.6 115.2 217.4 118 224ZM118 224C116.5 217.2 114.9 211.4 113.7 205.5C118.7 210.7 120.6 218.5 118 224ZM118 224C117.2 216 123.1 208.4 132.4 206.3C126.6 210.7 122.2 216.5 118 224ZM118 224C123.4 217.5 127.6 211.7 132.4 206.3C131.1 214.8 125.1 222.4 118 224ZM118 224C122.8 219.3 130.9 219.4 137 224.3C131.1 222.8 125.1 222.9 118 224ZM118 224C125 224.2 131 224 137 224.3C130.8 227.9 122.7 227.8 118 224Z'

// [cx, cy, r]: the knob at the end of each tendril, then the seed dots by each tip.
const DOTS = [
  [87.4, 39.4, 3.3], [32.1, 111.3, 3.3], [89.4, 189.4, 3.3], [46, 282, 3.3], [204, 258.5, 3.3], [288, 262, 3.3],
  [83, 12, 2.6], [91, 19, 2], [80, 22, 1.6],
  [318, 272, 2.4], [310, 264, 1.9], [305, 272, 1.5],
]

export function Flourish({ className }) {
  const gold = useGradientId()
  const paint = `url(#${gold})`
  return (
    <svg className={className} viewBox="0 -14 334 334" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id={gold} x1="40" y1="20" x2="300" y2="310" />
      </defs>
      <g fill="none" stroke={paint} strokeLinecap="round" strokeLinejoin="round">
        <path d={STEM} strokeWidth="2.8" />
        <g strokeWidth="1.9">
          {TENDRILS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <g fill={paint}>
        <path d={LEAVES} />
        {DOTS.map(([cx, cy, r]) => (
          <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  )
}
