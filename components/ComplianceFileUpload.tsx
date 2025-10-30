'use client'

import { useCallback, useRef, useState } from 'react'

interface Props {
  label: string
  helpText?: string
  acceptedFormats: string
  onFileSelected: (file: File) => void
}

export default function ComplianceFileUpload({ label, helpText, acceptedFormats, onFileSelected }: Props) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onPick = () => inputRef.current?.click()

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
          <p className="mt-2 text-sm text-gray-600">Sélectionné: {selectedName}</p>
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


