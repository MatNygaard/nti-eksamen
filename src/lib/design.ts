// NTI Reality Capture — Design System
// Alle spacing, typografi og farger skal hentes herfra
// Aldri hardkod disse verdiene direkte i komponenter

export const colors = {
  // Primær
  red:       '#E63312',
  redDark:   '#CC2A0F',
  redLight:  '#FEF2F2',
  redBorder: '#FECACA',

  // Nøytral
  black:     '#0F172A',
  gray900:   '#111827',
  gray700:   '#374151',
  gray500:   '#6B7280',
  gray400:   '#9CA3AF',
  gray300:   '#D1D5DB',
  gray200:   '#E5E7EB',
  gray100:   '#F3F4F6',
  gray50:    '#F9FAFB',
  white:     '#FFFFFF',

  // Admin sidebar
  sidebar:   '#0F172A',
  sidebarHover: 'rgba(255,255,255,0.05)',
} as const

export const spacing = {
  // Seksjoner
  sectionY:  'py-20',        // mellom seksjoner på public sider
  sectionX:  'px-6',        // horisontal padding
  container: 'max-w-6xl mx-auto px-6',

  // Kort
  cardPad:   'p-6',         // standard kortpadding
  cardPadLg: 'p-8',         // stor kortpadding
  cardGap:   'gap-6',       // mellom kort i grid

  // Skjema
  fieldGap:  'space-y-5',   // mellom skjemafelter
  labelMb:   'mb-1.5',      // under label
} as const

export const typography = {
  // Overskrifter
  h1:        'text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-gray-900',
  h2:        'text-3xl font-bold tracking-tight text-gray-900',
  h3:        'text-xl font-semibold text-gray-900',
  h4:        'text-base font-semibold text-gray-900',

  // Brødtekst
  lead:      'text-lg text-gray-500 leading-relaxed',
  body:      'text-sm text-gray-600 leading-relaxed',
  small:     'text-xs text-gray-500',
  label:     'text-sm font-medium text-gray-700',
  meta:      'text-xs text-gray-400',
} as const

export const radius = {
  sm:   'rounded',      // 4px — tags, badges
  md:   'rounded-lg',   // 8px — knapper, inputs
  lg:   'rounded-xl',   // 12px — kort
  xl:   'rounded-2xl',  // 16px — modaler, store kort
} as const

export const shadow = {
  none: '',
  sm:   'shadow-sm',                              // standard kort
  md:   'shadow-md',                              // hover-tilstand
  lg:   'shadow-lg',                              // dropdown, modaler
  card: 'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',   // subtil kortshadow
} as const

export const borders = {
  default:  'border border-gray-200',
  light:    'border border-gray-100',
  red:      'border border-[#E63312]',
  focus:    'focus:outline-none focus:border-[#E63312] focus:ring-1 focus:ring-[#E63312]',
} as const

// Sammensatte komponenter — bruk disse direkte i JSX
export const ui = {
  // Knapper
  btnPrimary:   'inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E63312] text-white text-sm font-semibold rounded-lg hover:bg-[#CC2A0F] transition-colors disabled:opacity-50',
  btnSecondary: 'inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:border-[#E63312] hover:text-[#E63312] transition-colors',
  btnOutlineRed:'inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-[#E63312] text-[#E63312] text-sm font-semibold rounded-lg hover:bg-[#FEF2F2] transition-colors',
  btnGhost:     'inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors',

  // Input
  input:        'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#E63312] focus:ring-1 focus:ring-[#E63312] transition-colors',
  textarea:     'w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#E63312] focus:ring-1 focus:ring-[#E63312] transition-colors resize-none',
  label:        'block text-sm font-medium text-gray-700 mb-1.5',

  // Kort
  card:         'bg-white rounded-xl border border-gray-200 p-6',
  cardHover:    'bg-white rounded-xl border border-gray-200 p-6 hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 transition-all duration-200',
  cardSection:  'bg-white rounded-xl border border-gray-100 shadow-sm',

  // Badges
  badgeRed:     'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#FEF2F2] text-[#E63312]',
  badgeGray:    'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600',
  badgeBlue:    'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700',
  badgeGreen:   'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700',
  badgeAmber:   'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700',

  // Divider
  divider:      'border-t border-gray-100',

  // Seksjonsheader
  sectionHeader: 'max-w-6xl mx-auto px-6',
} as const
