import { useState } from 'react'
import { calculateEstimate, getScannerDisplayName } from '@/lib/pricing'
import type {
  InquiryFormData, EstimateResult,
  ProjectType, ScanPurpose, Deliverable,
} from '@/types'

type FormData = Partial<InquiryFormData>

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'office',          label: 'Kontor / Næringsbygg' },
  { value: 'residential',     label: 'Bolig' },
  { value: 'industrial',      label: 'Industri / Produksjon' },
  { value: 'technical_rooms', label: 'Tekniske rom' },
  { value: 'outdoor',         label: 'Uteområde' },
  { value: 'other',           label: 'Annet' },
]

const SCAN_PURPOSES: { value: ScanPurpose; label: string }[] = [
  { value: 'rehabilitation',  label: 'Rehabilitering / Ombygging' },
  { value: 'documentation',   label: 'As-built dokumentasjon' },
  { value: 'bim_projection',  label: 'Prosjektering og BIM' },
  { value: 'visualization',   label: 'Visualisering / Digital tvilling' },
  { value: 'quality_control', label: 'Kvalitetskontroll' },
]

const DELIVERABLES: { value: Deliverable; label: string }[] = [
  { value: 'point_cloud',  label: 'Punktsky' },
  { value: '3d_model',     label: '3D-modell' },
  { value: '2d_drawings',  label: '2D-tegninger' },
  { value: 'ifc_bim',      label: 'IFC/Revit BIM' },
  { value: 'virtual_tour', label: 'Virtuell visning' },
]

// ─── Estimat-panel (høyre side) ──────────────────────────────────────────────

function EstimatePanel({ estimate }: { estimate: EstimateResult | null }) {
  if (!estimate) {
    return (
      <div className="bg-white border border-[#E8E8E8] rounded-lg p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-4">
          Estimert pris
        </p>
        <p className="text-[14px] text-[#9B9B9B] text-center py-6">
          Fyll inn areal for å se estimat.
        </p>
      </div>
    )
  }

  const lines: { label: string; value: number }[] = [
    { label: 'Skanning',       value: estimate.scanCost },
    { label: 'Etterarbeid',    value: estimate.officeCost },
    { label: 'BIM-modellering', value: estimate.bimCost },
    { label: 'Reise',          value: estimate.travelCost },
    { label: 'Administrasjon', value: estimate.adminMarkup },
  ]

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-4">
        Estimert pris
      </p>

      <div className="space-y-2 mb-4">
        {lines.filter(l => l.value > 0).map(({ label, value }) => (
          <div key={label} className="flex justify-between text-[14px]">
            <span className="text-[#6B6B6B]">{label}</span>
            <span className="font-medium text-[#E63312] font-mono tabular-nums">
              {value.toLocaleString('nb-NO')} kr
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E8E8E8] pt-4 flex justify-between items-center">
        <span className="text-[14px] font-semibold text-[#0C0C0C]">Totalt</span>
        <span className="text-[18px] font-bold text-[#E63312] font-mono tabular-nums">
          {estimate.totalMin.toLocaleString('nb-NO')} – {estimate.totalMax.toLocaleString('nb-NO')} kr
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="bg-[#F5F5F4] border border-[#E8E8E8] text-[#6B6B6B] text-[12px] font-medium px-2.5 py-1 rounded">
          {getScannerDisplayName(estimate.scannerType)}
        </span>
        <span className="text-[12px] text-[#9B9B9B]">
          {estimate.scanDays}d felt / {estimate.officeDays}d kontor
        </span>
      </div>

      <p className="text-[12px] text-[#9B9B9B] mt-4 text-center">
        Grovestimat. Endelig pris avklares etter befaring.
      </p>
    </div>
  )
}

// ─── Konfigurator ────────────────────────────────────────────────────────────

export default function ConfiguratorPage() {
  const [form, setForm] = useState<FormData>({})
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)

  const update = (data: Partial<InquiryFormData>) => {
    const next = { ...form, ...data }
    setForm(next)
    if (next.areaM2) setEstimate(calculateEstimate(next))
  }

  const selected = form.deliverables ?? []
  const toggleDeliverable = (d: Deliverable) => {
    const next = selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]
    update({ deliverables: next })
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E8E8]">
        <div className="max-w-[1100px] mx-auto px-8 py-4 flex items-center gap-2">
          <span className="text-[16px] font-extrabold text-[#0C0C0C]">nti</span>
          <span className="w-[5px] h-[5px] bg-[#E63312] rounded-sm" />
          <span className="text-[#E8E8E8] mx-1">|</span>
          <span className="text-[14px] font-medium text-[#6B6B6B]">Bestill 3D-skanning</span>
        </div>
      </div>

      {/* Innhold */}
      <div className="max-w-[1100px] mx-auto px-8 py-10 flex gap-8 items-start">

        {/* Venstre: Input */}
        <main className="flex-1 space-y-6">

          {/* Prosjekttype */}
          <section className="bg-white border border-[#E8E8E8] rounded-lg p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
              Prosjekttype
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PROJECT_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ projectType: value })}
                  className={`p-3 rounded-md text-[13px] font-medium text-center transition-all ${
                    form.projectType === value
                      ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA] text-[#0C0C0C]'
                      : 'border border-[#E8E8E8] text-[#6B6B6B] hover:border-[#0C0C0C]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Formål */}
          <section className="bg-white border border-[#E8E8E8] rounded-lg p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
              Formål med skanningen
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SCAN_PURPOSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ scanPurpose: value })}
                  className={`p-3 rounded-md text-[13px] font-medium text-left transition-all ${
                    form.scanPurpose === value
                      ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA] text-[#0C0C0C]'
                      : 'border border-[#E8E8E8] text-[#6B6B6B] hover:border-[#0C0C0C]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Areal og postnummer */}
          <section className="bg-white border border-[#E8E8E8] rounded-lg p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
              Omfang og lokasjon
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3D3D3D] mb-1">Areal (m²)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="F.eks. 2500"
                  value={form.areaM2 || ''}
                  onChange={e => update({ areaM2: e.target.value ? Number(e.target.value) : 0 })}
                  className="w-full border border-[#E8E8E8] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0C0C0C] focus:ring-1 focus:ring-[#0C0C0C]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#3D3D3D] mb-1">Postnummer</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="0000"
                  value={form.postalCode ?? ''}
                  onChange={e => update({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="w-full border border-[#E8E8E8] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0C0C0C] focus:ring-1 focus:ring-[#0C0C0C]"
                />
              </div>
            </div>
          </section>

          {/* Leveranser */}
          <section className="bg-white border border-[#E8E8E8] rounded-lg p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
              Leveranser
            </p>
            <div className="flex flex-wrap gap-2">
              {DELIVERABLES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleDeliverable(value)}
                  className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all ${
                    selected.includes(value)
                      ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA] text-[#0C0C0C]'
                      : 'border border-[#E8E8E8] text-[#6B6B6B] hover:border-[#0C0C0C]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Presisjonsnivå */}
          <section className="bg-white border border-[#E8E8E8] rounded-lg p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-3">
              Presisjonsnivå
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'standard' as const, label: 'Standard (±10mm)' },
                { value: 'high' as const,     label: 'Høy presisjon (±4mm)' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ precisionLevel: value })}
                  className={`p-3 rounded-md text-[13px] font-medium text-center transition-all ${
                    form.precisionLevel === value
                      ? 'border-2 border-[#0C0C0C] bg-[#FAFAFA] text-[#0C0C0C]'
                      : 'border border-[#E8E8E8] text-[#6B6B6B] hover:border-[#0C0C0C]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

        </main>

        {/* Høyre: Estimat */}
        <aside className="w-80 shrink-0 sticky top-20">
          <EstimatePanel estimate={estimate} />
        </aside>
      </div>
    </div>
  )
}
