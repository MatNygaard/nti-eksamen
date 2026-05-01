// Dagsatser
const SCAN_DAY_RATE = 17_500
const OFFICE_DAY_RATE = 13_250
const MINIMUM_DAYS = 0.5
const MINIMUM_TOTAL = 17_500
const ADMIN_MARKUP = 0.10

// Reise
const TRAVEL_HOURLY_RATE = 1_820

// Kontorarbeid = skannetimer × denne multiplikatoren
const OFFICE_WORK_MULTIPLIER = 3.0

// BIM-modellering: flat rate per m² når BIM er valgt
const BIM_RATE_PER_M2 = 7.0

// Timer per 1 000 m² — avhenger av scanner og romtype
const SCAN_HOURS_PER_1000M2 = {
  matterport_pro3: { office: 2.0, open: 1.0 },
  blk360_g2:       { office: 2.0, open: 1.0 },
  blk2go:          { office: 1.0, open: 0.5 },
  rtc360:          { office: 2.0, open: 1.0 },
}

function selectScanner(data) {
  const { scanPurpose, precisionLevel } = data
  if (precisionLevel === 'high') return 'blk360_g2'
  if (scanPurpose === 'visualization') return 'matterport_pro3'
  if (scanPurpose === 'bim_projection') return 'blk2go'
  if (scanPurpose === 'rehabilitation') return 'blk360_g2'
  return 'blk360_g2'
}

function isOpenLayout(projectType) {
  return ['industrial', 'outdoor'].includes(projectType)
}

function calculateScanHours(areaM2, scannerType, projectType) {
  const layoutType = isOpenLayout(projectType) ? 'open' : 'office'
  const hoursPerK = SCAN_HOURS_PER_1000M2[scannerType][layoutType]
  return (areaM2 / 1000) * hoursPerK
}

function estimateTravelCost(postalCode) {
  if (!postalCode) return 0
  const code = parseInt(postalCode, 10)
  if (code >= 1300 && code <= 1399) return 0
  if (code >= 900  && code <= 1299) return TRAVEL_HOURLY_RATE * 0.5
  if (code >= 200  && code <= 899)  return TRAVEL_HOURLY_RATE * 1.5
  if (code >= 4000 && code <= 5999) return TRAVEL_HOURLY_RATE * 4
  if (code >= 7000 && code <= 7999) return TRAVEL_HOURLY_RATE * 6
  if (code >= 8000 && code <= 9999) return TRAVEL_HOURLY_RATE * 8
  return TRAVEL_HOURLY_RATE * 2
}

export function calculateEstimate(data) {
  const areaM2 = data.areaM2 ?? 0
  const projectType = data.projectType ?? 'office'

  const scannerType = selectScanner(data)

  const scanHours = calculateScanHours(areaM2, scannerType, projectType)
  const scanDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours / 8) * 2) / 2)
  const officeDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours * OFFICE_WORK_MULTIPLIER / 8) * 2) / 2)

  const scanCost = scanDays * SCAN_DAY_RATE
  const officeCost = officeDays * OFFICE_DAY_RATE

  const needsBim = ['ifc_bim', '2d_drawings'].some(
    d => data.deliverables?.includes(d)
  )
  const bimCost = needsBim ? areaM2 * BIM_RATE_PER_M2 : 0

  const travelCost = estimateTravelCost(data.postalCode ?? '')
  const subtotal = scanCost + officeCost + bimCost + travelCost
  const adminMarkup = subtotal * ADMIN_MARKUP

  const baseTotal = subtotal + adminMarkup
  const totalMin = Math.max(MINIMUM_TOTAL, Math.round(baseTotal * 0.90))
  const totalMax = Math.round(baseTotal * 1.15)

  return {
    scannerType, scanDays, officeDays,
    scanCost, officeCost, bimCost, travelCost, adminMarkup,
    totalMin, totalMax,
  }
}

const SCANNER_NAMES = {
  matterport_pro3: 'Matterport Pro3',
  blk2go:          'Leica BLK2GO',
  blk360_g2:       'Leica BLK360 G2',
  rtc360:          'Leica RTC360',
}

export function getScannerDisplayName(type) {
  return SCANNER_NAMES[type]
}
