import {
  createSystem,
  defaultConfig,
  defineConfig,
  SystemConfig,
} from '@chakra-ui/react'
import { CUSTOM_THEME_KEY } from './types'

export const defaultCustomConfig: SystemConfig = {
  globalCss: {
    ':root': {
      fontFamily: 'Inter, Avenir, Helvetica, Arial, sans-serif',
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: '400',
      color: '#0f0f0f',
      backgroundColor: 'firstBg',
      fontSynthesis: 'none',
      textRendering: 'optimizeLegibility',
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          // @ts-expect-error number key
          50: '#faf5ff',
          // @ts-expect-error number key
          100: '#f3e8ff',
          // @ts-expect-error number key
          200: '#e9d5ff',
          // @ts-expect-error number key
          300: '#d8b4fe',
          // @ts-expect-error number key
          400: '#c084fc',
          // @ts-expect-error number key
          500: '#a855f7',
          // @ts-expect-error number key
          600: '#9333ea', // Primary Purple
          // @ts-expect-error number key
          700: '#7e22ce',
          // @ts-expect-error number key
          800: '#6b21a8',
          // @ts-expect-error number key
          900: '#581c87',
        },
        firstBg: {
          value: '#f6f6f6',
        },
        secondBg: {
          value: '#ffffff',
        },
        buttonBg: {
          value: 'black',
        },
        buttonSelectedBg: {
          value: 'var(--chakra-colors-brand-300)',
        },
        collectionNavHoverBg: {
          value:
            'linear-gradient(to right, #FFFFFF, var(--chakra-colors-brand-500))',
        },
        sidebar: {
          value: '#18181b',
        },
        sidebarHover: {
          value: '#27272a',
        },
        sidebarActive: {
          value: 'rgba(147,51,234,0.18)',
        },
        sidebarText: {
          value: '#71717a',
        },
        sidebarActiveText: {
          value: '#c084fc',
        },
      },
    },
    recipes: {
      buttons: {
        base: {
          bg: 'brand.500',
          color: 'white',
          cursor: 'pointer',
          _hover: {
            bg: 'brand.300',
            transition: 'background-color 0.2s ease-in-out',
          },
        },
        variants: {
          visual: {
            critical: {
              bg: 'red.500',
              _hover: {
                bg: 'red.300',
              },
            },
          },
        },
      },
      layoutNavs: {
        base: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          padding: '10px 6px',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '52px',
          color: 'sidebarText',
          userSelect: 'none',
          transition: 'background 0.15s, color 0.15s',
          _hover: {
            bg: 'sidebarHover',
            color: 'white',
          },
        },
        variants: {
          navActive: {
            true: {
              bg: 'sidebarActive',
              color: 'sidebarActiveText',
              _hover: {
                bg: 'sidebarActive',
                color: 'sidebarActiveText',
              },
            },
          },
        },
      },
      layoutCollectionNavs: {
        base: {
          _hover: {
            background: 'var(--chakra-colors-collection-nav-hover-bg)', // TODO: token this style
          },
        },
      },
    },
  },
}

let themeConfig: SystemConfig = {}
try {
  themeConfig = JSON.parse(localStorage.getItem(CUSTOM_THEME_KEY) ?? '{}')
} catch (e) {
  console.error('[ChromaMind] Corrupted custom theme in localStorage, falling back to default.', e)
  localStorage.removeItem(CUSTOM_THEME_KEY)
}
const customConfig = defineConfig({ ...defaultCustomConfig, ...themeConfig })

export const system = createSystem(defaultConfig, customConfig)
