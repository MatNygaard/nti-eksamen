import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { nb } from 'date-fns/locale'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  minDate?: Date
  label?: string
}

export default function DatePicker({
  value, onChange, placeholder = 'Velg dato',
  minDate, label
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = value ? new Date(value) : undefined

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-gray-200
                   rounded-lg px-3 py-2.5 text-sm bg-white hover:border-gray-300
                   focus:outline-none focus:border-[#E63312] focus:ring-1
                   focus:ring-[#E63312] transition-colors text-left">
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected
            ? format(selected, 'd. MMMM yyyy', { locale: nb })
            : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white rounded-xl border
                        border-gray-100 shadow-lg p-3">
          <style>{`
            .rdp { --rdp-accent-color: #E63312; --rdp-background-color: #FEF2F2; }
            .rdp-day_selected { background-color: #E63312 !important; }
            .rdp-day_today { font-weight: 700; color: #E63312; }
            .rdp-button:hover:not([disabled]) { background-color: #FEF2F2; }
            .rdp-nav_button { color: #6B7280; }
            .rdp-caption_label { font-size: 14px; font-weight: 600; }
          `}</style>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={day => {
              if (day) {
                onChange(format(day, 'yyyy-MM-dd'))
                setOpen(false)
              }
            }}
            locale={nb}
            disabled={minDate ? { before: minDate } : undefined}
            showOutsideDays={false}
          />
        </div>
      )}
    </div>
  )
}
