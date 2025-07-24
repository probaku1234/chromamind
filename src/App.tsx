import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Icon,
  Input,
  Spinner,
  Text,
  Image,
  Fieldset,
  Stack,
} from '@chakra-ui/react'
import { PasswordInput } from '@/components/ui/password-input'
import { HStack } from '@chakra-ui/react'
import { Radio, RadioGroup } from '@/components/ui/radio'
import { CheckCircleIcon, CloseIcon } from '@chakra-ui/icons'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from './types'
import { invokeWrapper } from './utils/invokeTauri'
import './App.css'
import { match } from 'ts-pattern'
import { Field } from '@/components/ui/field'
import { Button } from './components/ui/button'

const authBoxStyle: React.CSSProperties = {
  border: '1px solid #8080805e',
  borderRadius: '10px',
  marginTop: 'var(--chakra-spacing-1)',
  padding: 'var(--chakra-spacing-4)',
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>()
  const [authMethod, setAuthMethod] = useState<string>('no_auth')
  const [tokenType, setTokenType] = useState<string>('bearer')
  const urlRef = useRef<HTMLInputElement>(null)
  const tenantRef = useRef<HTMLInputElement>(null)
  const dbRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const tokenRef = useRef<HTMLInputElement>(null)

  async function greet() {
    setLoading(true)
    setSuccess(false)

    const url = urlRef.current?.value || 'http://localhost:8000'
    const tenant = tenantRef.current?.value || 'default_tenant'
    const database = dbRef.current?.value || 'default_database'
    const username = usernameRef.current?.value
    const password = passwordRef.current?.value
    const token = tokenRef.current?.value
    const authConfig = {
      authMethod,
      username,
      password,
      token,
      tokenType,
    }

    match(
      await invokeWrapper(TauriCommand.CREATE_CLIENT, {
        url,
        authConfig,
      }),
    ).with({ type: 'error' }, ({ error }) => {
      console.error(error)
    })

    match(await invokeWrapper(TauriCommand.HEALTH_CHECK)).with(
      { type: 'error' },
      ({ error }) => {
        console.error(error)
        setError(error)
        setLoading(false)
        return
      },
    )

    const result = await invokeWrapper<boolean>(
      TauriCommand.CHECK_TENANT_AND_DATABASE,
      {
        tenant,
        database,
      },
    )

    const is_success = match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        setError(error)
        setLoading(false)
        return false
      })
      .with({ type: 'success' }, ({ result }) => {
        if (!result) {
          console.error(`${tenant} ${database} not found`)
          setError(`${tenant} ${database} not found`)
          setLoading(false)
          return false
        }
      })
      .exhaustive()

    if (is_success == false) {
      return
    }

    setLoading(false)
    setError(null)
    setSuccess(true)

    setTimeout(() => {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`, url)
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`, tenant)
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`, database)
      invokeWrapper(TauriCommand.CREATE_WINDOW, {
        url,
      })
    }, 2000) // Delay to show the check icon before navigating
  }

  useEffect(() => {
    const currentWindow = getCurrentWindow()

    currentWindow.listen('tauri://window-created', () => {
      currentWindow.close()
    })
  }, [])

  return (
    <Container maxW="container.md" centerContent height={'100vh'}>
      <Heading as="h1" my={4} size={'4xl'}>
        Connect to ChromaDB
      </Heading>
      <Image src={'chroma-seeklogo.svg'} height={'1/4'} />

      <Box
        as="form"
        onSubmit={(e: { preventDefault: () => void }) => {
          e.preventDefault()
          greet()
        }}
        my={4}
        aria-label="form"
      >
        <Field label="URL" required mb={2}>
          <Input
            type="text"
            ref={urlRef}
            data-testid="url-input"
            placeholder="http://localhost:8000"
          />
        </Field>
        <Field label="Tenant" mb={2}>
          <Input type="text" ref={tenantRef} placeholder="default_tenant" />
        </Field>
        <Field label="Database" mb={2}>
          <Input type="text" ref={dbRef} placeholder="default_database" />
        </Field>
        <RadioGroup
          defaultValue="no_auth"
          onValueChange={(e) => setAuthMethod(e.value ?? 'no_auth')}
        >
          <HStack gap="3">
            <Radio value="no_auth">No Auth</Radio>
            <Radio value="basic_auth">Basic Auth</Radio>
            <Radio value="token_auth">Token Auth</Radio>
          </HStack>
        </RadioGroup>
        {match(authMethod)
          .with('basic_auth', () => (
            <Fieldset.Root maxW="sm" style={authBoxStyle}>
              <Stack>
                <Fieldset.Legend>Auth Details</Fieldset.Legend>
                <Fieldset.HelperText>
                  Please provide your auth details below.
                </Fieldset.HelperText>
                <Fieldset.Content>
                  <Field label="Username" required>
                    <Input name="username" ref={usernameRef} />
                  </Field>
                  <Field label="Password" required>
                    <PasswordInput ref={passwordRef} />
                  </Field>
                </Fieldset.Content>
              </Stack>
            </Fieldset.Root>
          ))
          .with('token_auth', () => (
            <Fieldset.Root style={authBoxStyle}>
              <RadioGroup
                defaultValue="bearer"
                onValueChange={(details) =>
                  setTokenType(details.value ?? 'bearer')
                }
              >
                <HStack gap="3">
                  <Radio value="bearer">Bearer Token</Radio>
                  <Radio value="x_chroma_token">X-Chroma-Token</Radio>
                </HStack>
              </RadioGroup>
              <Field label="Token" required>
                <PasswordInput name="token" ref={tokenRef} />
              </Field>
            </Fieldset.Root>
          ))
          .with('no_auth', () => <></>)
          .otherwise(() => (
            <></>
          ))}
        <Button
          type="submit"
          // colorScheme="teal"
          disabled={loading}
          loading={loading}
          mt={4}
          // bg={'brand.400'}
          // colorPalette={'bg'}
        >
          Connect
        </Button>
      </Box>

      {loading && <Spinner size="xl" mt={4} />}

      {success && (
        <Icon w={16} h={16} color="green.500" mt={4}>
          <CheckCircleIcon />
        </Icon>
      )}
      {error && (
        <Box mt={4} textAlign={'center'}>
          <Icon w={16} h={16} color="red.500">
            <CloseIcon />
          </Icon>
          <Text color={'red.500'} mt={2}>
            {error}
          </Text>
        </Box>
      )}
    </Container>
  )
}

export default App
