import type { InquiryFormData, EstimateResult, ScannerType, Deliverable } from '@/types'

const SCAN_DAY_RATE = 17_500
const OFFICE_DAY_RATE = 13_250
const MINIMUM_DAYS = 0.5
const MINIMUM_TOTAL = 17_500
const ADMIN_MARKUP = 0.10
const TRAVEL_HOURLY_RATE = 1_820
const OFFICE_WORK_MULTIPLIER = 3.0
const OFFICE_BLK2GO_MULTIPLIER = 3.5
const LARGE_BUILDING_FACTOR = 0.85

const SCAN_HOURS_PER_1000M2: Record<ScannerType, Record<'office' | 'open', number>> = {
  matterport_pro3: { office: 2.0, open: 1.0 },
  blk360_g2:       { office: 2.0, open: 1.0 },
  blk2go:          { office: 1.0, open: 0.5 },
  rtc360:          { office: 2.0, open: 1.0 },
}

const BIM_RATES = {
  ark_only: {
    tier1: { maxM2: 2000,     minRate: 8.0,  maxRate: 9.0  },
    tier2: { maxM2: 15000,    minRate: 4.5,  maxRate: 5.5  },
    tier3: { maxM2: Infinity, minRate: 2.5,  maxRate: 3.5  },
  },
  ark_mep_visible: {
    tier1: { maxM2: 2000,     minRate: 12.0, maxRate: 15.0 },
    tier2: { maxM2: 15000,    minRate: 6.0,  maxRate: 8.0  },
    tier3: { maxM2: Infinity, minRate: 5.5,  maxRate: 7.0  },
  },
  ark_mep_full: {
    tier1: { maxM2: Infinity, minRate: 90.0, maxRate: 120.0 },
  },
}

function selectScanner(data: Partial<InquiryFormData>): ScannerType {
  const { scanPurpose, precisionLevel, technicalScope } = data
  if (technicalScope === 'ark_mep_full') return 'rtc360'
  if (precisionLevel === 'high') return 'blk360_g2'
  if (scanPurpose === 'visualization') return 'matterport_pro3'
  if (scanPurpose === 'bim_projection') return 'blk2go'
  if (scanPurpose === 'rehabilitation') return 'blk360_g2'
  return 'blk360_g2'
}

function isOpenLayout(projectType: string): boolean {
  return ['industrial', 'outdoor'].includes(projectType)
}

function calculateScanHours(
  areaM2: number,
  scannerType: ScannerType,
  projectType: string
): number {
  const layoutType = isOpenLayout(projectType) ? 'open' : 'office'
  const hoursPerK = SCAN_HOURS_PER_1000M2[scannerType][layoutType]
  const baseHours = (areaM2 / 1000) * hoursPerK
  return areaM2 > 5000 ? baseHours * LARGE_BUILDING_FACTOR : baseHours
}

function estimateTravelCost(postalCode: string): number {
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

function calculateBimCost(
  areaM2: number,
  technicalScope: 'ark_only' | 'ark_mep_visible' | 'ark_mep_full'
): { min: number; max: number } {
  const rates = BIM_RATES[technicalScope]
  const tiers = Object.values(rates)
  const tier = tiers.find(t => areaM2 <= t.maxM2) ?? tiers[tiers.length - 1]
  return { min: areaM2 * tier.minRate, max: areaM2 * tier.maxRate }
}

function checkManualReview(data: Partial<InquiryFormData>): string[] {
  const reasons: string[] = []
  if (data.technicalScope === 'ark_mep_full')
    reasons.push('Tekniske installasjoner over himling krever befaring')
  if (data.hmsRequirements)
    reasons.push('HMS-krav — krever planlegging og godkjenning')
  if (data.areaM2 && data.areaM2 > 15_000)
    reasons.push('Bygg over 15 000 m² — kompleks logistikk')
  if (data.limitedAccess)
    reasons.push('Begrenset tilgang — krever koordinering på stedet')
  if (data.projectType === 'technical_rooms')
    reasons.push('Tekniske rom — høy presisjon, manuell vurdering')
  if (data.scanPurpose === 'quality_control')
    reasons.push('Kvalitetskontroll — spesialisert oppdrag')
  return reasons
}

export function calculateEstimate(data: Partial<InquiryFormData>): EstimateResult {
  const areaM2 = data.areaM2 ?? 0
  const technicalScope = data.technicalScope ?? 'ark_only'
  const projectType = data.projectType ?? 'office'

  const scannerType = selectScanner(data)
  const scanHours = calculateScanHours(areaM2, scannerType, projectType)
  const scanDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours / 8) * 2) / 2)

  const multiplier = scannerType === 'blk2go'
    ? OFFICE_BLK2GO_MULTIPLIER
    : OFFICE_WORK_MULTIPLIER
  const officeDays = Math.max(MINIMUM_DAYS, Math.ceil((scanHours * multiplier / 8) * 2) / 2)

  const scanCost = scanDays * SCAN_DAY_RATE
  const officeCost = officeDays * OFFICE_DAY_RATE

  const needsBim = ['ifc_bim', '2d_drawings'].some(
    d => data.deliverables?.includes(d as Deliverable)
  )
  const bimRange = needsBim ? calculateBimCost(areaM2, technicalScope) : { min: 0, max: 0 }
  const bimCost = needsBim ? (bimRange.min + bimRange.max) / 2 : 0

  const travelCost = estimateTravelCost(data.postalCode ?? '')
  const subtotal = scanCost + officeCost + bimCost + travelCost
  const adminMarkup = subtotal * ADMIN_MARKUP
  const baseTotal = subtotal + adminMarkup

  const totalMin = Math.ceil(Math.max(MINIMUM_TOTAL, baseTotal * 0.90) / 500) * 500
  const totalMax = Math.ceil((baseTotal * 1.20) / 500) * 500

  const manualReviewReasons = checkManualReview(data)
  const manualReview = manualReviewReasons.length > 0 || scannerType === 'rtc360'

  return {
    scannerType, scanHours, scanDays, officeDays,
    scanCost, officeCost, bimCost, travelCost, adminMarkup,
    totalMin, totalMax, manualReview, manualReviewReasons,
  }
}

export function formatNOK(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getScannerDisplayName(type: ScannerType): string {
  const names: Record<ScannerType, string> = {
    matterport_pro3: 'Matterport Pro3',
    blk2go:          'Leica BLK2GO',
    blk360_g2:       'Leica BLK360 G2',
    rtc360:          'Leica RTC360',
  }
  return names[type]
}
