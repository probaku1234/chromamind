import React, { useEffect, useRef, useState } from 'react'
import { Box, Center, Flex, Image, Input, Text } from '@chakra-ui/react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from './types'
import { invokeWrapper } from './utils/invokeTauri'
import { match } from 'ts-pattern'
import { Field } from '@/components/ui/field'
import { Button } from './components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'

const CheckCircle = () => (
  <svg width={48} height={48} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const App: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>()
  const [mode, setMode] = useState<'local' | 'cloud'>('local')
  const urlRef = useRef<HTMLInputElement>(null)
  const tenantRef = useRef<HTMLInputElement>(null)
  const dbRef = useRef<HTMLInputElement>(null)
  const apiKeyRef = useRef<HTMLInputElement>(null)

  async function connect() {
    setLoading(true)
    setSuccess(false)
    setError(null)

    const url = urlRef.current?.value || (mode === 'local' ? 'http://localhost:8000' : 'https://api.trychroma.com')
    const database = dbRef.current?.value || 'default_database'

    const config =
      mode === 'local'
        ? {
            mode: 'local' as const,
            url,
            tenant: tenantRef.current?.value || 'default_tenant',
            database,
          }
        : {
            mode: 'cloud' as const,
            url,
            apiKey: apiKeyRef.current?.value ?? '',
            database,
          }

    match(
      await invokeWrapper(TauriCommand.CREATE_CLIENT, { config }),
    ).with({ type: 'error' }, ({ error }) => {
      console.error(error)
    })

    const healthOk = match(await invokeWrapper(TauriCommand.HEALTH_CHECK))
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        setError(error)
        setLoading(false)
        return false
      })
      .with({ type: 'success' }, () => true)
      .exhaustive()

    if (!healthOk) {
      return
    }

    if (mode === 'local') {
      const result = await invokeWrapper<boolean>(
        TauriCommand.CHECK_TENANT_AND_DATABASE,
        { database },
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
            console.error(`database ${database} not found`)
            setError(`database ${database} not found`)
            setLoading(false)
            return false
          }
        })
        .exhaustive()

      if (is_success == false) {
        return
      }
    }

    setLoading(false)
    setError(null)
    setSuccess(true)

    setTimeout(() => {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`, url)
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`, database)
      if (mode === 'local' && config.mode === 'local') {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`, config.tenant)
      }
      invokeWrapper(TauriCommand.CREATE_WINDOW, { url })
    }, 2000)
  }

  useEffect(() => {
    const currentWindow = getCurrentWindow()
    currentWindow.listen('tauri://window-created', () => {
      currentWindow.close()
    })
  }, [])

  return (
    <Center h="100vh" bg="firstBg">
      <Box
        w="400px"
        bg="secondBg"
        borderRadius="2xl"
        px={9}
        py={10}
        borderWidth="1px"
        borderColor="border"
        boxShadow="0 8px 32px rgba(0,0,0,0.06)"
      >
        {/* Logo + title */}
        <Flex direction="column" align="center" mb={8}>
          <Image src="/chromamind_app_icon.svg" w="72px" h="72px" alt="ChromaMind" mb={4} />
          <Text
            as="h1"
            fontSize="24px"
            fontWeight="700"
            color="gray.950"
            letterSpacing="-0.025em"
            lineHeight="1.25"
            textAlign="center"
          >
            Connect to ChromaDB
          </Text>
        </Flex>

        {/* Mode toggle */}
        <Flex bg="gray.100" borderRadius="lg" p="3px" mb={6} gap="3px">
          {(['Local', 'Cloud'] as const).map((m) => {
            const isActive = mode === m.toLowerCase()
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m.toLowerCase() as 'local' | 'cloud')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.15s',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? 'var(--chakra-colors-brand-600)' : 'var(--chakra-colors-gray-500)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {m}
              </button>
            )
          })}
        </Flex>

        {/* Fields */}
        <form onSubmit={(e) => { e.preventDefault(); connect() }} aria-label="form" noValidate>
          <Flex direction="column" gap={4}>
            <Field label="URL" required>
              <Input
                type="text"
                ref={urlRef}
                data-testid="url-input"
                placeholder={mode === 'local' ? 'http://localhost:8000' : 'https://api.trychroma.com'}
                size="sm"
              />
            </Field>

            {mode === 'local' && (
              <Field label="Tenant">
                <Input type="text" ref={tenantRef} placeholder="default_tenant" size="sm" />
              </Field>
            )}

            <Field label="Database">
              <Input type="text" ref={dbRef} placeholder="default_database" size="sm" />
            </Field>

            {mode === 'cloud' && (
              <Field label="API Key" required>
                <PasswordInput ref={apiKeyRef} data-testid="api-key-input" size="sm" />
              </Field>
            )}
          </Flex>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            loadingText="Connecting…"
            width="100%"
            mt={7}
            size="lg"
          >
            Connect
          </Button>
        </form>

        {/* Status feedback */}
        {success && (
          <Flex data-testid="success-feedback" align="center" justify="center" mt={5} p={4} bg="green.100" borderRadius="lg">
            <Box color="green.600"><CheckCircle /></Box>
          </Flex>
        )}

        {error && (
          <Box mt={5} px={4} py={3} bg="red.50" borderRadius="lg">
            <Text fontSize="13px" color="red.600" lineHeight="1.5">{error}</Text>
          </Box>
        )}

        <Text fontSize="11px" color="gray.400" mt={5} textAlign="center">
          ChromaMind v0.1.0
        </Text>
      </Box>
    </Center>
  )
}

export default App
