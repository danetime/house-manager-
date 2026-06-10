import { useMemo } from 'react'
import { spriteFor } from '../sprites/sprites'

interface Props {
  type: string
  /** rendered height in CSS px (width scales to aspect) */
  size?: number
  className?: string
  title?: string
}

/** Renders a pixel-map sprite as crisp SVG rects. */
export function PixelSprite({ type, size = 40, className, title }: Props) {
  const def = spriteFor(type)
  const rects = useMemo(() => {
    const out: Array<{ x: number; y: number; c: string }> = []
    def.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]
        if (ch === '.' || ch === ' ') continue
        const c = def.palette[ch]
        if (c) out.push({ x, y, c })
      }
    })
    return out
  }, [def])

  const h = def.rows.length
  const w = Math.max(...def.rows.map((r) => r.length))

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={(size * w) / h}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated' }}
      role="img"
      aria-label={title ?? type}
    >
      {title && <title>{title}</title>}
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.c} />
      ))}
      {/* charm: flickering TV pixels */}
      {(type === 'tv' || type === 'monitor') && (
        <rect x={2} y={2} width={2} height={1} fill="#ffffff" opacity={0.9}>
          <animate attributeName="opacity" values="0.9;0.2;0.7;0.9" dur="1.6s" repeatCount="indefinite" />
        </rect>
      )}
    </svg>
  )
}
