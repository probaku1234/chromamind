import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const customConfig = defineConfig({
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
          50: '#F0FDFA',
          // @ts-expect-error number key
          100: '#CCFBF1',
          // @ts-expect-error number key
          200: '#99F6E4',
          // @ts-expect-error number key
          300: '#5EEAD4',
          // @ts-expect-error number key
          400: '#2DD4BF',
          // @ts-expect-error number key
          500: '#14B8A6', // Primary Teal
          // @ts-expect-error number key
          600: '#0D9488',
          // @ts-expect-error number key
          700: '#0F766E',
          // @ts-expect-error number key
          800: '#115E59',
          // @ts-expect-error number key
          900: '#134E4A',
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
          _hover: {
            bg: 'gray.200',
          },
        },
      },
      layoutCollectionNavs: {
        base: {
          _hover: {
            background:
              'linear-gradient(to right, #FFFFFF, var(--chakra-colors-brand-500))',
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
