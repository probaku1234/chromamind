import React, { useState, useRef, useEffect } from 'react'
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
import { CheckCircleIcon, CloseIcon } from '@chakra-ui/icons'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { TauriCommand } from './types'
import { invokeWrapper } from './utils/invokeTauri'
import './App.css'

const App: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>('asdf')
  const urlRef = useRef<HTMLInputElement>(null)
  const tenantRef = useRef<HTMLInputElement>(null)
  const dbRef = useRef<HTMLInputElement>(null)

  async function greet() {
    setLoading(true)
    setSuccess(false)

    const url = urlRef.current?.value || 'http://localhost:8000'
    const tenant = tenantRef.current?.value || 'default_tenant'
    const database = dbRef.current?.value || 'default_database'

    await invokeWrapper(TauriCommand.CREATE_CLIENT, {
      url,
    })

    // error handling
    let [result, error] = await invokeWrapper(TauriCommand.HEALTH_CHECK)
    if (error) {
      console.error(error)
      setError(error)
      return
    }

    ;[result, error] = await invokeWrapper(
      TauriCommand.CHECK_TENANT_AND_DATABASE,
      {
        tenant,
        database,
      },
    )
    if (error) {
      console.error(error)
      setError(error)
      setLoading(true)
      return
    }
    if (!result) {
      console.error(`${tenant} ${database} not found`)
      setError(`${tenant} ${database} not found`)
      setLoading(true)
      return
    }

    setLoading(false)
    setError(null)
    setSuccess(true)

    setTimeout(() => {
      invokeWrapper(TauriCommand.CREATE_WINDOW, {
        url,
      })
    }, 2000) // Delay to show the check icon before navigating
  }

  useEffect(() => {
    const currentWindow = getCurrentWindow()

    currentWindow.listen("tauri://window-created", (event) => {
      currentWindow.close()
    })
  }, [])

  return (
    <Container maxW="container.md" centerContent height={'100vh'}>
      <Heading as="h1" my={4}>
        Connect to your Chroma
      </Heading>

      <Text my={4}>Type the url of your chroma</Text>

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
        <Button
          type="submit"
          colorScheme="teal"
          disabled={loading}
          isLoading={loading}
        >
          Connect
        </Button>
      </Box>

      {loading && <Spinner size="xl" mt={4} />}

      {success && (
        <Icon as={CheckCircleIcon} w={16} h={16} color="green.500" mt={4} />
      )}
      {error && (
        <Box mt={4} textAlign={'center'}>
          <Icon as={CloseIcon} w={16} h={16} color="red.500" />
          <Text textColor={'red.500'} mt={2}>
            {error}
          </Text>
        </Box>
      )}
    </Container>
  )
}

export default App
