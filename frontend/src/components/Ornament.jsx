import { useId } from 'react'

// Dried leaves for the page corners, in the taupe of the dried grass in SJ Perfume's photos.
// Purely ornamental: hidden from screen readers and never placed over content. The shapes are
// worked out once from a few control points (viewBox 0 0 320 320, drawn for the bottom-left).

const round = (n) => Math.round(n * 10) / 10
const pt = ([x, y]) => `${round(x)} ${round(y)}`
const polyline = (points) => `M${points.map(pt).join('L')}`
const steps = (n) => Array.from({ length: n + 1 }, (_, i) => i / n)

// Point and unit normal on a cubic curve [a, c1, c2, b].
function cubic([a, c1, c2, b], t) {
  const u = 1 - t
  const p = [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * b[k])
  const d = [0, 1].map((k) => 3 * u * u * (c1[k] - a[k]) + 6 * u * t * (c2[k] - c1[k]) + 3 * t * t * (b[k] - c2[k]))
  const length = Math.hypot(d[0], d[1]) || 1
  return { p, n: [-d[1] / length, d[0] / length] }
}

// A long blade along a curved spine, pointed at both ends and a little wider on one side.
// `twist` (0 to 1) pinches the blade at that point, like a turning ribbon.
function blade(curve, width, lean, twist = 0) {
  const left = []
  const right = []
  for (const t of steps(48)) {
    const { p, n } = cubic(curve, t)
    const pinch = twist ? 0.18 + 0.82 * Math.abs(Math.cos(Math.PI * (t - twist) * 1.3)) : 1
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.08)) ** 0.8 * (1 - 0.2 * t) * pinch
    left.push([p[0] + n[0] * w * (0.5 + lean), p[1] + n[1] * w * (0.5 + lean)])
    right.push([p[0] - n[0] * w * (0.5 - lean), p[1] - n[1] * w * (0.5 - lean)])
  }
  return {
    body: `${polyline([...left, ...right.reverse()])}Z`,
    rib: polyline(steps(30).map((t) => cubic(curve, 0.04 + t * 0.86).p)),
  }
}

// A small rounded leaf at p, pointing along `angle` (degrees).
function leaflet(p, angle, length) {
  const a = (angle * Math.PI) / 180
  const d = [Math.cos(a), Math.sin(a)]
  const n = [-d[1], d[0]]
  const w = length * 0.42
  const at = (along, side) => [p[0] + d[0] * length * along + n[0] * side, p[1] + d[1] * length * along + n[1] * side]
  return `M${pt(p)}C${pt(at(0.35, w))} ${pt(at(0.75, w * 0.8))} ${pt(at(1, 0))}C${pt(at(0.75, -w * 0.8))} ${pt(at(0.35, -w))} ${pt(p)}Z`
}

const directionAt = (curve, t) => {
  const { n } = cubic(curve, t)
  return (Math.atan2(-n[0], n[1]) * 180) / Math.PI
}

const BLADES = [
  blade([[12, 326], [34, 236], [8, 128], [74, 30]], 19, 0.2),
  blade([[16, 326], [66, 252], [104, 212], [176, 92]], 17, -0.12, 0.58),
  blade([[20, 326], [118, 306], [206, 262], [306, 214]], 15, 0.15),
  blade([[10, 326], [4, 262], [38, 196], [16, 120]], 11, 0.1, 0.62),
  blade([[26, 326], [138, 334], [214, 322], [278, 290]], 10, -0.15),
]

// A thin sprig with alternating leaflets, rising in the gap between two blades.
const SPRIG = [[22, 326], [104, 300], [150, 256], [226, 178]]
const SPRIG_LEAFLETS = [
  ...[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t, i) =>
    leaflet(cubic(SPRIG, t).p, directionAt(SPRIG, t) + (i % 2 ? 52 : -52), 15 + 7 * Math.sin(Math.PI * t)),
  ),
  leaflet(cubic(SPRIG, 1).p, directionAt(SPRIG, 1), 19),
].join('')

export function Leaves({ className }) {
  const id = `taupe${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg className={className} viewBox="0 0 320 320" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="320" x2="300" y2="40">
          <stop offset="0" stopColor="#a8957b" />
          <stop offset="0.6" stopColor="#c7b79f" />
          <stop offset="1" stopColor="#e2d7c6" />
        </linearGradient>
      </defs>
      <path d={BLADES.map((b) => b.body).join('')} fill={`url(#${id})`} fillOpacity="0.9" />
      <g fill="none" stroke="#8f7e67" strokeOpacity="0.45" strokeWidth="0.9" strokeLinecap="round">
        {BLADES.map((b) => (
          <path key={b.rib} d={b.rib} />
        ))}
      </g>
      <path d={polyline(steps(30).map((t) => cubic(SPRIG, t).p))} fill="none" stroke="#8a7d6c" strokeWidth="1.3" strokeLinecap="round" />
      <path d={SPRIG_LEAFLETS} fill="#9d8f7c" />
    </svg>
  )
}
