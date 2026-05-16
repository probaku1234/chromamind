// @ts-expect-error react is not used in this file
import React from 'react'
import { Box, Flex, Spinner, Text } from '@chakra-ui/react'
import { Button } from '@/components/ui/button'

const DatabaseIcon = () => (
  <svg width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
)

const XIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const RetryIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
  </svg>
)

export const NoDataDisplay = () => (
  <Flex direction="column" align="center" justify="center" bg="secondBg" h="100%">
    <Box color="gray.300" mb={3}><DatabaseIcon /></Box>
    <Text fontSize="lg" fontWeight="600" color="gray.500" mb={1}>Collection is empty</Text>
    <Text fontSize="sm" color="gray.400">No embeddings have been added yet.</Text>
  </Flex>
)

export const LoadingDataDisplay = () => (
  <Flex direction="column" align="center" justify="center" bg="secondBg" h="100%">
    <Spinner size="xl" color="brand.500" mb={3} />
    <Text color="gray.500">Fetching Embeddings</Text>
  </Flex>
)

export const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Flex direction="column" align="center" justify="center" bg="secondBg" h="100%">
    <Box bg="red.100" borderRadius="xl" p={3} mb={4} color="red.500"><XIcon /></Box>
    <Text fontSize="md" fontWeight="700" color="gray.900" mb="6px">Failed to load embeddings</Text>
    <Text fontSize="13px" color="gray.400" textAlign="center" maxW="260px" lineHeight="1.6" mb={4}>
      {message}
    </Text>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry} gap="6px">
        <RetryIcon /> Retry
      </Button>
    )}
  </Flex>
)
