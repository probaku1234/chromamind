import React from 'react'
import {
  Box,

  Flex,
  Heading,
  Text,
  useDisclosure,
  Separator,
} from '@chakra-ui/react'
import { Switch } from '@/components/ui/switch'
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
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { TauriCommand } from '../types.ts'
import { match } from 'ts-pattern'

const Settings: React.FC = () => {
  const { open, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

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

  return (
    <Box>
      <Toaster />
      <Heading as="h1" my={4} mt={0}>
        Settings
      </Heading>
      <Box display="flex" alignItems="center">
        <Text>Toggle color mode</Text>
        <Switch id="email-alerts" onChange={() => {}} size={'lg'} mr={1} />
      </Box>

      <Separator mt={4} mb={4} />

      <Flex>
        <Button colorScheme="red" onClick={onOpen} mr={4}>
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
            <Button onClick={resetChroma} ml={3} buttonType='critical'>
              Delete
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  )
}

export default Settings
