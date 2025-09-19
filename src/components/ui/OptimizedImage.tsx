import React, { useState } from 'react'
import { motion } from 'framer-motion'

type MotionImageProps = React.ComponentProps<typeof motion.img>

interface OptimizedImageProps
  extends Omit<MotionImageProps, 'src' | 'alt' | 'className' | 'onLoad' | 'onError'> {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  fallback?: string
  onLoad?: MotionImageProps['onLoad']
  onError?: MotionImageProps['onError']
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  loading = 'lazy',
  fallback = '/images/placeholder.svg',
  onLoad,
  onError,
  ...motionImageProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <motion.img
        {...motionImageProps}
        src={hasError ? fallback : src}
        alt={alt}
        loading={loading}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } max-h-full max-w-full object-contain ${imgClassName}`.trim()}
        onLoad={event => {
          setIsLoaded(true)
          onLoad?.(event)
        }}
        onError={event => {
          setHasError(true)
          setIsLoaded(true)
          onError?.(event)
        }}
        initial={{ scale: 0.9 }}
        animate={{ scale: isLoaded ? 1 : 0.9 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}