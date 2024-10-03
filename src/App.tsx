import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { invoke } from '@tauri-apps/api/core'
import { CheckCircleIcon } from '@chakra-ui/icons'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './App.css'

const App: React.FC = () => {
  const [greetMsg, setGreetMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)
  const tenantRef = useRef<HTMLInputElement>(null)
  const dbRef = useRef<HTMLInputElement>(null)

  async function greet() {
    setLoading(true)
    setSuccess(false)

    const args = {
      url: urlRef.current?.value || 'http://localhost:8000',
      tenant: tenantRef.current?.value || 'default_tenant',
      db: dbRef.current?.value || 'default_database',
    }
    console.debug('args', args)
    await invoke('create_client', args)

    setGreetMsg(await invoke('health_check'))
    setLoading(false)
    setSuccess(true)

    setTimeout(() => {
      invoke('create_window')
      const currentWindow = getCurrentWindow()
      currentWindow.close()
    }, 2000) // Delay to show the check icon before navigating
  }

  return (
    <Container maxW="container.md" centerContent height={'100vh'}>
      <Heading as="h1" my={4}>
        Connect to your Chroma
      </Heading>

      <Text my={4}>
        Type the url of your chroma
      </Text>

      <Box
        as="form"
        onSubmit={(e: { preventDefault: () => void }) => {
          e.preventDefault()
          greet()
        }}
        my={4}
      >
        <FormControl id="name" mb={4}>
          <FormLabel>URL</FormLabel>
          <Input type="text" ref={urlRef} required />
          <FormLabel>Tenant</FormLabel>
          <Input type="text" ref={tenantRef} placeholder="default_tenant" />
          <FormLabel>Database</FormLabel>
          <Input type="text" ref={dbRef} placeholder="default_database" />
        </FormControl>
        <Button type="submit" colorScheme="teal" disabled={loading} isLoading={loading}>
          Connect
        </Button>
      </Box>

      {loading && <Spinner size="xl" mt={4} />}

      {success && (
        <Icon as={CheckCircleIcon} w={16} h={16} color="green.500" mt={4} />
      )}

      {greetMsg && <Text mt={4}>{greetMsg}</Text>}
    </Container>
  )
}

export default App
