import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

/**
 * Reusable confirmation dialog component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.variant - Color variant: "danger", "warning", "info" (default: "danger")
 * @param {function} props.onConfirm - Called when user confirms
 * @param {function} props.onCancel - Called when user cancels
 * @param {boolean} props.isLoading - Show loading state on confirm button
 */
const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const dialogRef = useRef(null)
  const confirmBtnRef = useRef(null)

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when dialog opens
      confirmBtnRef.current?.focus()

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape' && !isLoading) {
          onCancel?.()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isLoading, onCancel])

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel?.()
    }
  }

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="confirm-dialog" ref={dialogRef}>
        <div className={`confirm-dialog-header ${variant}`}>
          <h3 id="confirm-dialog-title">{title}</h3>
        </div>

        <div className="confirm-dialog-body">
          <p>{message}</p>
        </div>

        <div className="confirm-dialog-footer">
          <button
            type="button"
            className="confirm-dialog-btn cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-dialog-btn confirm ${variant}`}
            onClick={onConfirm}
            disabled={isLoading}
            ref={confirmBtnRef}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
