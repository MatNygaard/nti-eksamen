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

export type ScannerType =
  | 'matterport_pro3'
  | 'blk2go'
  | 'blk360_g2'
  | 'rtc360'

export type Deliverable =
  | 'point_cloud'
  | '3d_model'
  | '2d_drawings'
  | 'ifc_bim'
  | 'virtual_tour'

export interface ScanFormData {
  projectType: ProjectType
  scanPurpose: ScanPurpose
  areaM2: number
  postalCode: string
  deliverables: Deliverable[]
  precisionLevel: PrecisionLevel
}

export interface EstimateResult {
  scannerType: ScannerType
  scanDays: number
  officeDays: number
  scanCost: number
  officeCost: number
  bimCost: number
  travelCost: number
  adminMarkup: number
  totalMin: number
  totalMax: number
}
