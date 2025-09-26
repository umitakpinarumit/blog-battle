import React from 'react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onCancel: () => void
  onConfirm: () => void
  // Opsiyonel giriş alanı (düzenleme için)
  inputLabel?: string
  inputPlaceholder?: string
  inputValue?: string
  onInputChange?: (value: string) => void
}

export default function ConfirmModal({ open, title = 'Onay', description, confirmText = 'Sil', cancelText = 'Vazgeç', onCancel, onConfirm, inputLabel, inputPlaceholder, inputValue, onInputChange }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-[90%] max-w-md rounded-lg bg-white shadow-lg p-5">
        <div className="text-lg font-semibold">{title}</div>
        {description && <div className="mt-2 text-sm text-neutral-700">{description}</div>}
        {typeof inputLabel === 'string' && (
          <div className="mt-3">
            <label className="block text-xs text-neutral-600 mb-1">{inputLabel}</label>
            <input
              value={inputValue || ''}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800">{cancelText}</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}


