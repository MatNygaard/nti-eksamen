// ─── Prislogikk ─────────────────────────────────────────────────────────────

const SCAN_DAY_RATE = 17_500
const OFFICE_DAY_RATE = 13_250
const MINIMUM_DAYS = 0.5
const MINIMUM_TOTAL = 17_500
const ADMIN_MARKUP = 0.10
const TRAVEL_HOURLY_RATE = 1_820
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

function selectScanner(data) {
  if (data.precisionLevel === 'high') return 'blk360_g2'
  if (data.scanPurpose === 'visualization') return 'matterport_pro3'
  if (data.scanPurpose === 'bim_projection') return 'blk2go'
  return 'blk360_g2'
}

function estimateTravelCost(postalCode) {
  if (!postalCode) return 0
  var code = parseInt(postalCode, 10)
  if (code >= 1300 && code <= 1399) return 0
  if (code >= 900  && code <= 1299) return TRAVEL_HOURLY_RATE * 0.5
  if (code >= 200  && code <= 899)  return TRAVEL_HOURLY_RATE * 1.5
  if (code >= 4000 && code <= 5999) return TRAVEL_HOURLY_RATE * 4
  if (code >= 7000 && code <= 7999) return TRAVEL_HOURLY_RATE * 6
  if (code >= 8000 && code <= 9999) return TRAVEL_HOURLY_RATE * 8
  return TRAVEL_HOURLY_RATE * 2
}

function calculateEstimate(data) {
  var areaM2 = data.areaM2 || 0
  var projectType = data.projectType || 'office'
  var scannerType = selectScanner(data)

  // Beregn skannetimer
  var isOpen = ['industrial', 'outdoor'].includes(projectType)
  var hoursPerK = SCAN_HOURS_PER_1000M2[scannerType][isOpen ? 'open' : 'office']
  var scanHours = (areaM2 / 1000) * hoursPerK

  // Dager (rundet opp til nærmeste halve dag)
  var scanDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours / 8) * 2) / 2)
  var officeDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours * OFFICE_WORK_MULTIPLIER / 8) * 2) / 2)

  // Kostnader
  var scanCost = scanDays * SCAN_DAY_RATE
  var officeCost = officeDays * OFFICE_DAY_RATE

  // BIM-kostnad
  var deliverables = data.deliverables || []
  var needsBim = deliverables.includes('ifc_bim') || deliverables.includes('2d_drawings')
  var bimCost = needsBim ? areaM2 * BIM_RATE_PER_M2 : 0

  // Reise og admin
  var travelCost = estimateTravelCost(data.postalCode || '')
  var subtotal = scanCost + officeCost + bimCost + travelCost
  var adminMarkup = subtotal * ADMIN_MARKUP

  // Totalområde (±15 %)
  var baseTotal = subtotal + adminMarkup
  var totalMin = Math.max(MINIMUM_TOTAL, Math.round(baseTotal * 0.90))
  var totalMax = Math.round(baseTotal * 1.15)

  return {
    scannerType: scannerType,
    scanDays: scanDays,
    officeDays: officeDays,
    scanCost: scanCost,
    officeCost: officeCost,
    bimCost: bimCost,
    travelCost: travelCost,
    adminMarkup: adminMarkup,
    totalMin: totalMin,
    totalMax: totalMax,
  }
}

// ─── Valg-data ──────────────────────────────────────────────────────────────

var PROJECT_TYPES = [
  { value: 'office',          label: 'Kontor / Næringsbygg' },
  { value: 'residential',     label: 'Bolig' },
  { value: 'industrial',      label: 'Industri / Produksjon' },
  { value: 'technical_rooms', label: 'Tekniske rom' },
  { value: 'outdoor',         label: 'Uteområde' },
  { value: 'other',           label: 'Annet' },
]

var SCAN_PURPOSES = [
  { value: 'rehabilitation',  label: 'Rehabilitering / Ombygging' },
  { value: 'documentation',   label: 'As-built dokumentasjon' },
  { value: 'bim_projection',  label: 'Prosjektering og BIM' },
  { value: 'visualization',   label: 'Visualisering / Digital tvilling' },
  { value: 'quality_control', label: 'Kvalitetskontroll' },
]

var DELIVERABLES = [
  { value: 'point_cloud',  label: 'Punktsky' },
  { value: '3d_model',     label: '3D-modell' },
  { value: '2d_drawings',  label: '2D-tegninger' },
  { value: 'ifc_bim',      label: 'IFC/Revit BIM' },
  { value: 'virtual_tour', label: 'Virtuell visning' },
]

var PRECISION_LEVELS = [
  { value: 'standard', label: 'Standard (±10mm)' },
  { value: 'high',     label: 'Høy presisjon (±4mm)' },
]

// ─── State ──────────────────────────────────────────────────────────────────

var form = {
  projectType: null,
  scanPurpose: null,
  areaM2: 0,
  postalCode: '',
  deliverables: [],
  precisionLevel: null,
}

// ─── Knapp-styling ──────────────────────────────────────────────────────────

var BTN_BASE = 'p-3 rounded-md text-[13px] font-medium transition-colors cursor-pointer'
var BTN_ACTIVE = BTN_BASE + ' border-2 border-[#0C0C0C] bg-[#FAFAFA] text-[#0C0C0C]'
var BTN_INACTIVE = BTN_BASE + ' border border-[#E8E8E8] text-[#6B6B6B] hover:border-[#0C0C0C]'

// ─── Bygg knapper ──────────────────────────────────────────────────────────

function buildButtons(containerId, options, field) {
  var container = document.getElementById(containerId)
  options.forEach(function (opt) {
    var btn = document.createElement('button')
    btn.textContent = opt.label
    btn.className = BTN_INACTIVE
    btn.setAttribute('data-value', opt.value)
    btn.addEventListener('click', function () {
      form[field] = opt.value
      // Oppdater aktiv-styling
      container.querySelectorAll('button').forEach(function (b) {
        b.className = b.getAttribute('data-value') === form[field] ? BTN_ACTIVE : BTN_INACTIVE
      })
      updateEstimate()
    })
    container.appendChild(btn)
  })
}

function buildToggleButtons(containerId, options, field) {
  var container = document.getElementById(containerId)
  options.forEach(function (opt) {
    var btn = document.createElement('button')
    btn.textContent = opt.label
    btn.className = BTN_INACTIVE + ' px-4 py-2'
    btn.setAttribute('data-value', opt.value)
    btn.addEventListener('click', function () {
      var list = form[field]
      var index = list.indexOf(opt.value)
      if (index === -1) {
        list.push(opt.value)
      } else {
        list.splice(index, 1)
      }
      // Oppdater aktiv-styling
      container.querySelectorAll('button').forEach(function (b) {
        var isActive = list.includes(b.getAttribute('data-value'))
        b.className = (isActive ? BTN_ACTIVE : BTN_INACTIVE) + ' px-4 py-2'
      })
      updateEstimate()
    })
    container.appendChild(btn)
  })
}

// ─── Oppdater estimat-panel ─────────────────────────────────────────────────

function formatNumber(n) {
  return n.toLocaleString('nb-NO')
}

function updateEstimate() {
  var panel = document.getElementById('estimatePanel')

  if (!form.areaM2) {
    panel.innerHTML =
      '<p class="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-4">Estimert pris</p>' +
      '<p class="text-[14px] text-[#9B9B9B] text-center py-6">Fyll inn areal for å se estimat.</p>'
    return
  }

  var est = calculateEstimate(form)

  // Bygg linjeposter
  var lines = [
    { label: 'Skanning',        value: est.scanCost },
    { label: 'Etterarbeid',     value: est.officeCost },
    { label: 'BIM-modellering', value: est.bimCost },
    { label: 'Reise',           value: est.travelCost },
    { label: 'Administrasjon',  value: est.adminMarkup },
  ]

  var linesHtml = ''
  lines.forEach(function (line) {
    if (line.value > 0) {
      linesHtml +=
        '<div class="flex justify-between text-[14px]">' +
          '<span class="text-[#6B6B6B]">' + line.label + '</span>' +
          '<span class="font-medium text-[#E63312] font-mono tabular-nums">' + formatNumber(line.value) + ' kr</span>' +
        '</div>'
    }
  })

  panel.innerHTML =
    '<p class="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9B9B9B] mb-4">Estimert pris</p>' +
    '<div class="space-y-2 mb-4">' + linesHtml + '</div>' +
    '<div class="border-t border-[#E8E8E8] pt-4 flex justify-between items-center">' +
      '<span class="text-[14px] font-semibold text-[#0C0C0C]">Totalt</span>' +
      '<span class="text-[18px] font-bold text-[#E63312] font-mono tabular-nums">' +
        formatNumber(est.totalMin) + ' – ' + formatNumber(est.totalMax) + ' kr' +
      '</span>' +
    '</div>' +
    '<div class="mt-3 flex items-center gap-2">' +
      '<span class="bg-[#F5F5F4] border border-[#E8E8E8] text-[#6B6B6B] text-[12px] font-medium px-2.5 py-1 rounded">' +
        SCANNER_NAMES[est.scannerType] +
      '</span>' +
      '<span class="text-[12px] text-[#9B9B9B]">' + est.scanDays + 'd felt / ' + est.officeDays + 'd kontor</span>' +
    '</div>' +
    '<p class="text-[12px] text-[#9B9B9B] mt-4 text-center">Grovestimat. Endelig pris avklares etter befaring.</p>'
}

// ─── Init ───────────────────────────────────────────────────────────────────

buildButtons('projectType', PROJECT_TYPES, 'projectType')
buildButtons('scanPurpose', SCAN_PURPOSES, 'scanPurpose')
buildToggleButtons('deliverables', DELIVERABLES, 'deliverables')
buildButtons('precisionLevel', PRECISION_LEVELS, 'precisionLevel')

// Input-felter
document.getElementById('areaM2').addEventListener('input', function (e) {
  form.areaM2 = e.target.value ? Number(e.target.value) : 0
  updateEstimate()
})

document.getElementById('postalCode').addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  form.postalCode = e.target.value
  updateEstimate()
})
