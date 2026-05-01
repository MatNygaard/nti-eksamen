// ─── Priser og satser ────────────────────────────────────────────────────────

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

// ─── Skjemavalg (state) ─────────────────────────────────────────────────────

var form = {
  projectType: null,
  scanPurpose: null,
  areaM2: 0,
  postalCode: '',
  deliverables: [],
  precisionLevel: null,
}

// ─── Hjelpefunksjoner ───────────────────────────────────────────────────────

function formatKr(tall) {
  return tall.toLocaleString('nb-NO') + ' kr'
}

function roundToHalfDay(hours) {
  var days = Math.ceil((hours / 8) * 2) / 2
  if (days < MINIMUM_DAYS) {
    return MINIMUM_DAYS
  }
  return days
}

// ─── Velg skanner basert på brukerens valg ───────────────────────────────────

function selectScanner() {
  if (form.precisionLevel === 'high') return 'blk360_g2'
  if (form.scanPurpose === 'visualization') return 'matterport_pro3'
  if (form.scanPurpose === 'bim_projection') return 'blk2go'
  return 'blk360_g2'
}

// ─── Beregn reisekostnad ut fra postnummer ───────────────────────────────────

function estimateTravelCost() {
  if (!form.postalCode) return 0

  var code = parseInt(form.postalCode, 10)

  if (code >= 1300 && code <= 1399) return 0
  if (code >= 900  && code <= 1299) return TRAVEL_HOURLY_RATE * 0.5
  if (code >= 200  && code <= 899)  return TRAVEL_HOURLY_RATE * 1.5
  if (code >= 4000 && code <= 5999) return TRAVEL_HOURLY_RATE * 4
  if (code >= 7000 && code <= 7999) return TRAVEL_HOURLY_RATE * 6
  if (code >= 8000 && code <= 9999) return TRAVEL_HOURLY_RATE * 8

  return TRAVEL_HOURLY_RATE * 2
}

// ─── Hovedberegning av estimat ───────────────────────────────────────────────

function calculateEstimate() {
  var area = form.areaM2
  var scanner = selectScanner()

  // Finn skannehastighet basert på type bygg
  var isOpen = (form.projectType === 'industrial' || form.projectType === 'outdoor')
  var type = isOpen ? 'open' : 'office'
  var scanHours = (area / 1000) * SCAN_HOURS_PER_1000M2[scanner][type]

  // Beregn antall dager
  var scanDays = roundToHalfDay(scanHours)
  var officeDays = roundToHalfDay(scanHours * OFFICE_WORK_MULTIPLIER)

  // Beregn kostnader
  var scanCost = scanDays * SCAN_DAY_RATE
  var officeCost = officeDays * OFFICE_DAY_RATE

  // BIM-kostnad hvis relevant
  var needsBim = form.deliverables.indexOf('ifc_bim') !== -1
                 || form.deliverables.indexOf('2d_drawings') !== -1
  var bimCost = needsBim ? area * BIM_RATE_PER_M2 : 0

  // Reise og administrasjon
  var travelCost = estimateTravelCost()
  var subtotal = scanCost + officeCost + bimCost + travelCost
  var adminMarkup = subtotal * ADMIN_MARKUP

  // Totalspenn (±)
  var baseTotal = subtotal + adminMarkup
  var totalMin = Math.max(MINIMUM_TOTAL, Math.round(baseTotal * 0.90))
  var totalMax = Math.round(baseTotal * 1.15)

  return {
    scanner: scanner,
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

// ─── Oppdater estimat-panelet ────────────────────────────────────────────────

function showLine(id, value) {
  var line = document.getElementById(id)
  if (value > 0) {
    line.style.display = 'flex'
    line.querySelector('.value').textContent = formatKr(value)
  } else {
    line.style.display = 'none'
  }
}

function updateEstimate() {
  var emptyHint = document.getElementById('emptyHint')
  var details = document.getElementById('estimateDetails')

  if (!form.areaM2) {
    emptyHint.style.display = 'block'
    details.style.display = 'none'
    return
  }

  emptyHint.style.display = 'none'
  details.style.display = 'block'

  var est = calculateEstimate()

  // Oppdater hver kostnadslinje
  showLine('lineScan', est.scanCost)
  showLine('lineOffice', est.officeCost)
  showLine('lineBim', est.bimCost)
  showLine('lineTravel', est.travelCost)
  showLine('lineAdmin', est.adminMarkup)

  // Total
  document.getElementById('valTotal').textContent =
    formatKr(est.totalMin) + ' – ' + formatKr(est.totalMax)

  // Skanner og dager
  document.getElementById('scannerBadge').textContent = SCANNER_NAMES[est.scanner]
  document.getElementById('daysInfo').textContent =
    est.scanDays + 'd felt / ' + est.officeDays + 'd kontor'
}

// ─── Knappehåndtering ────────────────────────────────────────────────────────

function setupSingleSelect(groupId, field) {
  var buttons = document.querySelectorAll('#' + groupId + ' .btn')

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      form[field] = this.dataset.value

      // Oppdater aktiv-klasse på alle knapper i gruppen
      var siblings = this.parentElement.querySelectorAll('.btn')
      for (var j = 0; j < siblings.length; j++) {
        if (siblings[j].dataset.value === form[field]) {
          siblings[j].classList.add('active')
        } else {
          siblings[j].classList.remove('active')
        }
      }

      updateEstimate()
    })
  }
}

function setupMultiSelect(groupId, field) {
  var buttons = document.querySelectorAll('#' + groupId + ' .btn')

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      var value = this.dataset.value
      var index = form[field].indexOf(value)

      // Legg til eller fjern fra listen
      if (index === -1) {
        form[field].push(value)
      } else {
        form[field].splice(index, 1)
      }

      // Oppdater aktiv-klasse
      if (form[field].indexOf(value) !== -1) {
        this.classList.add('active')
      } else {
        this.classList.remove('active')
      }

      updateEstimate()
    })
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

setupSingleSelect('projectType', 'projectType')
setupSingleSelect('scanPurpose', 'scanPurpose')
setupMultiSelect('deliverables', 'deliverables')
setupSingleSelect('precisionLevel', 'precisionLevel')

document.getElementById('areaM2').addEventListener('input', function (e) {
  form.areaM2 = e.target.value ? Number(e.target.value) : 0
  updateEstimate()
})

document.getElementById('postalCode').addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  form.postalCode = e.target.value
  updateEstimate()
})
