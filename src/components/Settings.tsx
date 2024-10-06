import React from 'react'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Switch,
  Text,
  useColorMode,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { TauriCommand } from '../types.ts'

const Settings: React.FC = () => {
  const { toggleColorMode } = useColorMode()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  const resetChroma = async () => {
    const [result, error] = await invokeWrapper(TauriCommand.RESET_CHROMA)

    if (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: `Failed to reset chroma: ${error}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } else {
      console.log(result)
      toast({
        title: 'Success',
        description: 'Chroma reset successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    }

    onClose()
  }

  return (
    <Box>
      <Heading as="h1" my={4}>
        Settings
      </Heading>
      <FormControl display="flex" alignItems="center">
        <Switch
          id="email-alerts"
          onChange={toggleColorMode}
          size={'lg'}
          mr={1}
        />
        <FormLabel htmlFor="email-alerts" mb="0">
          Toggle color mode
        </FormLabel>
      </FormControl>

      <Divider mt={4} mb={4} />

      <Flex>
        <Button colorScheme="red" onClick={onOpen} mr={4}>
          Reset Chroma
        </Button>
        <Text fontSize={'xl'} alignSelf={'center'}>
          delete all collections and entries.
        </Text>
      </Flex>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Reset Database
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? You can&apos;t undo this action afterwards.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={resetChroma} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default Settings
