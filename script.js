//prislogikk 

const SCAN_DAY_RATE = 17500
const OFFICE_DAY_RATE = 13250
const MINIMUM_DAYS = 0.5
const MINIMUM_TOTAL = 17500
const ADMIN_MARKUP = 0.10
const TRAVEL_HOURLY_RATE = 1820
const OFFICE_WORK_MULTIPLIER = 3.0
const BIM_RATE_PER_M2 = 7.0

const SCAN_HOURS_PER_1000M2 = {
  matterport_pro3: { office: 2.0, open: 1.0 },
  blk360_g2:       { office: 2.0, open: 1.0 },
  blk2go:          { office: 1.0, open: 0.5 },
  rtc360:          { office: 2.0, open: 1.0 },
}

const SCANNER_NAMES = {
  matterport_pro3: 'Matterport Pro3',
  blk2go:          'Leica BLK2GO',
  blk360_g2:       'Leica BLK360 G2',
  rtc360:          'Leica RTC360',
}

function selectScanner({ precisionLevel, scanPurpose }) {
  if (precisionLevel === 'high') return 'blk360_g2'
  if (scanPurpose === 'visualization') return 'matterport_pro3'
  if (scanPurpose === 'bim_projection') return 'blk2go'
  return 'blk360_g2'
}

function estimateTravelCost(postalCode) {
  if (!postalCode) return 0
  const code = parseInt(postalCode, 10)
  const ranges = [
    [1300, 1399, 0],
    [900,  1299, 0.5],
    [200,  899,  1.5],
    [4000, 5999, 4],
    [7000, 7999, 6],
    [8000, 9999, 8],
  ]
  const match = ranges.find(([min, max]) => code >= min && code <= max)
  return TRAVEL_HOURLY_RATE * (match ? match[2] : 2)
}

function calculateEstimate(data) {
  const area = data.areaM2 || 0
  const scanner = selectScanner(data)
  const isOpen = data.projectType === 'industrial' || data.projectType === 'outdoor'
  const hoursPerK = SCAN_HOURS_PER_1000M2[scanner][isOpen ? 'open' : 'office']
  const scanHours = (area / 1000) * hoursPerK

  const roundHalf = h => Math.max(MINIMUM_DAYS, Math.ceil((h / 8) * 2) / 2)
  const scanDays = roundHalf(scanHours)
  const officeDays = roundHalf(scanHours * OFFICE_WORK_MULTIPLIER)

  const scanCost = scanDays * SCAN_DAY_RATE
  const officeCost = officeDays * OFFICE_DAY_RATE
  const needsBim = (data.deliverables || []).some(d => d === 'ifc_bim' || d === '2d_drawings')
  const bimCost = needsBim ? area * BIM_RATE_PER_M2 : 0
  const travelCost = estimateTravelCost(data.postalCode || '')
  const subtotal = scanCost + officeCost + bimCost + travelCost
  const adminMarkup = subtotal * ADMIN_MARKUP
  const baseTotal = subtotal + adminMarkup

  return {
    scanner, scanDays, officeDays,
    scanCost, officeCost, bimCost, travelCost, adminMarkup,
    totalMin: Math.max(MINIMUM_TOTAL, Math.round(baseTotal * 0.90)),
    totalMax: Math.round(baseTotal * 1.15),
  }
}

// ─── Valg-data ──────────────────────────────────────────────────────────────

const OPTIONS = {
  projectType: [
    { value: 'office',          label: 'Kontor / Næringsbygg' },
    { value: 'residential',     label: 'Bolig' },
    { value: 'industrial',      label: 'Industri / Produksjon' },
    { value: 'technical_rooms', label: 'Tekniske rom' },
    { value: 'outdoor',         label: 'Uteområde' },
    { value: 'other',           label: 'Annet' },
  ],
  scanPurpose: [
    { value: 'rehabilitation',  label: 'Rehabilitering / Ombygging' },
    { value: 'documentation',   label: 'As-built dokumentasjon' },
    { value: 'bim_projection',  label: 'Prosjektering og BIM' },
    { value: 'visualization',   label: 'Visualisering / Digital tvilling' },
    { value: 'quality_control', label: 'Kvalitetskontroll' },
  ],
  deliverables: [
    { value: 'point_cloud',  label: 'Punktsky' },
    { value: '3d_model',     label: '3D-modell' },
    { value: '2d_drawings',  label: '2D-tegninger' },
    { value: 'ifc_bim',      label: 'IFC/Revit BIM' },
    { value: 'virtual_tour', label: 'Virtuell visning' },
  ],
  precisionLevel: [
    { value: 'standard', label: 'Standard (±10mm)' },
    { value: 'high',     label: 'Høy presisjon (±4mm)' },
  ],
}

// ─── State ──────────────────────────────────────────────────────────────────

const form = {
  projectType: null,
  scanPurpose: null,
  areaM2: 0,
  postalCode: '',
  deliverables: [],
  precisionLevel: null,
}

// ─── Bygg knapper ───────────────────────────────────────────────────────────

function buildButtons(containerId, field, multi = false) {
  const container = document.getElementById(containerId)
  OPTIONS[field].forEach(({ value, label }) => {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className = 'btn'
    btn.dataset.value = value
    btn.addEventListener('click', () => {
      if (multi) {
        const i = form[field].indexOf(value)
        i === -1 ? form[field].push(value) : form[field].splice(i, 1)
      } else {
        form[field] = value
      }
      container.querySelectorAll('.btn').forEach(b => {
        const active = multi
          ? form[field].includes(b.dataset.value)
          : b.dataset.value === form[field]
        b.classList.toggle('active', active)
      })
      updateEstimate()
    })
    container.appendChild(btn)
  })
}

// ─── Oppdater estimat-panel ─────────────────────────────────────────────────

const fmt = n => n.toLocaleString('nb-NO')

function updateEstimate() {
  const panel = document.getElementById('estimatePanel')

  if (!form.areaM2) {
    panel.innerHTML = `<h2>Estimert pris</h2><p class="hint">Fyll inn areal for å se estimat.</p>`
    return
  }

  const est = calculateEstimate(form)

  const lines = [
    ['Skanning',        est.scanCost],
    ['Etterarbeid',     est.officeCost],
    ['BIM-modellering', est.bimCost],
    ['Reise',           est.travelCost],
    ['Administrasjon',  est.adminMarkup],
  ].filter(([, v]) => v > 0)
   .map(([label, v]) => `<div class="line"><span>${label}</span><span class="value">${fmt(v)} kr</span></div>`)
   .join('')

  panel.innerHTML = `
    <h2>Estimert pris</h2>
    ${lines}
    <div class="total">
      <span>Totalt</span>
      <span class="value">${fmt(est.totalMin)} – ${fmt(est.totalMax)} kr</span>
    </div>
    <span class="badge">${SCANNER_NAMES[est.scanner]}</span>
    <span style="font-size:12px;color:#999">${est.scanDays}d felt / ${est.officeDays}d kontor</span>
    <p class="hint">Grovestimat. Endelig pris avklares etter befaring.</p>
  `
}

// ─── Init ───────────────────────────────────────────────────────────────────

buildButtons('projectType', 'projectType')
buildButtons('scanPurpose', 'scanPurpose')
buildButtons('deliverables', 'deliverables', true)
buildButtons('precisionLevel', 'precisionLevel')

document.getElementById('areaM2').addEventListener('input', e => {
  form.areaM2 = e.target.value ? Number(e.target.value) : 0
  updateEstimate()
})

document.getElementById('postalCode').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  form.postalCode = e.target.value
  updateEstimate()
})
