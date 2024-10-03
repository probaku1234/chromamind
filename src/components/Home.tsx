import React, { useState, useEffect } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { invoke } from '@tauri-apps/api/core'
import { Skeleton } from '@chakra-ui/react'

const Home: React.FC = () => {
  const [chromaVersion, setChromaVersion] = useState<string | null>(null)

  useEffect(() => {
    async function fetchChromaVersion() {
      try {
        const version: string = await invoke('get_chroma_version')
        setChromaVersion(version)
      } catch (error) {
        console.error(error)
      }
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
