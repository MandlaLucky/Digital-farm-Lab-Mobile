export const colors = {
  bg: '#07100e', panel: '#0b1714', panel2: '#0e1d19', panel3: '#11231e',
  line: 'rgba(175,211,198,0.13)', lineStrong: 'rgba(175,211,198,0.22)',
  text: '#d9e6e2', muted: '#718c83', faint: '#425c54',
  green: '#55d88b', greenBright: '#76eca5', greenDark: '#1b7448',
  blue: '#4ca6da', amber: '#dcad51', red: '#e66e66',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 4, md: 6, lg: 8, xl: 10, pill: 999 } as const;
export const typography = {
  body: { fontFamily: 'DMSans_400Regular' as const },
  bodyMedium: { fontFamily: 'DMSans_500Medium' as const },
  bodyBold: { fontFamily: 'DMSans_700Bold' as const },
  mono: { fontFamily: 'JetBrainsMono_500Medium' as const },
  display: { fontFamily: 'Manrope_700Bold' as const },
  displayBold: { fontFamily: 'Manrope_800ExtraBold' as const },
} as const;
export const fontSizes = { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, kpi: 32 } as const;
