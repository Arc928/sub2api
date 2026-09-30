/**
 * Public pages retain the existing OpenCode tokens. Console routes override
 * their CSS variables at the document root, including body-level Teleports.
 * RGB channels preserve Tailwind opacity modifiers such as bg-primary-50/40.
 */

const monoStack = [
  'Berkeley Mono',
  'JetBrains Mono',
  'IBM Plex Mono',
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Monaco',
  'Consolas',
  'Liberation Mono',
  'Courier New',
  'PingFang SC',
  'Hiragino Sans GB',
  'Microsoft YaHei',
  'monospace'
]

// Warm neutral ladder (OpenCode canvas -> ink)
const warm = {
  50: '#fdfcfc', // canvas
  100: '#f8f7f7', // surface-soft
  200: '#f1eeee', // surface-card
  300: '#ddd9d9', // strong hairline (solid)
  400: '#9a9898', // ash
  500: '#6e6e73', // stone
  600: '#646262', // mute
  700: '#424245', // body
  800: '#302c2c', // charcoal
  900: '#201d1d', // ink
  950: '#0f0000' // ink-deep
}

// Dark-mode surfaces (near-black family, one notch steps)
const darkSurfaces = {
  50: '#f1eeee',
  100: '#c4c0bf',
  200: '#9a9898',
  300: '#7a7676',
  400: '#646262',
  500: '#4a4545',
  600: '#3a3535',
  700: '#302c2c', // surface-dark-elevated
  800: '#262222',
  900: '#201d1d', // surface-dark
  950: '#191616'
}

// Apple HIG semantic ramps (reserved for status/in-product signals)
const danger = {
  50: '#fff5f4',
  100: '#ffe5e3',
  200: '#ffc9c4',
  300: '#ffa49c',
  400: '#ff6f63',
  500: '#ff3b30',
  600: '#d70015',
  700: '#a50011',
  800: '#7a0d0d',
  900: '#4d0a0a',
  950: '#2a0505'
}
const success = {
  50: '#f2fdf5',
  100: '#dcf9e5',
  200: '#b3f0c6',
  300: '#7ae29c',
  400: '#4bd177',
  500: '#30d158',
  600: '#24a947',
  700: '#1a7f34',
  800: '#145c27',
  900: '#0e421d',
  950: '#072411'
}
const warning = {
  50: '#fffaef',
  100: '#fff0d6',
  200: '#ffddb0',
  300: '#ffc270',
  400: '#ffab38',
  500: '#ff9f0a',
  600: '#cc7f08',
  700: '#995f06',
  800: '#6e4508',
  900: '#4a2f08',
  950: '#281904'
}
const accent = {
  50: '#eff6ff',
  100: '#dcebfd',
  200: '#b6d8fa',
  300: '#7fbdf5',
  400: '#3f9beb',
  500: '#007aff',
  600: '#0066d6',
  700: '#0056b3',
  800: '#004085',
  900: '#00305f',
  950: '#001d3a'
}

function scopedColor(hex, name) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(' ')
  return `rgb(var(--ui-${name}, ${channels}) / <alpha-value>)`
}

function scopedScale(scale, name) {
  return Object.fromEntries(Object.entries(scale).map(([step, hex]) => [step, scopedColor(hex, `${name}-${step}`)]))
}

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Public ink ladder; console routes substitute coral.
        primary: scopedScale(warm, 'primary'),
        // Public blue accent; console routes substitute teal.
        accent: scopedScale(accent, 'accent'),
        // Semantic status ramps by name
        danger: scopedScale(danger, 'danger'),
        success: scopedScale(success, 'success'),
        warning: scopedScale(warning, 'warning'),
        // Dark surfaces
        dark: scopedScale(darkSurfaces, 'dark'),
        // Warm neutrals replace cool grays
        gray: scopedScale(warm, 'neutral'),
        slate: scopedScale(warm, 'neutral'),
        zinc: scopedScale(warm, 'neutral'),
        stone: scopedScale(warm, 'neutral'),
        neutral: scopedScale(warm, 'neutral'),
        // Semantic status ramp remaps
        red: scopedScale(danger, 'danger'),
        rose: scopedScale(danger, 'danger'),
        pink: scopedScale(danger, 'danger'),
        emerald: scopedScale(success, 'success'),
        green: scopedScale(success, 'success'),
        teal: scopedScale(success, 'success'),
        cyan: scopedScale(success, 'success'),
        amber: scopedScale(warning, 'warning'),
        orange: scopedScale(warning, 'warning'),
        yellow: scopedScale(warning, 'warning'),
        blue: scopedScale(accent, 'accent'),
        sky: scopedScale(accent, 'accent'),
        indigo: scopedScale(accent, 'accent'),
        // Decorative hues collapse into the neutral ladder (monochrome chrome)
        purple: scopedScale(warm, 'neutral'),
        violet: scopedScale(warm, 'neutral'),
        fuchsia: scopedScale(warm, 'neutral'),
        lime: scopedScale(warning, 'warning'),
        white: scopedColor('#ffffff', 'white'),
        // Core tokens by name
        ink: scopedColor('#201d1d', 'ink'),
        'ink-deep': scopedColor('#0f0000', 'ink-deep'),
        charcoal: scopedColor('#302c2c', 'charcoal'),
        canvas: scopedColor('#fdfcfc', 'canvas'),
        'surface-soft': scopedColor('#f8f7f7', 'surface-soft'),
        'surface-card': scopedColor('#f1eeee', 'surface-card'),
        'surface-dark': scopedColor('#201d1d', 'surface-dark'),
        'on-primary': scopedColor('#fdfcfc', 'on-primary'),
        'on-dark': scopedColor('#fdfcfc', 'on-dark'),
        'hairline': 'rgb(var(--ui-hairline, 15 0 0) / calc(var(--ui-hairline-opacity, 0.12) * <alpha-value>))',
        'hairline-strong': scopedColor('#646262', 'hairline-strong')
      },
      fontFamily: {
        sans: [`var(--ui-font-sans, ${monoStack.map((font) => font.includes(' ') ? `"${font}"` : font).join(', ')})`],
        mono: monoStack
      },
      // Flat-on-cream: the system has no drop shadows.
      boxShadow: {
        none: 'none',
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        glass: 'none',
        'glass-sm': 'none',
        glow: 'none',
        'glow-lg': 'none',
        card: 'none',
        'card-hover': 'none',
        'inner-glow': 'none'
      },
      // Public 4px radii; console routes supply their component hierarchy.
      borderRadius: {
        none: '0px',
        sm: 'var(--ui-radius-sm, 4px)',
        DEFAULT: 'var(--ui-radius-md, 4px)',
        md: 'var(--ui-radius-md, 4px)',
        lg: 'var(--ui-radius-lg, 4px)',
        xl: 'var(--ui-radius-xl, 4px)',
        '2xl': 'var(--ui-radius-2xl, 4px)',
        '3xl': 'var(--ui-radius-3xl, 4px)',
        '4xl': 'var(--ui-radius-4xl, 4px)'
      },
      backgroundImage: {
        // Flatten brand gradients to solid ink
        'gradient-radial': 'none',
        'gradient-primary': 'none',
        'gradient-dark': 'none',
        'gradient-glass': 'none',
        'mesh-gradient': 'none'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
}
