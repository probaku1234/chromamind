import {
  createSystem,
  defaultConfig,
  defineConfig,
  mergeConfigs,
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
          50: { value: '#faf5ff' },
          100: { value: '#f3e8ff' },
          200: { value: '#e9d5ff' },
          300: { value: '#d8b4fe' },
          400: { value: '#c084fc' },
          500: { value: '#a855f7' },
          600: { value: '#9333ea' }, // Primary Purple
          700: { value: '#7e22ce' },
          800: { value: '#6b21a8' },
          900: { value: '#581c87' },
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
          value: '{colors.brand.300}',
        },
        collectionNavHoverBg: {
          value: 'linear-gradient(to right, #FFFFFF, {colors.brand.500})',
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
    // Required for `colorPalette="brand"` to resolve. Chakra maps every
    // `colorPalette` consumer (Button, Badge, …) onto these seven roles.
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: '{colors.brand.500}' },
          contrast: { value: '{colors.brand.50}' },
          fg: { value: '{colors.brand.700}' },
          muted: { value: '{colors.brand.100}' },
          subtle: { value: '{colors.brand.50}' },
          emphasized: { value: '{colors.brand.300}' },
          focusRing: { value: '{colors.brand.500}' },
        },
      },
    },
    recipes: {
      // Extends Chakra's built-in button recipe rather than overlaying a
      // separate one, so `variant`/`size` keep working.
      button: {
        base: {
          colorPalette: 'brand',
          cursor: 'pointer',
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
            background: 'collectionNavHoverBg',
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
  console.error(
    '[ChromaMind] Corrupted custom theme in localStorage, falling back to default.',
    e,
  )
  localStorage.removeItem(CUSTOM_THEME_KEY)
}
// Deep merge — a spread would let a custom theme that only sets `theme.tokens`
// replace the whole `theme` key, dropping every recipe and brand token with it.
const customConfig = defineConfig(
  mergeConfigs(defaultCustomConfig, themeConfig),
)

export const system = createSystem(defaultConfig, customConfig)
