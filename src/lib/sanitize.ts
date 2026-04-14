export function sanitizeText(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 2000)
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254)
}

export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = Number(value)
  if (isNaN(n) || n < min || n > max) return null
  return n
}

export function sanitizeInquiry(data: Record<string, unknown>) {
  return {
    ...data,
    contact_name:    data.contact_name    ? sanitizeText(String(data.contact_name)) : null,
    company_name:    data.company_name    ? sanitizeText(String(data.company_name)) : null,
    contact_email:   data.contact_email   ? sanitizeEmail(String(data.contact_email)) : null,
    address:         data.address         ? sanitizeText(String(data.address)) : null,
    additional_info: data.additional_info ? sanitizeText(String(data.additional_info)) : null,
    area_m2:         sanitizeNumber(data.area_m2, 1, 500000),
  }
}
