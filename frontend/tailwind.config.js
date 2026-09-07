/**
 * Design system: OpenCode ("terminal-native manpage") style.
 * Reference: DESIGN-opencode.ai.md
 *
 * Strategy: the ~10k existing class usages reference Tailwind scale names
 * (primary-*, gray-*, dark-*, red/emerald/amber/blue-*, rounded-*, shadow-*).
 * We re-map those scales onto the OpenCode token vocabulary instead of
 * rewriting every component:
 *
 *   gray-*   -> warm neutral ladder (canvas #fdfcfc .. ink #201d1d .. #0f0000)
 *   primary* -> same monochrome ink ladder (the brand's only "color" is near-black)
 *   dark-*   -> dark surfaces (#201d1d / #302c2c family)
 *   red-*    -> danger  ramp (#ff3b30)      emerald/green -> success (#30d158)
 *   amber-*  -> warning ramp (#ff9f0a)      blue/sky      -> accent   (#007aff)
 *   purple/indigo/violet/pink/rose -> neutral stone ladder (chrome stays monochrome)
 *   rounded-{sm..3xl} -> 4px (interactive)  | shadows -> none (flat-on-cream)
 *   sans     -> monospace stack (Berkeley Mono fallback: IBM Plex Mono -> ui-monospace)
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

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand ink (monochrome ladder — the near-black IS the brand color)
        primary: warm,
        // Apple-blue accent ramp (reserved for in-product/status signals)
        accent: accent,
        // Semantic status ramps by name
        danger: danger,
        success: success,
        warning: warning,
        // Dark surfaces
        dark: darkSurfaces,
        // Warm neutrals replace cool grays
        gray: warm,
        slate: warm,
        zinc: warm,
        stone: warm,
        neutral: warm,
        // Semantic status ramp remaps
        red: danger,
        rose: danger,
        pink: danger,
        emerald: success,
        green: success,
        teal: success,
        cyan: success,
        amber: warning,
        orange: warning,
        yellow: warning,
        blue: accent,
        sky: accent,
        indigo: accent,
        // Decorative hues collapse into the neutral ladder (monochrome chrome)
        purple: warm,
        violet: warm,
        fuchsia: warm,
        lime: warning,
        // Core tokens by name
        ink: '#201d1d',
        'ink-deep': '#0f0000',
        charcoal: '#302c2c',
        canvas: '#fdfcfc',
        'surface-soft': '#f8f7f7',
        'surface-card': '#f1eeee',
        'surface-dark': '#201d1d',
        'on-primary': '#fdfcfc',
        'on-dark': '#fdfcfc',
        'hairline': 'rgba(15,0,0,0.12)',
        'hairline-strong': '#646262'
      },
      fontFamily: {
        sans: monoStack,
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
      // 4px on interactive elements; containers stay sharp.
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '4px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        '4xl': '4px'
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
