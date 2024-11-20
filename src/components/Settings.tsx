import React, { useState } from 'react'
import {
  Box,
  Flex,
  Heading,
  Text,
  useDisclosure,
  Separator,
  defineConfig,
  createSystem,
  defaultConfig,
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
  DialogTrigger,
  DialogActionTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import {
  CUSTOM_THEME_PREVIEW_KEY,
  TauriCommand,
  CUSTOM_THEME_KEY,
} from '../types.ts'
import { match } from 'ts-pattern'
// import { EnvironmentProvider } from '@chakra-ui/react'
import Frame, { FrameContextConsumer } from 'react-frame-component'
import { Provider as ReduxProvider } from 'react-redux'
import { previewStore } from '@/store.ts'
import { CacheProvider } from '@emotion/react'
import { debounce } from 'lodash'
import { ChakraProvider } from '@chakra-ui/react'
import createCache from '@emotion/cache'
import App from '@/App.tsx'
import { defaultCustomConfig } from '@/theme.ts'
import Editor from '@monaco-editor/react'

const MARGIN = 2
const Settings: React.FC = () => {
  const [checksum, setChecksum] = useState(0)
  const [isThemeError, setIsThemeError] = useState(false)
  const { open, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const value =
    localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY) ??
    JSON.stringify(defaultCustomConfig, null, 2)
  const [text, setText] = useState<string>(value)

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

  const onChange = debounce((text: string) => {
    try {
      const obj = JSON.parse(text)

      localStorage.setItem(
        CUSTOM_THEME_PREVIEW_KEY,
        JSON.stringify(obj, null, 2),
      )
      setChecksum(checksum + 1)
      setIsThemeError(false)
    } catch (e) {
      console.error(e)
      setIsThemeError(true)
    }
  }, 1000)

  const onSaveClick = () => {
    try {
      const obj = JSON.parse(text)

      localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(obj, null, 2))
      location.reload()
      // TODO: event listener to update theme
      // toaster.create({
      //   title: 'Success',
      //   description: 'Theme saved successfully.',
      //   type: 'success',
      //   duration: 5000,
      // })
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
    <Box>
      <Toaster />
      <Heading as="h1" my={4} mt={0}>
        Settings
      </Heading>
      <Flex m={MARGIN}>
        <Button onClick={onOpen} mr={4} buttonType="critical" size={'sm'}>
          Reset Chroma
        </Button>
        <Text fontSize={'xl'} alignSelf={'center'}>
          delete all collections and entries.
        </Text>
      </Flex>

      <DialogRoot open={open} role="alertdialog">
        <DialogBackdrop />
        {/* <DialogTrigger /> */}
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Reset Database</DialogTitle>
          </DialogHeader>

          <DialogBody>
            Are you sure? You can&apos;t undo this action afterwards.
          </DialogBody>

          <DialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={resetChroma} ml={3} buttonType="critical">
              Delete
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      <DialogRoot
        size="cover"
        placement="center"
        motionPreset="slide-in-bottom"
        lazyMount
        unmountOnExit
        closeOnInteractOutside={false}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" m={MARGIN}>
            Edit Theme
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Theme</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Flex height={'100%'}>
              <Box w={'1/2'}>
                <Editor
                  height={'100%'}
                  language="json"
                  theme="light"
                  defaultValue={value}
                  options={{
                    formatOnType: true,
                    minimap: { scale: 10 },
                    colorDecorators: true,
                  }}
                  onChange={(value) => {
                    setText(value ?? '')
                    onChange(value ?? '')
                  }}
                  onValidate={(markers) => {
                    console.log(markers)
                    setIsThemeError(true)
                  }}
                />
              </Box>

              <Separator orientation="vertical" size={'lg'} />
              <Box w={'1/2'}>
                <Frame
                  height={'100%'}
                  width={'100%'}
                  key={checksum}
                  loading="lazy"
                >
                  <FrameContextConsumer>
                    {(frameContext) => {
                      const cache = createCache({
                        container: frameContext.document?.head,
                        key: 'css',
                      })
                      const previewThemeConfig = JSON.parse(
                        localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY) || '{}',
                      )
                      const previewConfig = defineConfig({
                        ...defaultCustomConfig,
                        ...previewThemeConfig,
                      })
                      const previewSystem = createSystem(
                        defaultConfig,
                        previewConfig,
                      )

                      return (
                        <CacheProvider value={cache}>
                          <ChakraProvider value={previewSystem}>
                            <ReduxProvider store={previewStore}>
                              <App />
                            </ReduxProvider>
                          </ChakraProvider>
                        </CacheProvider>
                      )
                    }}
                  </FrameContextConsumer>
                </Frame>
              </Box>
            </Flex>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button disabled={isThemeError} onClick={onSaveClick}>
              Save
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  )
}

export default Settings
