// ─── Prislogikk ─────────────────────────────────────────────────────────────

var SCAN_DAY_RATE = 17500
var OFFICE_DAY_RATE = 13250
var MINIMUM_DAYS = 0.5
var MINIMUM_TOTAL = 17500
var ADMIN_MARKUP = 0.10
var TRAVEL_HOURLY_RATE = 1820
var OFFICE_WORK_MULTIPLIER = 3.0
var BIM_RATE_PER_M2 = 7.0

var SCAN_HOURS_PER_1000M2 = {
  matterport_pro3: { office: 2.0, open: 1.0 },
  blk360_g2:       { office: 2.0, open: 1.0 },
  blk2go:          { office: 1.0, open: 0.5 },
  rtc360:          { office: 2.0, open: 1.0 },
}

var SCANNER_NAMES = {
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

  var isOpen = projectType === 'industrial' || projectType === 'outdoor'
  var hoursPerK = SCAN_HOURS_PER_1000M2[scannerType][isOpen ? 'open' : 'office']
  var scanHours = (areaM2 / 1000) * hoursPerK

  var scanDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours / 8) * 2) / 2)
  var officeDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours * OFFICE_WORK_MULTIPLIER / 8) * 2) / 2)

  var scanCost = scanDays * SCAN_DAY_RATE
  var officeCost = officeDays * OFFICE_DAY_RATE

  var deliverables = data.deliverables || []
  var needsBim = deliverables.indexOf('ifc_bim') !== -1 || deliverables.indexOf('2d_drawings') !== -1
  var bimCost = needsBim ? areaM2 * BIM_RATE_PER_M2 : 0

  var travelCost = estimateTravelCost(data.postalCode || '')
  var subtotal = scanCost + officeCost + bimCost + travelCost
  var adminMarkup = subtotal * ADMIN_MARKUP

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
    totalMax: totalMax
  }
}

// ─── Valg-data ──────────────────────────────────────────────────────────────

var PROJECT_TYPES = [
  { value: 'office',          label: 'Kontor / Næringsbygg' },
  { value: 'residential',     label: 'Bolig' },
  { value: 'industrial',      label: 'Industri / Produksjon' },
  { value: 'technical_rooms', label: 'Tekniske rom' },
  { value: 'outdoor',         label: 'Uteområde' },
  { value: 'other',           label: 'Annet' }
]

var SCAN_PURPOSES = [
  { value: 'rehabilitation',  label: 'Rehabilitering / Ombygging' },
  { value: 'documentation',   label: 'As-built dokumentasjon' },
  { value: 'bim_projection',  label: 'Prosjektering og BIM' },
  { value: 'visualization',   label: 'Visualisering / Digital tvilling' },
  { value: 'quality_control', label: 'Kvalitetskontroll' }
]

var DELIVERABLES = [
  { value: 'point_cloud',  label: 'Punktsky' },
  { value: '3d_model',     label: '3D-modell' },
  { value: '2d_drawings',  label: '2D-tegninger' },
  { value: 'ifc_bim',      label: 'IFC/Revit BIM' },
  { value: 'virtual_tour', label: 'Virtuell visning' }
]

var PRECISION_LEVELS = [
  { value: 'standard', label: 'Standard (±10mm)' },
  { value: 'high',     label: 'Høy presisjon (±4mm)' }
]

// ─── State ──────────────────────────────────────────────────────────────────

var form = {
  projectType: null,
  scanPurpose: null,
  areaM2: 0,
  postalCode: '',
  deliverables: [],
  precisionLevel: null
}

// ─── Bygg knapper ───────────────────────────────────────────────────────────

function buildButtons(containerId, options, field) {
  var container = document.getElementById(containerId)
  for (var i = 0; i < options.length; i++) {
    var btn = document.createElement('button')
    btn.textContent = options[i].label
    btn.className = 'btn'
    btn.setAttribute('data-value', options[i].value)
    btn.addEventListener('click', (function (opt) {
      return function () {
        form[field] = opt.value
        var buttons = container.querySelectorAll('button')
        for (var j = 0; j < buttons.length; j++) {
          buttons[j].className = buttons[j].getAttribute('data-value') === form[field] ? 'btn active' : 'btn'
        }
        updateEstimate()
      }
    })(options[i]))
    container.appendChild(btn)
  }
}

function buildToggleButtons(containerId, options, field) {
  var container = document.getElementById(containerId)
  for (var i = 0; i < options.length; i++) {
    var btn = document.createElement('button')
    btn.textContent = options[i].label
    btn.className = 'btn'
    btn.setAttribute('data-value', options[i].value)
    btn.addEventListener('click', (function (opt) {
      return function () {
        var list = form[field]
        var index = list.indexOf(opt.value)
        if (index === -1) {
          list.push(opt.value)
        } else {
          list.splice(index, 1)
        }
        var buttons = container.querySelectorAll('button')
        for (var j = 0; j < buttons.length; j++) {
          var isActive = list.indexOf(buttons[j].getAttribute('data-value')) !== -1
          buttons[j].className = isActive ? 'btn active' : 'btn'
        }
        updateEstimate()
      }
    })(options[i]))
    container.appendChild(btn)
  }
}

// ─── Oppdater estimat-panel ─────────────────────────────────────────────────

function formatNumber(n) {
  return n.toLocaleString('nb-NO')
}

function updateEstimate() {
  var panel = document.getElementById('estimatePanel')

  if (!form.areaM2) {
    panel.innerHTML =
      '<h2>Estimert pris</h2>' +
      '<p class="hint">Fyll inn areal for å se estimat.</p>'
    return
  }

  var est = calculateEstimate(form)

  var lines = [
    { label: 'Skanning',        value: est.scanCost },
    { label: 'Etterarbeid',     value: est.officeCost },
    { label: 'BIM-modellering', value: est.bimCost },
    { label: 'Reise',           value: est.travelCost },
    { label: 'Administrasjon',  value: est.adminMarkup }
  ]

  var html = '<h2>Estimert pris</h2>'
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].value > 0) {
      html += '<div class="line">' +
        '<span>' + lines[i].label + '</span>' +
        '<span class="value">' + formatNumber(lines[i].value) + ' kr</span>' +
      '</div>'
    }
  }

  html += '<div class="total">' +
    '<span>Totalt</span>' +
    '<span class="value">' + formatNumber(est.totalMin) + ' – ' + formatNumber(est.totalMax) + ' kr</span>' +
  '</div>'

  html += '<span class="badge">' + SCANNER_NAMES[est.scannerType] + '</span> '
  html += '<span style="font-size:12px;color:#999">' + est.scanDays + 'd felt / ' + est.officeDays + 'd kontor</span>'
  html += '<p class="hint">Grovestimat. Endelig pris avklares etter befaring.</p>'

  panel.innerHTML = html
}

// ─── Init ───────────────────────────────────────────────────────────────────

buildButtons('projectType', PROJECT_TYPES, 'projectType')
buildButtons('scanPurpose', SCAN_PURPOSES, 'scanPurpose')
buildToggleButtons('deliverables', DELIVERABLES, 'deliverables')
buildButtons('precisionLevel', PRECISION_LEVELS, 'precisionLevel')

document.getElementById('areaM2').addEventListener('input', function (e) {
  form.areaM2 = e.target.value ? Number(e.target.value) : 0
  updateEstimate()
})

document.getElementById('postalCode').addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  form.postalCode = e.target.value
  updateEstimate()
})
