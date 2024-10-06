import React, { useEffect, useState } from 'react'
import { Box, Skeleton, Text } from '@chakra-ui/react'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { TauriCommand } from '../types.ts'
import { match } from 'ts-pattern'

const Home: React.FC = () => {
  const [chromaVersion, setChromaVersion] = useState<string | null>(null)

  useEffect(() => {
    async function fetchChromaVersion() {
      const result = await invokeWrapper<string>(TauriCommand.GET_CHROMA_VERSION)
      match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
          return
        })
        .with({ type: 'success' }, ({ result }) => {
          setChromaVersion(result)
        })
        .exhaustive()
    }

    fetchChromaVersion()
  }, [])

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      textAlign="center"
    >
      {chromaVersion ? (
        <Text fontSize="lg" color="gray.500">
          Chroma Version: {chromaVersion}
        </Text>
      ) : (
        <Skeleton height="20px" width="200px" />
      )}
    </Box>
  )
}

export default Home
