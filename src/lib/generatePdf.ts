import jsPDF from 'jspdf'
import type { InquiryFormData, EstimateResult } from '@/types'
import { formatNOK, getScannerDisplayName } from '@/lib/pricing'

export async function generateInquiryPdf(
  formData: Partial<InquiryFormData>,
  estimate: EstimateResult
): Promise<void> {
  const doc = new jsPDF()
  const red = [230, 51, 18] as const
  const dark = [17, 24, 39] as const
  const gray = [107, 114, 128] as const

  // Header
  doc.setFillColor(...red)
  doc.rect(0, 0, 210, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('NTI Reality Capture', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Forespørsel om 3D-skanning', 140, 13)

  // Dato
  doc.setTextColor(...gray)
  doc.setFontSize(9)
  doc.text(
    `Generert: ${new Date().toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'long', year: 'numeric',
    })}`,
    14, 28
  )

  // Prosjektinfo
  doc.setTextColor(...dark)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Prosjektinformasjon', 14, 38)
  doc.setDrawColor(...red)
  doc.line(14, 40, 196, 40)

  const rows = [
    ['Firma', formData.companyName ?? '—'],
    ['Kontaktperson', formData.contactName ?? '—'],
    ['E-post', formData.contactEmail ?? '—'],
    ['Telefon', formData.contactPhone ?? '—'],
    ['Prosjekttype', formData.projectType ?? '—'],
    ['Areal', formData.areaM2 ? `${formData.areaM2} m²` : '—'],
    ['Adresse', `${formData.address ?? ''} ${formData.postalCode ?? ''} ${formData.city ?? ''}`.trim() || '—'],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let y = 48
  rows.forEach(([label, value]) => {
    doc.setTextColor(...gray)
    doc.text(label, 14, y)
    doc.setTextColor(...dark)
    doc.text(value, 70, y)
    y += 8
  })

  // Estimat
  y += 6
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...dark)
  doc.text('Prisestimat', 14, y)
  doc.setDrawColor(...red)
  doc.line(14, y + 2, 196, y + 2)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const estimatRows: [string, string][] = [
    ['Scanner brukt', getScannerDisplayName(estimate.scannerType)],
    ['Skanning', formatNOK(estimate.scanCost)],
    ['Etterarbeid', formatNOK(estimate.officeCost)],
  ]
  if (estimate.bimCost > 0)
    estimatRows.push(['BIM-modellering', formatNOK(estimate.bimCost)])
  if (estimate.travelCost > 0)
    estimatRows.push(['Reise', formatNOK(estimate.travelCost)])
  estimatRows.push(['Administrasjon', formatNOK(estimate.adminMarkup)])

  estimatRows.forEach(([label, value]) => {
    doc.setTextColor(...gray)
    doc.text(label, 14, y)
    doc.setTextColor(...dark)
    doc.text(value, 140, y)
    y += 8
  })

  // Total
  y += 2
  doc.setDrawColor(229, 231, 235)
  doc.line(14, y, 196, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...red)
  doc.text('Estimert totalpris', 14, y)
  doc.text(
    `${formatNOK(estimate.totalMin)} – ${formatNOK(estimate.totalMax)}`,
    110, y
  )

  // Disclaimer
  y += 12
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.text(
    'Dette er et grovestimat. Endelig pris avklares etter befaring og gjennomgang av prosjekt.',
    14, y
  )

  if (estimate.manualReview) {
    y += 6
    doc.setTextColor(180, 83, 9)
    doc.text('Advarsel: Dette prosjektet krever manuell vurdering av en spesialist.', 14, y)
  }

  // Footer
  doc.setFillColor(249, 250, 251)
  doc.rect(0, 272, 210, 25, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.text('NTI AS • Malmskriverveien 35, 1337 Sandvika', 14, 282)
  doc.text('salg-no@nti.biz • 48 20 33 00 • www.nti.biz/no', 14, 288)

  doc.save(`NTI-forespørsel-${formData.companyName ?? 'estimat'}.pdf`)
}
