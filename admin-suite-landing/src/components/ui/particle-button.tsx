import * as React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { ButtonProps } from "@/components/ui/button"
import { MousePointerClick } from "lucide-react"

interface ParticleButtonProps extends ButtonProps {
  onSuccess?: () => void
  successDuration?: number
  href?: string
  download?: boolean
}

function SuccessParticles({
  buttonRef,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>
}) {
  const rect = buttonRef.current?.getBoundingClientRect()
  if (!rect) return null

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  return (
    <AnimatePresence>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed w-1.5 h-1.5 rounded-full pointer-events-none z-[9999]"
          style={{
            left: centerX,
            top: centerY,
            backgroundColor: i % 2 === 0 ? '#5e6ad2' : '#34d399',
          }}
          initial={{ scale: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1.5, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 60 + 20)],
            y: [0, -(Math.random() * 70 + 20)],
          }}
          transition={{
            duration: 0.7,
            delay: i * 0.05,
            ease: "easeOut",
          }}
        />
      ))}
    </AnimatePresence>
  )
}

function ParticleButton({
  children,
  onClick,
  onSuccess,
  successDuration = 1000,
  className,
  href,
  download,
  ...props
}: ParticleButtonProps) {
  const [showParticles, setShowParticles] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowParticles(true)
    onClick?.(e)
    setTimeout(() => {
      setShowParticles(false)
      onSuccess?.()
      // Navigate to the APK URL — browsers will trigger download automatically for .apk files
      if (href) {
        window.open(href, '_blank')
      }
    }, 400)
  }

  return (
    <>
      {showParticles && <SuccessParticles buttonRef={buttonRef} />}
      <Button
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          "relative transition-transform duration-100",
          showParticles && "scale-95",
          className
        )}
        {...props}
      >
        {children}
        <MousePointerClick className="h-4 w-4 ml-1" />
      </Button>
    </>
  )
}

export { ParticleButton }
