'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, AlertTriangle, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface Props {
  fileUrl: string
  onDelete: () => void
  isDeleting: boolean
}

export default function UploadedFileDisplay({ fileUrl, onDelete, isDeleting }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { getAccessToken } = useAuth()

  // Extract filename from URL
  const extractFilename = (url: string): string => {
    try {
      const parts = url.split('/')
      return decodeURIComponent(parts[parts.length - 1])
    } catch {
      return 'fichier'
    }
  }

  // Extract file path from URL for storage API
  const extractFilePath = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/dossiers\/(.+)/)
      return pathMatch ? pathMatch[1] : ''
    } catch {
      return ''
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} o`
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
    }
  }

  const filename = extractFilename(fileUrl)

  // Fetch file metadata to get size
  useEffect(() => {
    const fetchFileMetadata = async () => {
      try {
        const token = getAccessToken()
        if (!token) return

        const filePath = extractFilePath(fileUrl)
        if (!filePath) return

        // Fetch file metadata from Supabase
        const response = await fetch(`/api/storage/file-metadata?path=${encodeURIComponent(filePath)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setFileSize(data.size)
        }
      } catch (error) {
        console.error('Error fetching file metadata:', error)
      }
    }

    fetchFileMetadata()
  }, [fileUrl, getAccessToken])

  // Reset confirmation after 3 seconds
  useEffect(() => {
    if (confirmDelete) {
      timeoutRef.current = setTimeout(() => {
        setConfirmDelete(false)
      }, 3000)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [confirmDelete])

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
    }
  }

  const handleBlur = () => {
    // Reset on blur
    setTimeout(() => setConfirmDelete(false), 200)
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-[#0080A3]/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0080A3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
              {fileSize !== null && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  ({formatFileSize(fileSize)})
                </span>
              )}
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#0080A3] hover:underline mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              Voir le fichier
            </a>
          </div>
        </div>
        
        <button
          onClick={handleDeleteClick}
          onBlur={handleBlur}
          disabled={isDeleting}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
            confirmDelete
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDeleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Suppression...
            </>
          ) : confirmDelete ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              Supprimer ?
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

