import { Badge, Box, Flex, Input, Spinner, Text, useRecipe } from '@chakra-ui/react'
import { Button } from '@/components/ui/button'
import React from 'react'
import { FiCheck, FiClipboard, FiCopy, FiStar } from 'react-icons/fi'

// ── Section wrapper ───────────────────────────────────────────────────────
const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box mb={3}>
    <Text
      fontSize="10px"
      fontWeight="600"
      color="gray.400"
      textTransform="uppercase"
      letterSpacing="wide"
      mb="6px"
    >
      {label}
    </Text>
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      px={3}
      py="10px"
    >
      {children}
    </Box>
  </Box>
)

// ── Embedding chip ────────────────────────────────────────────────────────
const Chip = ({ v }: { v: string }) => (
  <Box
    as="span"
    bg="brand.50"
    color="brand.700"
    px="7px"
    py="2px"
    borderRadius="5px"
    fontSize="11px"
    fontFamily="'JetBrains Mono', monospace"
  >
    {v}
  </Box>
)

// ── Brand swatch ──────────────────────────────────────────────────────────
const Swatch = ({ token, label }: { token: string; label: string }) => (
  <Flex align="center" gap={2} mb="3px">
    <Box w="28px" h="16px" borderRadius="4px" bg={token} flexShrink={0} borderWidth="1px" borderColor="gray.100" />
    <Text fontSize="10px" color="gray.500" fontFamily="'JetBrains Mono', monospace">{label}</Text>
  </Flex>
)

// ── Preview ───────────────────────────────────────────────────────────────
const Preview: React.FC = () => {
  const layoutCollectionNavRecipe = useRecipe({ key: 'layoutCollectionNavs' })
  const layoutCollectionNavStyles = layoutCollectionNavRecipe()

  return (
    <Box bg="gray.50" h="100%" id="root" p={4} overflowY="auto">
      <Text
        fontSize="10px"
        fontWeight="700"
        color="gray.400"
        textTransform="uppercase"
        letterSpacing="widest"
        mb={4}
      >
        Preview
      </Text>

      {/* Buttons */}
      <Section label="Buttons">
        <Flex gap={2} flexWrap="wrap">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="outline">Outline</Button>
          <Button size="sm" buttonType="critical">Delete</Button>
        </Flex>
      </Section>

      {/* Badges */}
      <Section label="Badges">
        <Flex gap="6px" flexWrap="wrap">
          <Badge colorPalette="green" fontSize="12px" borderRadius="md" px={2} py="2px" display="flex" alignItems="center" gap={1}>
            <FiCopy size={10} /> collection id
          </Badge>
          <Badge colorPalette="blue" fontSize="12px" borderRadius="md" px={2} py="2px">
            embeddings: 300
          </Badge>
          <Badge colorPalette="purple" fontSize="12px" borderRadius="md" px={2} py="2px">
            dims: 3072
          </Badge>
        </Flex>
      </Section>

      {/* Input */}
      <Section label="Input">
        <Input
          placeholder="Filter collections..."
          size="sm"
          borderRadius="8px"
          height="2rem"
          px="0.4rem"
        />
      </Section>

      {/* Nav item */}
      <Section label="Nav item">
        <Box css={layoutCollectionNavStyles}>
          <Flex
            align="center"
            px={3}
            py="9px"
            borderRadius="md"
            bg="brand.50"
            borderLeft="3px solid var(--chakra-colors-brand-600)"
            gap={2}
          >
            <FiStar size={13} color="var(--chakra-colors-yellow-500)" />
            <Text fontSize="12px" fontWeight="500" color="brand.800" flex={1}>Collections</Text>
            <FiCheck size={12} color="var(--chakra-colors-green-500)" />
          </Flex>
        </Box>
      </Section>

      {/* Embedding chips */}
      <Section label="Embedding vector">
        <Flex flexWrap="wrap" gap="5px">
          {['-0.07', '-0.03', '0.04', '0.01', '-0.02', '0.06', '-0.05', '0.02', '0.01', '-0.01', '0.03', '0.00'].map((v, i) => (
            <Chip key={i} v={v} />
          ))}
          <Text fontSize="11px" color="gray.400" alignSelf="center">+3060 more (3072 dims)</Text>
        </Flex>
      </Section>

      {/* Table rows */}
      <Section label="Table rows">
        <Box borderWidth="1px" borderColor="gray.100" borderRadius="md" overflow="hidden">
          {/* Header */}
          <Flex bg="secondBg" px={3} py="6px" borderBottom="2px solid" borderColor="gray.200" gap={4}>
            {['id', 'document', 'embedding', 'metadata'].map((h) => (
              <Text key={h} fontSize="12px" fontWeight="600" color="gray.900" flex={1}>{h}</Text>
            ))}
          </Flex>
          {/* Normal row */}
          <Flex px={3} py="8px" bg="secondBg" borderBottom="1px solid" borderColor="gray.100" gap={4} borderLeft="3px solid transparent">
            {['9b76ee44…', 'The quick brown fox…', '[-0.07, -0.03…]', '{"type": "doc"}'].map((v, i) => (
              <Text key={i} fontSize="11px" color="gray.700" flex={1} fontFamily={i === 0 || i === 2 ? "'JetBrains Mono', monospace" : undefined}>{v}</Text>
            ))}
          </Flex>
          {/* Selected row */}
          <Flex px={3} py="8px" bg="brand.50" gap={4} borderLeft="3px solid var(--chakra-colors-brand-600)">
            {['a1c3f820…', 'ChromaDB is a vector…', '[ 0.02, -0.01…]', '{"type": "query"}'].map((v, i) => (
              <Text key={i} fontSize="11px" color="brand.800" flex={1} fontFamily={i === 0 || i === 2 ? "'JetBrains Mono', monospace" : undefined}>{v}</Text>
            ))}
          </Flex>
        </Box>
      </Section>

      {/* Detail sidebar footer */}
      <Section label="Detail sidebar actions">
        <Flex gap={2}>
          <Button variant="outline" size="sm" flex={1} justifyContent="center">
            <FiClipboard /> Copy ID
          </Button>
          <Button variant="ghost" size="sm" flex={1} justifyContent="center">
            <FiCopy /> Copy JSON
          </Button>
        </Flex>
      </Section>

      {/* Loading */}
      <Section label="Loading state">
        <Flex align="center" gap={3}>
          <Spinner size="sm" color="brand.500" />
          <Text fontSize="13px" color="gray.500">Fetching Embeddings</Text>
        </Flex>
      </Section>

      {/* Error state mini */}
      <Section label="Error state">
        <Flex direction="column" align="center" py={3} gap={2}>
          <Box bg="red.100" borderRadius="xl" p="10px" color="red.500">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </Box>
          <Text fontSize="13px" fontWeight="700" color="gray.900">Failed to load embeddings</Text>
          <Text fontSize="11px" color="gray.400" textAlign="center">Could not connect to ChromaDB at localhost:8000</Text>
          <Button size="xs" variant="outline">↺ Retry</Button>
        </Flex>
      </Section>

      {/* Color palette */}
      <Section label="Brand color palette">
        <Flex gap={3}>
          <Box flex={1}>
            {['brand.50', 'brand.100', 'brand.200', 'brand.300', 'brand.400'].map((t) => (
              <Swatch key={t} token={t} label={t} />
            ))}
          </Box>
          <Box flex={1}>
            {['brand.500', 'brand.600', 'brand.700', 'brand.800', 'brand.900'].map((t) => (
              <Swatch key={t} token={t} label={t} />
            ))}
          </Box>
        </Flex>
        <Flex gap={2} mt={2}>
          <Flex flex={1} h="28px" bg="firstBg" borderRadius="md" borderWidth="1px" borderColor="gray.200" align="center" justify="center">
            <Text fontSize="10px" color="gray.500">firstBg</Text>
          </Flex>
          <Flex flex={1} h="28px" bg="secondBg" borderRadius="md" borderWidth="1px" borderColor="gray.200" align="center" justify="center">
            <Text fontSize="10px" color="gray.500">secondBg</Text>
          </Flex>
        </Flex>
      </Section>
    </Box>
  )
}

export default Preview
