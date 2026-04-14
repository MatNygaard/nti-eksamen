import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Home, Factory, Settings, Trees, MoreHorizontal,
  ScanLine, Box, FileText, Layers, Globe, Check, AlertCircle, Download,
  Wrench, Eye, CheckCircle,
} from 'lucide-react'
import { calculateEstimate, getScannerDisplayName } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import { sanitizeInquiry } from '@/lib/sanitize'
import DatePicker from '@/components/ui/DatePicker'
import { checkRateLimit, getRateLimitMessage } from '@/lib/rateLimiter'
import { generateInquiryPdf } from '@/lib/generatePdf'
import { useConfetti } from '@/lib/useConfetti'
import { ui } from '@/lib/design'
import type {
  InquiryFormData, EstimateResult,
  ProjectType, ScanPurpose, Deliverable, LightingCondition,
} from '@/types'

export type WizardData = Partial<InquiryFormData>
const TOTAL_STEPS = 5

const STEP_LABELS = ['Type', 'Omfang', 'Leveranse', 'Tilgang', 'Kontakt']

// ─── SelectionCard ────────────────────────────────────────────────────────────

interface SelectionCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  description?: string
}

function SelectionCard({ selected, onClick, icon, label, description }: SelectionCardProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`relative flex flex-col items-center text-center gap-3 p-5
                  rounded-md cursor-pointer transition-all duration-150 w-full ${
        selected
          ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA]'
          : 'border border-[#E8E8E8] bg-white hover:border-[#0C0C0C] hover:bg-[#FAFAFA]'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-[#0C0C0C] rounded-full
                         flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
      <span className={`transition-colors duration-150 ${
        selected ? 'text-[#0C0C0C]' : 'text-[#9B9B9B]'
      }`}>
        {icon}
      </span>
      <span className={`text-[14px] font-semibold transition-colors duration-150 ${
        selected ? 'text-[#0C0C0C]' : 'text-[#6B6B6B]'
      }`}>
        {label}
      </span>
      {description && (
        <span className="text-[12px] text-[#9B9B9B] leading-relaxed -mt-1">
          {description}
        </span>
      )}
    </button>
  )
}

// ─── Steg 1: Prosjekttype ─────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: WizardData
  onChange: (d: Partial<InquiryFormData>) => void
}) {
  const projectTypes: { value: ProjectType; label: string; icon: React.ReactNode }[] = [
    { value: 'office',          label: 'Kontor / Næringsbygg', icon: <Building2 className="w-8 h-8" /> },
    { value: 'residential',     label: 'Bolig',                icon: <Home className="w-8 h-8" /> },
    { value: 'industrial',      label: 'Industri / Produksjon', icon: <Factory className="w-8 h-8" /> },
    { value: 'technical_rooms', label: 'Tekniske rom',         icon: <Settings className="w-8 h-8" /> },
    { value: 'outdoor',         label: 'Uteområde',            icon: <Trees className="w-8 h-8" /> },
    { value: 'other',           label: 'Annet',                icon: <MoreHorizontal className="w-8 h-8" /> },
  ]

  const purposes: { value: ScanPurpose; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'rehabilitation',  label: 'Rehabilitering / Ombygging',      icon: <Wrench className="w-7 h-7" />,      description: 'Planlegger ombygging av eksisterende bygg' },
    { value: 'documentation',   label: 'As-built dokumentasjon',           icon: <FileText className="w-7 h-7" />,    description: 'Dokumentere eksisterende tilstand' },
    { value: 'bim_projection',  label: 'Prosjektering og BIM',             icon: <Layers className="w-7 h-7" />,      description: 'Grunnlag for BIM-modell og prosjektering' },
    { value: 'visualization',   label: 'Visualisering / Digital tvilling', icon: <Eye className="w-7 h-7" />,         description: 'Interaktiv visning og digital kopi' },
    { value: 'quality_control', label: 'Kvalitetskontroll',                icon: <CheckCircle className="w-7 h-7" />, description: 'Avviksanalyse og kontroll mot tegninger' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-[#0C0C0C] tracking-[-0.02em] mb-1.5">
          Hva slags prosjekt er dette?
        </h2>
        <p className="text-[14px] text-[#9B9B9B] mb-8">
          Velg type bygg og formål med skanningen.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
          PROSJEKTTYPE
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {projectTypes.map(({ value, label, icon }) => (
            <SelectionCard
              key={value}
              selected={data.projectType === value}
              onClick={() => onChange({ projectType: value })}
              icon={icon}
              label={label}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
          FORMÅL MED SKANNINGEN
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {purposes.map(({ value, label, icon, description }) => (
            <SelectionCard
              key={value}
              selected={data.scanPurpose === value}
              onClick={() => onChange({ scanPurpose: value })}
              icon={icon}
              label={label}
              description={description}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Steg 2: Omfang og lokasjon ───────────────────────────────────────────────

function Step2({
  data,
  onChange,
}: {
  data: WizardData
  onChange: (d: Partial<InquiryFormData>) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-[#0C0C0C] tracking-[-0.02em] mb-1.5">
          Omfang og lokasjon
        </h2>
        <p className="text-[14px] text-[#9B9B9B] mb-8">
          Størrelse og plassering av bygget.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className={ui.label}>
            Areal <span className="text-[#E63312]">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              placeholder="F.eks. 2500"
              value={data.areaM2 || ''}
              onChange={e =>
                onChange({ areaM2: e.target.value ? Number(e.target.value) : 0 })
              }
              className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2.5 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#E63312] focus:ring-1 focus:ring-[#E63312] transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#9B9B9B]">
              m²
            </span>
          </div>
          <p className="text-[12px] text-[#9B9B9B] mt-1">
            Usikker? Et grovt estimat er nok — vi avklarer ved befaring.
          </p>
        </div>

        <div>
          <label className={ui.label}>Antall etasjer</label>
          <input
            type="number"
            min="1"
            max="50"
            value={data.floors ?? 1}
            onChange={e =>
              onChange({ floors: Math.max(1, Math.min(50, Number(e.target.value))) })
            }
            className={ui.input}
          />
        </div>

        <div>
          <label className={ui.label}>Adresse</label>
          <input
            type="text"
            placeholder="Gatenavn og nummer"
            value={data.address ?? ''}
            onChange={e => onChange({ address: e.target.value })}
            className={ui.input}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={ui.label}>Postnummer</label>
            <input
              type="text"
              maxLength={4}
              placeholder="0000"
              value={data.postalCode ?? ''}
              onChange={e =>
                onChange({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>By</label>
            <input
              type="text"
              placeholder="Oslo"
              value={data.city ?? ''}
              onChange={e => onChange({ city: e.target.value })}
              className={ui.input}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#F5F5F4] border border-[#E8E8E8] rounded-md p-4 text-[13px] text-[#6B6B6B]">
        Lokasjon brukes til å beregne reisekostnader fra vårt kontor i Sandvika.
      </div>
    </div>
  )
}

// ─── Steg 3: Leveranse ────────────────────────────────────────────────────────

function InfoTooltip({ content }: { content: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <span
        role="button"
        tabIndex={0}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={e => { e.stopPropagation(); setShow(!show) }}
        onKeyDown={e => e.key === 'Enter' && setShow(!show)}
        className="w-4 h-4 rounded-full bg-[#F0F0F0] text-[#9B9B9B]
                   text-[10px] font-bold inline-flex items-center
                   justify-center hover:bg-[#E8E8E8] transition-colors
                   cursor-help select-none shrink-0">
        ?
      </span>
      {show && (
        <span className="absolute z-50 bottom-6 left-1/2 -translate-x-1/2
                         w-56 bg-gray-900 text-white text-xs rounded-lg
                         p-3 shadow-lg leading-relaxed pointer-events-none
                         whitespace-normal">
          {content}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2
                           w-2 h-2 bg-gray-900 rotate-45 block" />
        </span>
      )}
    </span>
  )
}

function Step3({
  data,
  onChange,
}: {
  data: WizardData
  onChange: (d: Partial<InquiryFormData>) => void
}) {
  const deliverableOptions: {
    value: Deliverable
    title: string
    desc: string
    icon: React.ReactNode
    tooltip: string
  }[] = [
    { value: 'point_cloud',  title: 'Punktsky',         desc: 'Rådata fra skanneren (E57/RCP/LAS)',   icon: <ScanLine size={18} />, tooltip: 'Rådata fra skanneren — millioner av målte punkter i 3D. Standard format som brukes i Revit, AutoCAD og de fleste BIM-verktøy.' },
    { value: '3d_model',     title: '3D-modell',        desc: 'Visuell modell fra punktsky',          icon: <Box size={18} />,      tooltip: 'Visuell 3D-modell laget fra punktskyen. Egnet for presentasjoner, VR og visualisering. Ikke like detaljert som BIM.' },
    { value: '2d_drawings',  title: '2D-tegninger',     desc: 'Plantegninger eller snitt (DWG/PDF)', icon: <FileText size={18} />, tooltip: 'Plantegninger eller snitt generert fra punktskyen. Leveres i DWG (AutoCAD) eller PDF.' },
    { value: 'ifc_bim',      title: 'IFC/Revit LOD300', desc: 'BIM-modell på prosjekteringsnivå',    icon: <Layers size={18} />,   tooltip: 'BIM-modell på prosjekteringsnivå. Vegger, gulv, tak og åpninger er modellert med korrekt geometri. Åpnes i Revit, Archicad og Navisworks.' },
    { value: 'virtual_tour', title: 'Virtuell visning', desc: 'Interaktiv 3D-visning på nett',        icon: <Globe size={18} />,    tooltip: 'Interaktiv 3D-visning på nett via Matterport. Besøk bygget digitalt fra PC eller mobil uten spesialprogramvare.' },
  ]

  const selected: Deliverable[] = data.deliverables ?? []
  const showBimScope = selected.includes('ifc_bim')

  const toggleDeliverable = (value: Deliverable) => {
    const next = selected.includes(value)
      ? selected.filter(d => d !== value)
      : [...selected, value]
    onChange({ deliverables: next })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-[#0C0C0C] tracking-[-0.02em] mb-1.5">
          Hva skal du ha levert?
        </h2>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B]">
            LEVERANSER
          </p>
          <InfoTooltip content="Velg én eller flere leveranser. Du kan kombinere, f.eks. punktsky + BIM-modell." />
        </div>
        <div className="space-y-2">
          {deliverableOptions.map(({ value, title, desc, icon }) => {
            const isSelected = selected.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDeliverable(value)}
                className={`w-full flex items-start gap-3 p-4 rounded-md text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA]'
                    : 'border border-[#E8E8E8] bg-white hover:border-[#0C0C0C]'
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-[#0C0C0C]' : 'text-[#9B9B9B]'}`}>
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium ${isSelected ? 'text-[#0C0C0C]' : 'text-[#3D3D3D]'}`}>
                    {title}
                  </p>
                  <p className="text-[12px] text-[#9B9B9B] mt-0.5">{desc}</p>
                </div>
                <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-[#0C0C0C] border-[#0C0C0C]' : 'border-[#E8E8E8]'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B]">
            PRESISJONSNIVÅ
          </p>
          <InfoTooltip content="Standard (±10mm) passer de fleste prosjekter. Høy presisjon (±4mm) er nødvendig for tekniske rom og krevende prosjektering — utføres med Leica BLK360 G2." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: 'standard', label: 'Standard (±10mm)',     desc: 'Passer de fleste prosjekter' },
              { value: 'high',     label: 'Høy presisjon (±4mm)', desc: 'Tekniske rom, krevende prosjektering' },
            ] as { value: 'standard' | 'high'; label: string; desc: string }[]
          ).map(({ value, label, desc }) => {
            const isSelected = data.precisionLevel === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ precisionLevel: value })}
                className={`p-4 rounded-md text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA]'
                    : 'border border-[#E8E8E8] bg-white hover:border-[#0C0C0C]'
                }`}
              >
                <p className={`text-[14px] font-medium ${isSelected ? 'text-[#0C0C0C]' : 'text-[#3D3D3D]'}`}>
                  {label}
                </p>
                <p className="text-[12px] text-[#9B9B9B] mt-0.5">{desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {showBimScope && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B]">
              FAGOMFANG
            </p>
            <InfoTooltip content="Angir hvilke fagdisipliner som skal modelleres. ARK + full MEP krever befaring over himling og alltid manuell prissetting." />
          </div>
          <div className="space-y-2">
            {(
              [
                { value: 'ark_only',        label: 'Kun ARK',          desc: 'Bygningskropp, vegger, tak, gulv' },
                { value: 'ark_mep_visible', label: 'ARK + synlig MEP', desc: 'Inkl. synlige tekniske installasjoner' },
                { value: 'ark_mep_full',    label: 'ARK + full MEP',   desc: 'Over himling — krever befaring' },
              ] as { value: 'ark_only' | 'ark_mep_visible' | 'ark_mep_full'; label: string; desc: string }[]
            ).map(({ value, label, desc }) => {
              const isSelected = data.technicalScope === value
              return (
                <div key={value}>
                  <button
                    type="button"
                    onClick={() => onChange({ technicalScope: value })}
                    className={`w-full p-4 rounded-md text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA]'
                        : 'border border-[#E8E8E8] bg-white hover:border-[#0C0C0C]'
                    }`}
                  >
                    <p className={`text-[14px] font-medium ${isSelected ? 'text-[#0C0C0C]' : 'text-[#3D3D3D]'}`}>
                      {label}
                    </p>
                    <p className="text-[12px] text-[#9B9B9B] mt-0.5">{desc}</p>
                  </button>
                  {isSelected && value === 'ark_mep_full' && (
                    <div className="mt-2 p-3 bg-[#F5F5F4] border border-[#E8E8E8] rounded-md text-[12px] text-[#6B6B6B]">
                      ⚠ Full MEP over himling krever befaring og manuell prissetting.
                      Estimatet reflekterer ikke endelig pris.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Steg 4: Tilgangsforhold ──────────────────────────────────────────────────

function Step4({
  data,
  onChange,
}: {
  data: WizardData
  onChange: (d: Partial<InquiryFormData>) => void
}) {
  const toggleFields: {
    key: 'buildingInUse' | 'hmsRequirements' | 'limitedAccess'
    label: string
    desc: string
  }[] = [
    { key: 'buildingInUse',    label: 'Bygget er i drift',              desc: 'Påvirker tidspunkt og planlegging' },
    { key: 'hmsRequirements',  label: 'HMS-krav / sikkerhetsklarering', desc: 'Industri, sykehus, sikre anlegg' },
    { key: 'limitedAccess',    label: 'Begrenset tilgang',              desc: 'Låste rom, leietakere, tidsbegrenset adgang' },
  ]

  const showWarning = data.hmsRequirements || data.limitedAccess

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-[#0C0C0C] tracking-[-0.02em] mb-1.5">
          Tilgangsforhold
        </h2>
        <p className="text-[14px] text-[#9B9B9B] mb-8">
          Hjelp oss å planlegge skanningen.
        </p>
      </div>

      <div className="space-y-3">
        {toggleFields.map(({ key, label, desc }) => {
          const isOn = data[key] === true
          return (
            <div
              key={key}
              className="flex items-center justify-between p-4 border border-[#E8E8E8] rounded-md"
            >
              <div>
                <p className="text-[14px] font-medium text-[#0C0C0C]">{label}</p>
                <p className="text-[12px] text-[#9B9B9B] mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ [key]: !isOn } as Partial<InquiryFormData>)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                  isOn ? 'bg-[#0C0C0C]' : 'bg-[#E8E8E8]'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    isOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      {showWarning && (
        <div className="p-4 bg-[#F5F5F4] border border-[#E8E8E8] rounded-md text-[13px] text-[#6B6B6B]">
          ⚠ Prosjektet vil bli gjennomgått manuelt av en spesialist.
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
          BELYSNING
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: 'good',    label: 'God belysning' },
              { value: 'limited', label: 'Begrenset belysning' },
              { value: 'unknown', label: 'Vet ikke' },
            ] as { value: LightingCondition; label: string }[]
          ).map(({ value, label }) => {
            const isSelected = data.lightingConditions === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ lightingConditions: value })}
                className={`p-3 rounded-md text-[13px] font-medium text-center transition-all duration-150 ${
                  isSelected
                    ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA] text-[#0C0C0C]'
                    : 'border border-[#E8E8E8] bg-white text-[#6B6B6B] hover:border-[#0C0C0C]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={ui.label}>
          Spesielle flater{' '}
          <span className="text-[#9B9B9B] font-normal">(valgfri)</span>
        </label>
        <textarea
          rows={3}
          placeholder="F.eks. glassfasader, mørke stålflater, blanke gulv"
          value={data.specialSurfaces ?? ''}
          onChange={e => onChange({ specialSurfaces: e.target.value })}
          className={ui.textarea}
        />
      </div>
    </div>
  )
}

// ─── Steg 5: Kontakt og innsending ────────────────────────────────────────────

const PROJECT_TYPE_LABELS: Record<string, string> = {
  office:          'Kontor / Næringsbygg',
  residential:     'Bolig',
  industrial:      'Industri / Produksjon',
  technical_rooms: 'Tekniske rom',
  outdoor:         'Uteområde',
  other:           'Annet',
}

const PURPOSE_LABELS: Record<string, string> = {
  rehabilitation:  'Rehabilitering / Ombygging',
  documentation:   'As-built dokumentasjon',
  bim_projection:  'Prosjektering og BIM',
  visualization:   'Visualisering / Digital tvilling',
  quality_control: 'Kvalitetskontroll',
}

const DELIVERABLE_LABELS: Record<string, string> = {
  point_cloud:  'Punktsky',
  '3d_model':   '3D-modell',
  '2d_drawings':'2D-tegninger',
  ifc_bim:      'IFC/Revit LOD300',
  virtual_tour: 'Virtuell visning',
}

function Step5({
  data,
  onChange,
  onGoToStep,
}: {
  data: WizardData
  onChange: (d: Partial<InquiryFormData>) => void
  onGoToStep: (step: number) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-[#0C0C0C] tracking-[-0.02em] mb-1.5">
          Kontaktinformasjon
        </h2>
      </div>

      {/* Oppsummering */}
      <div className="bg-[#F5F5F4] border border-[#E8E8E8] rounded-md p-5 space-y-3 text-sm">
        <SummaryRow
          label="Prosjekttype"
          value={PROJECT_TYPE_LABELS[data.projectType ?? ''] ?? '—'}
          onEdit={() => onGoToStep(1)}
        />
        <SummaryRow
          label="Formål"
          value={PURPOSE_LABELS[data.scanPurpose ?? ''] ?? '—'}
          onEdit={() => onGoToStep(1)}
        />
        <SummaryRow
          label="Areal / By"
          value={[
            data.areaM2 ? `${data.areaM2.toLocaleString('no-NO')} m²` : null,
            data.city || null,
          ]
            .filter(Boolean)
            .join(', ') || '—'}
          onEdit={() => onGoToStep(2)}
        />
        {(data.deliverables?.length ?? 0) > 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-[#6B6B6B] shrink-0">Leveranser</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {data.deliverables?.map(d => (
                <span
                  key={d}
                  className="inline-block bg-[#F5F5F4] border border-[#E8E8E8] text-[#6B6B6B] text-[12px] px-2 py-0.5 rounded"
                >
                  {DELIVERABLE_LABELS[d]}
                </span>
              ))}
              <button
                type="button"
                onClick={() => onGoToStep(3)}
                className="text-[#6B6B6B] hover:text-[#0C0C0C] transition-colors text-[12px] ml-1"
              >
                Endre
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kontaktfelter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={ui.label}>
            Navn <span className="text-[#E63312]">*</span>
          </label>
          <input
            type="text"
            value={data.contactName ?? ''}
            onChange={e => onChange({ contactName: e.target.value })}
            className={ui.input}
          />
        </div>
        <div>
          <label className={ui.label}>
            Firma <span className="text-[#E63312]">*</span>
          </label>
          <input
            type="text"
            value={data.companyName ?? ''}
            onChange={e => onChange({ companyName: e.target.value })}
            className={ui.input}
          />
        </div>
        <div>
          <label className={ui.label}>
            E-post <span className="text-[#E63312]">*</span>
          </label>
          <input
            type="email"
            value={data.contactEmail ?? ''}
            onChange={e => onChange({ contactEmail: e.target.value })}
            className={ui.input}
          />
        </div>
        <div>
          <label className={ui.label}>
            Telefon <span className="text-[#E63312]">*</span>
          </label>
          <input
            type="tel"
            value={data.contactPhone ?? ''}
            onChange={e => onChange({ contactPhone: e.target.value })}
            className={ui.input}
          />
        </div>
      </div>

      {/* Tidsramme */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
          TIDSRAMME{' '}
          <span className="text-[#9B9B9B] font-normal normal-case tracking-normal">(valgfri)</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Ønsket skanningsdato"
            value={data.preferredDate}
            onChange={val => onChange({ preferredDate: val })}
            minDate={new Date()}
          />
          <DatePicker
            label="Leveransefrist"
            value={data.deadline}
            onChange={val => onChange({ deadline: val })}
            minDate={new Date()}
          />
        </div>
      </div>

      {/* Tilleggsinformasjon */}
      <div>
        <label className={ui.label}>
          Tilleggsinformasjon{' '}
          <span className="text-[#9B9B9B] font-normal">(valgfri)</span>
        </label>
        <textarea
          rows={4}
          value={data.additionalInfo ?? ''}
          onChange={e => onChange({ additionalInfo: e.target.value })}
          className={ui.textarea}
        />
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#6B6B6B] shrink-0 text-[14px]">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[14px] font-medium text-[#0C0C0C] truncate">{value}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-[#6B6B6B] hover:text-[#0C0C0C] transition-colors text-[12px] shrink-0"
        >
          Endre
        </button>
      </div>
    </div>
  )
}

// ─── Estimatpanel ─────────────────────────────────────────────────────────────

interface EstimatePanelProps {
  estimate: EstimateResult | null
}

function EstimatePanel({ estimate }: EstimatePanelProps) {
  const noEstimate = !estimate

  return (
    <div className="sticky top-20 bg-white border border-[#E8E8E8] rounded-lg p-6">
      <div className="flex items-center gap-1 mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B]">
          ESTIMERT PRIS
        </p>
        <InfoTooltip content="Prisen beregnes basert på areal, leveranser og tilgangsforhold. Avvik fra endelig pris er typisk under 15%." />
      </div>

      {noEstimate ? (
        <p className="text-[14px] text-[#9B9B9B] text-center py-6">
          Fyll inn areal for å se estimat.
        </p>
      ) : (
        <>
          <div className="space-y-2.5 mb-4">
            {estimate.scanCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#6B6B6B] flex items-center">
                  Skanning<InfoTooltip content="Tid på stedet med skanner. Inkluderer oppsett, scanning og kontrollmålinger." />
                </span>
                <span className="text-[14px] font-medium text-[#E63312] font-mono tabular-nums">
                  {estimate.scanCost.toLocaleString('nb-NO')} kr
                </span>
              </div>
            )}
            {estimate.officeCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#6B6B6B] flex items-center">
                  Etterarbeid<InfoTooltip content="Kontorarbeid etter scanning: punktsky-prosessering og kvalitetskontroll." />
                </span>
                <span className="text-[14px] font-medium text-[#E63312] font-mono tabular-nums">
                  {estimate.officeCost.toLocaleString('nb-NO')} kr
                </span>
              </div>
            )}
            {estimate.bimCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#6B6B6B]">BIM-modellering</span>
                <span className="text-[14px] font-medium text-[#E63312] font-mono tabular-nums">
                  {estimate.bimCost.toLocaleString('nb-NO')} kr
                </span>
              </div>
            )}
            {estimate.travelCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#6B6B6B] flex items-center">
                  Reise<InfoTooltip content="Reise fra vårt kontor i Sandvika. Beregnet fra Malmskriverveien 35." />
                </span>
                <span className="text-[14px] font-medium text-[#E63312] font-mono tabular-nums">
                  {estimate.travelCost.toLocaleString('nb-NO')} kr
                </span>
              </div>
            )}
            {estimate.adminMarkup > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#6B6B6B] flex items-center">
                  Administrasjon<InfoTooltip content="Fast 10% av total for prosjektledelse og koordinering." />
                </span>
                <span className="text-[14px] font-medium text-[#E63312] font-mono tabular-nums">
                  {estimate.adminMarkup.toLocaleString('nb-NO')} kr
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-[#E8E8E8] pt-4">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-semibold text-[#0C0C0C]">Totalt</span>
              <span className="text-[18px] font-bold text-[#E63312] font-mono tabular-nums">
                {estimate.totalMin.toLocaleString('nb-NO')} –{' '}
                {estimate.totalMax.toLocaleString('nb-NO')} kr
              </span>
            </div>
          </div>

          <span className="mt-3 inline-block bg-[#F5F5F4] border border-[#E8E8E8] text-[#6B6B6B] text-[12px] font-medium px-2.5 py-1 rounded">
            {getScannerDisplayName(estimate.scannerType)}
          </span>

          {estimate.manualReview && (
            <div className="mt-4 p-3 bg-[#F5F5F4] border border-[#E8E8E8] rounded-md">
              <p className="text-[12px] font-semibold text-[#0C0C0C] mb-1">
                ⚠ Krever manuell vurdering
              </p>
              {estimate.manualReviewReasons && estimate.manualReviewReasons.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5">
                  {estimate.manualReviewReasons.map((reason, i) => (
                    <li key={i} className="text-[12px] text-[#6B6B6B]">{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="text-[12px] text-[#9B9B9B] mt-4 text-center leading-[1.5]">
            Grovestimat. Endelig pris avklares etter befaring.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Konfigurator-side ────────────────────────────────────────────────────────

export default function ConfiguratorPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<WizardData>({})
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const { fireConfetti } = useConfetti()

  useEffect(() => setStepError(null), [currentStep])

  const updateFormData = (stepData: Partial<InquiryFormData>) => {
    const updated = { ...formData, ...stepData }
    setFormData(updated)
    if (updated.areaM2) setEstimate(calculateEstimate(updated))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.projectType) {
          setStepError('Velg prosjekttype for å fortsette')
          return false
        }
        if (!formData.scanPurpose) {
          setStepError('Velg formål med skanningen for å fortsette')
          return false
        }
        return true
      case 2:
        if (!formData.areaM2 || formData.areaM2 <= 0) {
          setStepError('Fyll inn areal for å fortsette')
          return false
        }
        return true
      case 3:
        if (!formData.deliverables || formData.deliverables.length === 0) {
          setStepError('Velg minst én leveranse for å fortsette')
          return false
        }
        return true
      default:
        return true
    }
  }

  const goToNext = () => {
    if (!validateStep(currentStep)) return
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS))
  }
  const goToPrev = () => setCurrentStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    if (!checkRateLimit('inquiry')) {
      setSubmitError(getRateLimitMessage('inquiry'))
      setIsSubmitting(false)
      return
    }

    if (!formData.contactName || !formData.contactEmail ||
        !formData.contactPhone || !formData.companyName) {
      setSubmitError('Fyll inn alle påkrevde kontaktfelter')
      setIsSubmitting(false)
      return
    }
    if (!formData.areaM2 || formData.areaM2 <= 0) {
      setSubmitError('Fyll inn areal i steg 2')
      setIsSubmitting(false)
      return
    }

    try {
      const sanitized = sanitizeInquiry({
        project_type:        formData.projectType,
        scan_purpose:        formData.scanPurpose,
        area_m2:             formData.areaM2,
        floors:              formData.floors,
        address:             formData.address,
        postal_code:         formData.postalCode,
        city:                formData.city,
        deliverables:        formData.deliverables,
        precision_level:     formData.precisionLevel,
        technical_scope:     formData.technicalScope,
        building_in_use:     formData.buildingInUse,
        hms_requirements:    formData.hmsRequirements,
        limited_access:      formData.limitedAccess,
        special_surfaces:    formData.specialSurfaces,
        lighting_conditions: formData.lightingConditions,
        preferred_date:      formData.preferredDate || null,
        deadline:            formData.deadline || null,
        contact_name:        formData.contactName,
        contact_email:       formData.contactEmail,
        contact_phone:       formData.contactPhone,
        company_name:        formData.companyName,
        additional_info:     formData.additionalInfo,
        manual_review:       estimate?.manualReview ?? false,
      })
      const { error } = await supabase
        .from('inquiries')
        .insert({ ...sanitized })

      if (error) throw error

      fireConfetti()
      setIsSubmitted(true)
    } catch (err) {
      console.error('Supabase feil:', err)
      const message = err instanceof Error ? err.message : 'Ukjent feil'
      setSubmitError(`Feil ved innsending: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Bekreftelse-skjerm ──────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-[#F5F5F4] border border-[#E8E8E8] rounded-full
                          flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#0C0C0C]" />
          </div>
          <h2 className="text-[28px] font-bold text-[#0C0C0C] tracking-[-0.02em] mb-3">
            Forespørsel sendt!
          </h2>
          <p className="text-[16px] text-[#6B6B6B] mb-1">
            Preben tar kontakt innen 1 virkedag.
          </p>
          <p className="text-[14px] text-[#9B9B9B] mb-8">
            Bekreftelse sendes til {formData.contactEmail}
          </p>
          {estimate?.manualReview && (
            <p className="text-[14px] text-[#6B6B6B] mb-6 p-4 bg-[#F5F5F4] border border-[#E8E8E8] rounded-md">
              Prosjektet ditt vil bli gjennomgått av en spesialist for å sikre et presist tilbud.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {estimate && (
              <button
                onClick={() => generateInquiryPdf(formData, estimate)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5
                           border border-[#E8E8E8] text-[14px] font-medium text-[#6B6B6B]
                           rounded-md hover:border-[#0C0C0C] hover:text-[#0C0C0C] transition-colors"
              >
                <Download className="w-4 h-4" />
                Last ned PDF-sammendrag
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 border border-[#E8E8E8] text-[14px] font-medium
                         text-[#6B6B6B] rounded-md hover:border-[#0C0C0C]
                         hover:text-[#0C0C0C] transition-colors"
            >
              Send ny forespørsel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Hoved-wizard ────────────────────────────────────────────────────────────

  const stepIdx = currentStep - 1 // 0-indexed for comparisons

  return (
    <div className="min-h-screen bg-[#F5F5F4]">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#E8E8E8]">
        <div className="max-w-[1200px] mx-auto px-10 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1">
            <span className="text-[16px] font-extrabold text-[#0C0C0C]">nti</span>
            <span className="w-[5px] h-[5px] bg-[#E63312] rounded-sm mb-0.5" />
          </Link>
          <span className="text-[#E8E8E8] text-[14px]">|</span>
          <span className="text-[14px] font-medium text-[#6B6B6B]">Bestill 3D-skanning</span>
        </div>
      </div>

      {/* ── Innhold ── */}
      <div className="max-w-[1200px] mx-auto px-10 pt-10 pb-32">

        {/* Steg-indikator */}
        <div className="flex items-center justify-center mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${
                  i < stepIdx
                    ? 'bg-[#0C0C0C] text-white'
                    : i === stepIdx
                    ? 'bg-[#0C0C0C] text-white ring-2 ring-[#0C0C0C] ring-offset-2'
                    : 'border-[1.5px] border-[#E8E8E8] text-[#9B9B9B] bg-white'
                }`}>
                  {i < stepIdx ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[11px] mt-1.5 font-medium ${
                  i === stepIdx ? 'text-[#0C0C0C]' : 'text-[#9B9B9B]'
                }`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-10 h-px mx-2 mb-4 ${
                  i < stepIdx ? 'bg-[#0C0C0C]' : 'bg-[#E8E8E8]'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-8 items-start">

          {/* Skjema-kolonne */}
          <main className="flex-1 min-w-0">
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-8">
              {currentStep === 1 && <Step1 data={formData} onChange={updateFormData} />}
              {currentStep === 2 && <Step2 data={formData} onChange={updateFormData} />}
              {currentStep === 3 && <Step3 data={formData} onChange={updateFormData} />}
              {currentStep === 4 && <Step4 data={formData} onChange={updateFormData} />}
              {currentStep === 5 && (
                <Step5
                  data={formData}
                  onChange={updateFormData}
                  onGoToStep={setCurrentStep}
                />
              )}
            </div>

            {stepError && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5
                            rounded-md mt-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {stepError}
              </p>
            )}
          </main>

          {/* Estimatpanel */}
          <aside className="w-72 shrink-0">
            <EstimatePanel estimate={estimate} />
          </aside>

        </div>
      </div>

      {/* ── Navigasjonsknapper (fixed bottom) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E8E8] z-40">
        <div className="max-w-[1200px] mx-auto px-10 py-4 flex items-center justify-between">
          {currentStep === TOTAL_STEPS && submitError && (
            <p className="absolute left-1/2 -translate-x-1/2 -top-8 text-sm text-red-600">
              {submitError}
            </p>
          )}
          <button
            onClick={goToPrev}
            disabled={currentStep === 1}
            className="px-5 py-2.5 border border-[#E8E8E8] text-[14px] font-medium
                       text-[#6B6B6B] rounded-md hover:border-[#0C0C0C]
                       hover:text-[#0C0C0C] disabled:opacity-30
                       transition-colors duration-150"
          >
            Tilbake
          </button>

          {currentStep < TOTAL_STEPS ? (
            <button
              onClick={goToNext}
              className="px-8 py-2.5 bg-[#0C0C0C] text-white text-[14px] font-semibold
                         rounded-md hover:bg-[#1F1F1F] transition-colors duration-150"
            >
              Neste steg
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-[#E63312] text-white text-[14px] font-semibold
                         rounded-md hover:bg-[#CC2A0F] disabled:opacity-50
                         transition-colors duration-150"
            >
              {isSubmitting ? 'Sender...' : 'Send forespørsel'}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
