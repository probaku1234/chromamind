import React, { useState, ReactNode } from 'react'
import {
  Box,
  Flex,
  Heading,
  Spacer,
  Text,
  useDisclosure,
  defineConfig,
  createSystem,
  defaultConfig,
  SystemConfig,
  IconButton,
} from '@chakra-ui/react'
import { toaster, Toaster } from '@/components/ui/toaster'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogBackdrop,
  DialogActionTrigger,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import {
  CUSTOM_THEME_PREVIEW_KEY,
  TauriCommand,
  CUSTOM_THEME_KEY,
} from '../types.ts'
import { match } from 'ts-pattern'
import Frame, { FrameContextConsumer } from 'react-frame-component'
import { CacheProvider } from '@emotion/react'
import { debounce } from 'lodash'
import { ChakraProvider } from '@chakra-ui/react'
import createCache from '@emotion/cache'
import { defaultCustomConfig } from '@/theme.ts'
import Preview from '@/components/Preview'
import Editor from '@monaco-editor/react'
import { RepeatIcon } from '@chakra-ui/icons'

const Settings: React.FC = () => {
  const [checksum, setChecksum] = useState(0)
  const [isThemeError, setIsThemeError] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const { open, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const defaultEditorValue =
    localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY) ??
    localStorage.getItem(CUSTOM_THEME_KEY) ??
    JSON.stringify(defaultCustomConfig, null, 2)
  const [editorDefaultValue, setEditorDefaultValue] = useState<string>(defaultEditorValue)
  const [text, setText] = useState<string>(defaultEditorValue)

  const resetChroma = async () => {
    const result = await invokeWrapper<boolean>(TauriCommand.RESET_CHROMA)

    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        toaster.create({
          title: 'Error',
          description: `Failed to reset chroma: ${error}`,
          type: 'error',
          duration: 5000,
        })
      })
      .with({ type: 'success' }, ({ result }) => {
        console.log(result)
        toaster.create({
          title: 'Success',
          description: 'Chroma reset successfully.',
          type: 'success',
          duration: 5000,
        })
      })
      .exhaustive()

    onClose()
  }

  const onChange = debounce((val: string) => {
    try {
      const obj: SystemConfig = JSON.parse(val)
      localStorage.setItem(CUSTOM_THEME_PREVIEW_KEY, JSON.stringify(obj, null, 2))
      setChecksum(c => c + 1)
      setIsThemeError(false)
    } catch (e) {
      console.error(e)
      setIsThemeError(true)
    }
  }, 1000)

  const onResetTheme = () => {
    const defaults = JSON.stringify(defaultCustomConfig, null, 2)
    localStorage.removeItem(CUSTOM_THEME_KEY)
    localStorage.removeItem(CUSTOM_THEME_PREVIEW_KEY)
    setText(defaults)
    setEditorDefaultValue(defaults)
    setEditorKey(k => k + 1)
    setIsThemeError(false)
    setChecksum(c => c + 1)
  }

  const onSaveClick = () => {
    try {
      const obj: SystemConfig = JSON.parse(text)
      localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(obj, null, 2))
      localStorage.removeItem(CUSTOM_THEME_PREVIEW_KEY)
      location.reload()
    } catch (e) {
      console.error(e)
      toaster.create({
        title: 'Error',
        description: 'Failed to save theme.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  return (
    <Box
      px={8}
      pt={7}
      pb={8}
      maxW="720px"
      h="100%"
      overflowY="auto"
      bg="firstBg"
    >
      <Toaster />

      <Heading
        as="h2"
        fontSize="22px"
        fontWeight="700"
        color="gray.950"
        letterSpacing="-0.02em"
        mb={6}
      >
        Settings
      </Heading>

      {/* Theme row */}
      <OptionRow
        title="Theme"
        description="Edit the theme of the application. Use the editor on the left to modify tokens and see a live preview on the right."
        action={
          <DialogRoot
            size="cover"
            placement="center"
            motionPreset="slide-in-bottom"
            lazyMount
            unmountOnExit
            closeOnInteractOutside={false}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Manage</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader borderBottomWidth="1px" borderColor="border">
                <DialogTitle fontSize="16px" fontWeight="700">Theme</DialogTitle>
              </DialogHeader>
              <DialogBody p={0}>
                <Flex h="100%">
                  <Box w="1/2" borderRightWidth="1px" borderColor="border">
                    <Editor
                      key={editorKey}
                      height="100%"
                      language="json"
                      theme="light"
                      defaultValue={editorDefaultValue}
                      options={{
                        formatOnType: true,
                        minimap: { scale: 10 },
                        colorDecorators: true,
                      }}
                      onChange={(val) => {
                        setText(val ?? '')
                        onChange(val ?? '')
                      }}
                      onValidate={(markers) => {
                        setIsThemeError(markers.length > 0)
                      }}
                    />
                  </Box>
                  <Box w="1/2">
                    <Frame height="100%" width="100%" key={checksum} loading="lazy">
                      <FrameContextConsumer>
                        {(frameContext) => {
                          const cache = createCache({
                            container: frameContext.document?.head,
                            key: 'css',
                          })
                          const previewThemeConfig: SystemConfig = JSON.parse(
                            localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY) || '{}',
                          )
                          const previewConfig = defineConfig({
                            ...defaultCustomConfig,
                            ...previewThemeConfig,
                          })
                          const previewSystem = createSystem(defaultConfig, previewConfig)

                          return (
                            <CacheProvider value={cache}>
                              <ChakraProvider value={previewSystem}>
                                <IconButton
                                  width="2rem"
                                  height="2rem"
                                  position="absolute"
                                  bg="brand.600"
                                  top={0}
                                  right={0}
                                  onClick={() => setChecksum(c => c + 1)}
                                >
                                  <RepeatIcon />
                                </IconButton>
                                <Preview />
                              </ChakraProvider>
                            </CacheProvider>
                          )
                        }}
                      </FrameContextConsumer>
                    </Frame>
                  </Box>
                </Flex>
              </DialogBody>
              <DialogFooter borderTopWidth="1px" borderColor="border">
                <Button variant="outline" colorPalette="gray" onClick={onResetTheme}>
                  Reset to Default
                </Button>
                <Spacer />
                <DialogActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogActionTrigger>
                <Button disabled={isThemeError} onClick={onSaveClick}>Save</Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </DialogContent>
          </DialogRoot>
        }
      />

      {/* Reset Chroma row */}
      <OptionRow
        title="Delete all data including collections and embeddings."
        description="The Chromadb must be reset enabled."
        descriptionColor="red.500"
        action={
          <Button onClick={onOpen} buttonType="critical" size="sm">
            Reset Chroma
          </Button>
        }
      />

      {/* Reset confirm dialog */}
      <DialogRoot open={open} role="alertdialog">
        <DialogBackdrop />
        <DialogContent maxW="380px" borderRadius="14px">
          <DialogCloseTrigger onClick={onClose} />
          <DialogHeader pb={2}>
            <DialogTitle fontSize="17px" fontWeight="700">Reset Database</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text fontSize="13px" color="gray.500" lineHeight="1.6">
              Are you sure? You can&apos;t undo this action afterwards.
            </Text>
          </DialogBody>
          <DialogFooter gap={2}>
            <Button ref={cancelRef} variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={resetChroma} buttonType="critical">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Box>
  )
}

interface OptionRowProps {
  title: string
  description?: string
  descriptionColor?: string
  action: ReactNode
}

const OptionRow = ({ title, description, descriptionColor, action }: OptionRowProps) => (
  <Box borderBottomWidth="1px" borderColor="border">
    <Flex align="center" py={5} gap={6}>
      <Box flex={1}>
        <Text fontSize="14px" fontWeight="500" color="gray.950">{title}</Text>
        {description && (
          <Text fontSize="12px" color={descriptionColor ?? 'gray.500'} mt="3px" lineHeight="1.5">
            {description}
          </Text>
        )}
      </Box>
      <Box flexShrink={0}>{action}</Box>
    </Flex>
  </Box>
)

export default Settings
