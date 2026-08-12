export const colors = {
  bg: '#F2F8FE',
  card: '#FFFFFF',
  primary: '#2E90FA',
  primaryDark: '#1570CF',
  primarySoft: '#D1E9FF',
  track: '#E7F0FA',
  text: '#101828',
  textMuted: '#667085',
  border: '#E4E7EC',
  success: '#12B76A',
  danger: '#F04438',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Drop shadow that reads the same on Android (elevation) and iOS. */
export const shadow = {
  shadowColor: '#0B2A45',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
