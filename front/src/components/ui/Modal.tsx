import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
  maxWidthClass?: string
}

export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  maxWidthClass = 'max-w-[540px]',
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-space-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`relative w-full ${maxWidthClass} max-h-[90vh] bg-surface-container-lowest border border-field-border rounded shadow-lg flex flex-col overflow-hidden`}
        role="dialog"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
