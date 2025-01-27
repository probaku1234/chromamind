import { Box, Flex, useRecipe, Heading, Tabs } from '@chakra-ui/react'
import { Button } from '@/components/ui/button'
import React from 'react'
import { LOCAL_STORAGE_KEY_PREFIX } from '@/types'

const TAB_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-preview-tab`

const Preview: React.FC = () => {
  const layoutNavRecipe = useRecipe({ key: 'layoutNavs' })
  const layoutLavButtonStyles = layoutNavRecipe()

  const layoutCollectionNavRecipe = useRecipe({ key: 'layoutCollectionNavs' })
  const layoutCollectionNavStyles = layoutCollectionNavRecipe()

  const compStyle = window.getComputedStyle(document.getElementById('root')!)
  const fontFamily = compStyle.getPropertyValue('font-family')
  const fontSize = compStyle.getPropertyValue('font-size')
  const lineHeight = compStyle.getPropertyValue('line-height')
  const fontWeight = compStyle.getPropertyValue('font-weight')

  const brandColorBoxStyle: React.CSSProperties = {
    marginTop: 'var(--chakra-spacing-1)',
    marginBottom: 'var(--chakra-spacing-1)',
  }

  return (
    <Box bg={'white'} h={'100%'} id="root" p={4}>
      <Tabs.Root
        defaultValue={localStorage.getItem(TAB_KEY) || 'style'}
        onValueChange={({ value }) => localStorage.setItem(TAB_KEY, value)}
      >
        <Tabs.List>
          <Tabs.Trigger value="style">style</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="style">
          <Box mb={1}>
            <Heading>Font</Heading>
            <Box>
              <p>font family: {fontFamily}</p>
              <p>font size: {fontSize}</p>
              <p>line height: {lineHeight}</p>
              <p>font weight: {fontWeight}</p>
            </Box>
          </Box>
          <Box mb={1}>
            <Heading>Color</Heading>
            <Box bg="brand.50" borderRadius="md" style={brandColorBoxStyle}>
              brand.50
            </Box>
            <Box bg="brand.100" borderRadius="md" style={brandColorBoxStyle}>
              brand.100
            </Box>
            <Box bg="brand.200" borderRadius="md" style={brandColorBoxStyle}>
              brand.200
            </Box>
            <Box bg="brand.300" borderRadius="md" style={brandColorBoxStyle}>
              brand.300
            </Box>
            <Box bg="brand.400" borderRadius="md" style={brandColorBoxStyle}>
              brand.400
            </Box>
            <Box bg="brand.500" borderRadius="md" style={brandColorBoxStyle}>
              brand.500
            </Box>
            <Box bg="brand.600" borderRadius="md" style={brandColorBoxStyle}>
              brand.600
            </Box>
            <Box bg="brand.700" borderRadius="md" style={brandColorBoxStyle}>
              brand.700
            </Box>
            <Box bg="brand.800" borderRadius="md" style={brandColorBoxStyle}>
              brand.800
            </Box>
            <Box bg="brand.900" borderRadius="md" style={brandColorBoxStyle}>
              brand.900
            </Box>
            <Flex gap={1}>
              <Box
                w="50%"
                h="40px"
                bg={'firstBg'}
                borderRadius="md"
                border={'1px solid black'}
                display={'flex'}
                justifyContent={'center'}
                alignItems={'center'}
              >
                firstBg
              </Box>
              <Box
                w="50%"
                h="40px"
                bg={'secondBg'}
                borderRadius="md"
                border={'1px solid black'}
                display={'flex'}
                justifyContent={'center'}
                alignItems={'center'}
              >
                secondBg
              </Box>
            </Flex>
          </Box>
          <Box>
            <Heading>Recipes styles</Heading>
            <Box gap={1} display="flex" mb={1}>
              <Button>general</Button>
              <Button buttonType="critical">critical</Button>
            </Box>

            <Box css={layoutLavButtonStyles}>layoutNavs</Box>
            <Box css={layoutCollectionNavStyles}>layoutCollectionNavs</Box>
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

export default Preview
