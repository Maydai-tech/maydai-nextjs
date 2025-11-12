'use client'

import { useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  label: string
  helpText?: string
  acceptedFormats: string
  onFileSelected: (file: File) => void
  onFileRemoved?: () => void
}

export default function ComplianceFileUpload({ label, helpText, acceptedFormats, onFileSelected, onFileRemoved }: Props) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onPick = () => inputRef.current?.click()

  const onRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedName(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    onFileRemoved?.()
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedName(file.name)
    onFileSelected(file)
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setSelectedName(file.name)
    onFileSelected(file)
  }, [onFileSelected])

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${dragActive ? 'border-[#0080A3] bg-[#0080A3]/5' : 'border-gray-300 hover:bg-gray-50'}`}
        onClick={onPick}
      >
        <p className="text-gray-700">Glissez-déposez un fichier ici</p>
        <p className="text-gray-500 text-sm">ou cliquez pour sélectionner</p>
        {selectedName && (
          <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-medium">Sélectionné: {selectedName}</p>
            <button
              onClick={onRemove}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title="Retirer le fichier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats}
        className="hidden"
        onChange={onChange}
      />
    </div>
  )
}


