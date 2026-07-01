'use client'

import { useEffect, useMemo, useState } from 'react'

const DEFAULT_MARK = '/nexlabs-logo.png'
const DEFAULT_FULL = '/nexlabs-logo-full.png'

function sanitizeLogo(src?: string | null, variant: 'mark' | 'full' = 'mark') {
  const fallback = variant === 'full' ? DEFAULT_FULL : DEFAULT_MARK
  const value = String(src || '').trim()
  if (!value) return fallback
  if (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/')) return value
  return fallback
}

type BrandLogoProps = {
  src?: string | null
  alt?: string
  variant?: 'mark' | 'full'
  className?: string
  width?: number
  height?: number
  title?: string
}

export default function BrandLogo({ src, alt = 'VF Nexus', variant = 'mark', className = '', width, height, title }: BrandLogoProps) {
  const fallback = variant === 'full' ? DEFAULT_FULL : DEFAULT_MARK
  const resolved = useMemo(() => sanitizeLogo(src, variant), [src, variant])
  const [currentSrc, setCurrentSrc] = useState(resolved)

  useEffect(() => {
    setCurrentSrc(resolved)
  }, [resolved])

  return (
    <img
      src={currentSrc}
      alt={alt}
      title={title || alt}
      width={width}
      height={height}
      className={className}
      loading={variant === 'full' ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (currentSrc !== fallback) setCurrentSrc(fallback)
      }}
    />
  )
}
