import React, { useEffect, useState } from 'react'
import { Box, Flex, Grid, Text } from '@chakra-ui/react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from '../types.ts'
import { match } from 'ts-pattern'

const DatabaseIcon = () => (
  <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const XIcon = () => (
  <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
)

interface StatCardProps {
  label: string
  value: React.ReactNode
}

const StatCard = ({ label, value }: StatCardProps) => (
  <Box bg="secondBg" borderWidth="1px" borderColor="border" borderRadius="xl" px={6} py={5}>
    <Text fontSize="xs" color="gray.400" fontWeight="500" mb={1}>{label}</Text>
    <Box fontSize="4xl" fontWeight="700" color="gray.950" letterSpacing="tight" lineHeight="1.2">
      {value}
    </Box>
  </Box>
)

const Home: React.FC = () => {
  const [chromaVersion, setChromaVersion] = useState<string | null>(null)
  const [collectionsCount, setCollectionsCount] = useState<number | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)

  const url = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`) || ''
  const tenant = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`) || ''
  const database = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`) || ''

  useEffect(() => {
    async function fetchChromaVersion() {
      const result = await invokeWrapper<string>(TauriCommand.GET_CHROMA_VERSION)
      match(result)
        .with({ type: 'error' }, ({ error }) => { console.error(error) })
        .with({ type: 'success' }, ({ result }) => { setChromaVersion(result) })
        .exhaustive()
    }

    async function fetchCollections() {
      const result = await invokeWrapper<{ id: string; name: string }[]>(TauriCommand.FETCH_COLLECTIONS)
      match(result)
        .with({ type: 'error' }, ({ error }) => { console.error(error) })
        .with({ type: 'success' }, ({ result }) => { setCollectionsCount(result.length) })
        .exhaustive()
    }

    Promise.all([fetchChromaVersion(), fetchCollections()])
  }, [])

  const testConnection = async () => {
    setTestingConnection(true)
    const result = await invokeWrapper<boolean>(TauriCommand.HEALTH_CHECK)
    match(result)
      .with({ type: 'error' }, ({ error }) => { console.error(error); setIsSuccess(false) })
      .with({ type: 'success' }, ({ result }) => { console.log(result); setIsSuccess(true) })
      .exhaustive()
    setTestingConnection(false)
  }

  const refresh = () => {
    setChromaVersion(null)
    setCollectionsCount(null)
    setIsSuccess(null)

    async function fetchChromaVersion() {
      const result = await invokeWrapper<string>(TauriCommand.GET_CHROMA_VERSION)
      match(result)
        .with({ type: 'error' }, ({ error }) => { console.error(error) })
        .with({ type: 'success' }, ({ result }) => { setChromaVersion(result) })
        .exhaustive()
    }

    async function fetchCollections() {
      const result = await invokeWrapper<{ id: string; name: string }[]>(TauriCommand.FETCH_COLLECTIONS)
      match(result)
        .with({ type: 'error' }, ({ error }) => { console.error(error) })
        .with({ type: 'success' }, ({ result }) => { setCollectionsCount(result.length) })
        .exhaustive()
    }

    Promise.all([fetchChromaVersion(), fetchCollections()])
  }

  return (
    <Box p={7} overflowY="auto" h="100%" bg="firstBg">
      {/* Connection info card */}
      <Box bg="secondBg" borderWidth="1px" borderColor="border" borderRadius="xl" px={6} py={5} mb={4}>
        <Flex align="center" gap={3} mb={2}>
          <Box color="brand.600"><DatabaseIcon /></Box>
          <Text fontSize="15px" fontWeight="600" color="gray.950">{url}</Text>
        </Flex>
        {tenant && <Text fontSize="sm" color="gray.500" mb={1}>{tenant}</Text>}
        {database && <Text fontSize="sm" color="gray.500">{database}</Text>}
      </Box>

      {/* Stats grid */}
      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={4}>
        <StatCard
          label="Collections"
          value={collectionsCount !== null ? collectionsCount : <Skeleton height="40px" width="60px" />}
        />
        <StatCard
          label="Version"
          value={chromaVersion !== null ? chromaVersion : <Skeleton height="40px" width="60px" />}
        />

        {/* Connection test card */}
        <Box bg="secondBg" borderWidth="1px" borderColor="border" borderRadius="xl" px={6} py={5} display="flex" flexDirection="column" justifyContent="space-between">
          <Text fontSize="xs" color="gray.400" fontWeight="500" mb={3}>Connection</Text>
          <Flex align="center" gap={2}>
            <Button
              size="sm"
              onClick={testConnection}
              disabled={testingConnection}
              title={isSuccess === true ? 'success' : isSuccess === false ? 'fail' : undefined}
            >
              {testingConnection ? 'Testing…' : 'Test Connection'}
            </Button>
            {isSuccess === true && <Box color="green.500"><CheckCircleIcon /></Box>}
            {isSuccess === false && <Box color="red.500"><XIcon /></Box>}
          </Flex>
        </Box>
      </Grid>

      {/* Quick actions card */}
      <Box bg="secondBg" borderWidth="1px" borderColor="border" borderRadius="xl" px={5} py={4}>
        <Text fontSize="13px" fontWeight="600" color="gray.950" mb={3}>Quick Actions</Text>
        <Flex gap={2}>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshIcon /> Refresh
          </Button>
        </Flex>
      </Box>
    </Box>
  )
}

export default Home
