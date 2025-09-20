import React from 'react'
import '@/styles/image-optimization.css'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  width?: number
  height?: number
}

export function OptimizedImage({ src, alt, className, loading = 'lazy', width, height }: OptimizedImageProps) {
  const isKatc = src.includes('katc') || src.includes('f4d8d7cb')
  const isMihas = src.includes('mihas') || src.includes('f703f321')
  
  if (isKatc || isMihas) {
    return (
      <div
        className={`${className} ${isKatc ? 'katc-campus-bg' : 'mihas-campus-bg'} optimized-image`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} optimized-image`}
      loading={loading}
      width={width}
      height={height}
      style={{
        maxWidth: '100%',
        height: 'auto',
        imageRendering: 'crisp-edges'
      }}
    />
  )
}