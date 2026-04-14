export const projectTypeLabels: Record<string, string> = {
  office: 'Kontor',
  residential: 'Bolig',
  industrial: 'Industri',
  technical_rooms: 'Tekniske rom',
  outdoor: 'Utendørs',
  other: 'Annet',
}

export const scanPurposeLabels: Record<string, string> = {
  rehabilitation: 'Rehabilitering',
  documentation: 'Dokumentasjon',
  bim_projection: 'BIM-prosjektering',
  visualization: 'Visualisering',
  quality_control: 'Kvalitetskontroll',
}

export const deliverableLabels: Record<string, string> = {
  point_cloud: 'Punktsky',
  '3d_model': '3D-modell',
  '2d_drawings': '2D-tegninger',
  ifc_bim: 'IFC/BIM',
  virtual_tour: 'Virtuell omvisning',
}

export const scannerLabels: Record<string, string> = {
  matterport_pro3: 'Matterport Pro3',
  blk2go: 'BLK2GO',
  blk360_g2: 'BLK360 G2',
  rtc360: 'RTC360',
}

export const technicalScopeLabels: Record<string, string> = {
  ark_only: 'ARK (kun arkitektur)',
  ark_mep_visible: 'ARK + MEP (synlig)',
  ark_mep_full: 'ARK + MEP (full)',
}

export function translate(
  labels: Record<string, string>,
  key: string | null | undefined
): string {
  if (!key) return '—'
  return labels[key] ?? key
}
