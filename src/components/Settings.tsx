import React, { useState, ReactNode } from 'react'
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
  SystemConfig,
  Spacer,
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
// import App from '@/App.tsx'
import { defaultCustomConfig } from '@/theme.ts'
import Preview from '@/components/Preview'
import Editor from '@monaco-editor/react'
import { RepeatIcon } from '@chakra-ui/icons'

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
      const obj: SystemConfig = JSON.parse(text)

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
      const obj: SystemConfig = JSON.parse(text)

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
      <Heading ml={MARGIN} pt={MARGIN}>
        Settings
      </Heading>
      <OptionBox
        left={
          <Box>
            <Text alignSelf={'center'}>Theme</Text>
            <Text fontSize={'xs'} color={'gray'}>
              Edit the theme of the application. You can use the editor on the
              left to edit the theme and see the preview on the right.
            </Text>
          </Box>
        }
        right={
          <DialogRoot
            size="cover"
            placement="center"
            motionPreset="slide-in-bottom"
            lazyMount
            unmountOnExit
            closeOnInteractOutside={false}
            onExitComplete={() => {
              localStorage.removeItem(CUSTOM_THEME_PREVIEW_KEY)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Manage
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
                          const previewThemeConfig: SystemConfig = JSON.parse(
                            localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY) ||
                              '{}',
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
                                  {/* <App /> */}
                                  <IconButton
                                    width={'2rem'}
                                    height={'2rem'}
                                    position={'absolute'}
                                    bg={'brand.500'}
                                    top={0}
                                    right={0}
                                    onClick={() => setChecksum(checksum + 1)}
                                  >
                                    <RepeatIcon />
                                  </IconButton>
                                  <Preview />
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
        }
      />
      <OptionBox
        left={
          <Box>
            <Text alignSelf={'center'}>
              Delete all data including collections and embeddings.
            </Text>
            <Text fontSize={'xs'} color={'red'}>
              The Chromadb must be reset enabled.
            </Text>
          </Box>
        }
        right={
          <Button onClick={onOpen} buttonType="critical" size={'sm'}>
            Reset Chroma
          </Button>
        }
      />
      <DialogRoot open={open} role="alertdialog">
        <DialogBackdrop />
        {/* <DialogTrigger /> */}
        <DialogContent>
          <DialogCloseTrigger onClick={onClose} />
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
    </Box>
  )
}

interface OptionBoxProps {
  left: ReactNode
  right: ReactNode
}

const OptionBox = ({ left, right, ...rest }: OptionBoxProps) => {
  return (
    <Box {...rest}>
      <Flex alignItems={'center'} m={MARGIN}>
        {left}
        <Spacer />
        {right}
      </Flex>
      <Separator />
    </Box>
  )
}

export default Settings
