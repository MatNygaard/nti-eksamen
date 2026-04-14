export type ProjectType =
  | 'office'
  | 'residential'
  | 'industrial'
  | 'technical_rooms'
  | 'outdoor'
  | 'other'

export type ScanPurpose =
  | 'rehabilitation'
  | 'documentation'
  | 'bim_projection'
  | 'visualization'
  | 'quality_control'

export type PrecisionLevel = 'standard' | 'high'

export type TechnicalScope =
  | 'ark_only'
  | 'ark_mep_visible'
  | 'ark_mep_full'

export type ScannerType =
  | 'matterport_pro3'
  | 'blk2go'
  | 'blk360_g2'
  | 'rtc360'

export type InquiryStatus = 'new' | 'reviewing' | 'quoted' | 'closed'

export type LightingCondition = 'good' | 'limited' | 'unknown'

export type Deliverable =
  | 'point_cloud'
  | '3d_model'
  | '2d_drawings'
  | 'ifc_bim'
  | 'virtual_tour'

export interface InquiryFormData {
  // Steg 1
  projectType: ProjectType
  scanPurpose: ScanPurpose

  // Steg 2
  areaM2: number
  floors: number
  address: string
  postalCode: string
  city: string

  // Steg 3
  deliverables: Deliverable[]
  precisionLevel: PrecisionLevel
  technicalScope: TechnicalScope

  // Steg 4
  buildingInUse: boolean
  hmsRequirements: boolean
  limitedAccess: boolean
  specialSurfaces: string
  lightingConditions: LightingCondition

  // Steg 5
  preferredDate: string
  deadline: string
  contactName: string
  contactEmail: string
  contactPhone: string
  companyName: string
  additionalInfo: string
  attachments?: Array<{ name: string; size: number; type: string; path: string }>
}

export interface EstimateResult {
  scannerType: ScannerType
  scanHours: number
  scanDays: number
  officeDays: number
  scanCost: number
  officeCost: number
  bimCost: number
  travelCost: number
  adminMarkup: number
  totalMin: number
  totalMax: number
  manualReview: boolean
  manualReviewReasons: string[]
}
