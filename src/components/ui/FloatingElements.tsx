import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

interface FloatingElementsProps {
  count?: number
  className?: string
}

export function FloatingElements({ count = 20, className = '' }: FloatingElementsProps) {
  const elements = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 3, // 3-9px
    left: Math.random() * 100, // 0-100%
    delay: Math.random() * 8, // 0-8s delay
    duration: 6 + Math.random() * 4, // 6-10s duration
    opacity: 0.1 + Math.random() * 0.3 // 0.1-0.4 opacity
  })), [count])

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute rounded-full"
          style={{
            width: element.size,
            height: element.size,
            left: `${element.left}%`,
            background: `radial-gradient(circle, rgba(20, 184, 166, ${element.opacity}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [-50, -100, -50],
            x: [0, 30, -30, 0],
            scale: [1, 1.2, 0.8, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: element.duration,
            delay: element.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

export function GeometricPatterns() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
      {/* Animated geometric shapes */}
      <motion.div
        className="absolute top-10 right-10 w-32 h-32 border-2 border-primary rounded-full"
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      <motion.div
        className="absolute bottom-20 left-10 w-24 h-24 bg-gradient-to-r from-secondary to-accent rounded-lg"
        animate={{ 
          rotate: -360,
          y: [0, -20, 0]
        }}
        transition={{ 
          rotate: { duration: 15, repeat: Infinity, ease: "linear" },
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      <motion.div
        className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-accent transform rotate-45"
        animate={{ 
          rotate: [45, 225, 45],
          scale: [1, 0.8, 1]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      
      <motion.div
        className="absolute top-1/4 right-1/3 w-20 h-20 bg-gradient-radial from-primary/20 to-transparent rounded-full"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.1, 0.3]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
    </div>
  )
}