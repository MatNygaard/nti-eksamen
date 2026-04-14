import { useState, useRef } from 'react'
import { Upload, X, FileText, Image, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export interface UploadedFile {
  name: string
  size: number
  type: string
  path: string
}

interface Props {
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FileUploadZone({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
}: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File): Promise<UploadedFile | null> => {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('inquiry-attachments')
      .upload(path, file, { contentType: file.type })
    if (error) return null
    return { name: file.name, size: file.size, type: file.type, path }
  }

  const handleFiles = async (incoming: File[]) => {
    setError(null)
    if (files.length + incoming.length > maxFiles) {
      setError(`Maks ${maxFiles} filer tillatt`)
      return
    }
    if (incoming.some(f => f.size > maxSizeMB * 1024 * 1024)) {
      setError(`Filer må være under ${maxSizeMB} MB`)
      return
    }
    setUploading(true)
    const results = await Promise.all(incoming.map(upload))
    const uploaded = results.filter(Boolean) as UploadedFile[]
    setUploading(false)
    const updated = [...files, ...uploaded]
    setFiles(updated)
    onFilesChange(updated)
  }

  const remove = (path: string) => {
    supabase.storage.from('inquiry-attachments').remove([path])
    const updated = files.filter(f => f.path !== path)
    setFiles(updated)
    onFilesChange(updated)
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(Array.from(e.dataTransfer.files))
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center
                    cursor-pointer transition-all duration-150 ${
          uploading ? 'opacity-60 cursor-wait' :
          dragOver ? 'border-[#E63312] bg-[#FEF2F2]' :
          'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}>
        <input ref={inputRef} type="file" multiple
          accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={e => e.target.files &&
            handleFiles(Array.from(e.target.files))} />
        <Upload className={`w-5 h-5 mx-auto mb-2 ${
          dragOver ? 'text-[#E63312]' : 'text-gray-400'
        }`} />
        <p className="text-sm font-medium text-gray-700">
          {uploading ? 'Laster opp...' : 'Klikk eller dra filer hit'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, DWG, DXF, JPG, PNG — maks {maxSizeMB} MB
        </p>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600
                        bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map(f => (
            <div key={f.path}
              className="flex items-center gap-3 p-3 bg-white
                         border border-gray-200 rounded-lg">
              <div className="w-8 h-8 bg-gray-100 rounded-lg
                              flex items-center justify-center shrink-0">
                {f.type.startsWith('image/')
                  ? <Image className="w-4 h-4 text-gray-500" />
                  : <FileText className="w-4 h-4 text-gray-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {f.name}
                </p>
                <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
              </div>
              <button type="button" onClick={() => remove(f.path)}
                className="p-1 text-gray-400 hover:text-red-500
                           rounded transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
