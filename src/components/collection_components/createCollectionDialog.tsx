import { TauriCommand } from '@/types'
import { invokeWrapper } from '@/utils/invokeTauri'
// @ts-expect-error react is not used in this file
import React, { useRef, useState } from 'react'
import { match } from 'ts-pattern'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FieldHelperText,
  Fieldset,
  Flex,
  Icon,
  Input,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { Field } from '../ui/field'
import { Button } from '../ui/button'
import { CheckCircleIcon, CloseIcon } from '@chakra-ui/icons'

const CreateCollectionDialog = ({
  open,
  onClose,
  fetchCollections,
}: {
  open: boolean
  onClose: () => void
  fetchCollections: () => Promise<void>
}) => {
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'finished' | 'error'
    message?: string
  }>({ type: 'idle' })
  const [nameValid, setNameValid] = useState<boolean[] | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const metadataRef = useRef<HTMLTextAreaElement>(null)

  const createCollection = async () => {
    const collectionName = nameRef.current?.value || ''
    const metadataString = metadataRef.current?.value
    let metadata = undefined

    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString)
      } catch (e) {
        console.error(e)
      }
    }

    const result = await invokeWrapper<boolean>(TauriCommand.CREATE_COLLECTION, {
      collectionName,
      metadata,
    })

    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        setStatus({ type: 'error', message: error })
      })
      .with({ type: 'success' }, ({ result }) => {
        setStatus({ type: 'finished' })
        console.log(result)
      })
      .exhaustive()
  }

  const validateName = () => {
    const validList = []
    const value = nameRef.current?.value || ''

    validList.push(value.length >= 3 && value.length <= 63)
    validList.push(/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(value))
    validList.push(!/\.\./.test(value))
    validList.push(!/\d+\.\d+\.\d+\.\d+/.test(value))

    setNameValid(validList)
  }

  const isNameValid = nameValid != null && nameValid.every((value) => value)

  return (
    <DialogRoot
      open={open}
      modal
      closeOnEscape
      unmountOnExit
      lazyMount
      onOpenChange={(details) => {
        if (!details.open) {
          setStatus({ type: 'idle' })
          setNameValid(null)
          fetchCollections()
        }
      }}
      scrollBehavior="inside"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {match(status)
            .with({ type: 'idle' }, () => (
              <Fieldset.Root invalid={!isNameValid}>
                <Stack>
                  <Fieldset.Legend>collection details</Fieldset.Legend>
                  <Fieldset.HelperText>
                    Provide new collection&apos;s details below.
                  </Fieldset.HelperText>
                </Stack>
                <Fieldset.Content>
                  <Field label="Name" required>
                    <Input
                      type="text"
                      placeholder="collection name"
                      ref={nameRef}
                      onChange={validateName}
                    />
                    {nameValid != null && (
                      <>
                        <FieldHelperText color={nameValid[0] ? 'green.600' : 'red.500'} title={nameValid[0] ? '0-valid' : '0-invalid'}>
                          • contains 3-63 characters
                        </FieldHelperText>
                        <FieldHelperText color={nameValid[1] ? 'green.600' : 'red.500'} title={nameValid[1] ? '1-valid' : '1-invalid'}>
                          • starts and ends with an alphanumeric character, otherwise contains only alphanumeric characters, underscores or hyphens
                        </FieldHelperText>
                        <FieldHelperText color={nameValid[2] ? 'green.600' : 'red.500'} title={nameValid[2] ? '2-valid' : '2-invalid'}>
                          • contains no two consecutive periods
                        </FieldHelperText>
                        <FieldHelperText color={nameValid[3] ? 'green.600' : 'red.500'} title={nameValid[3] ? '3-valid' : '3-invalid'}>
                          • not a valid IPv4 address
                        </FieldHelperText>
                      </>
                    )}
                  </Field>
                  <Field label="Metadata">
                    <Textarea placeholder="metadata" ref={metadataRef} />
                  </Field>
                </Fieldset.Content>
              </Fieldset.Root>
            ))
            .with({ type: 'loading' }, () => (
              <Flex direction="column" align="center" py={8}>
                <Spinner size="xl" color="brand.500" mb={3} />
                <Text color="gray.500">Loading...</Text>
              </Flex>
            ))
            .with({ type: 'finished' }, () => (
              <Flex direction="column" align="center" py={8} title="finished">
                <Icon w={16} h={16} color="green.500" mb={3}>
                  <CheckCircleIcon />
                </Icon>
                <Text color="green.600" fontWeight="500">Collection created!</Text>
              </Flex>
            ))
            .with({ type: 'error' }, ({ message }) => (
              <Flex direction="column" align="center" py={8}>
                <Icon w={12} h={12} color="red.500" mb={3}>
                  <CloseIcon />
                </Icon>
                <Text color="red.500" mb={4}>{message}</Text>
                <Button onClick={() => setStatus({ type: 'idle' })}>Retry</Button>
              </Flex>
            ))
            .exhaustive()}
        </DialogBody>
        <DialogFooter display={status.type === 'idle' ? '' : 'none'}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={status.type === 'loading'} disabled={!isNameValid} onClick={createCollection}>
            create
          </Button>
        </DialogFooter>
        <DialogCloseTrigger onClick={onClose} border={0} />
      </DialogContent>
    </DialogRoot>
  )
}

export default CreateCollectionDialog
