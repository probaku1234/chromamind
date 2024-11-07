import { TauriCommand } from '@/types'
import { invokeWrapper } from '@/utils/invokeTauri'
// @ts-expect-error react is not used in this file
import React, { useEffect, useRef, useState } from 'react'
import { match } from 'ts-pattern'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  // DialogTitle,
  // DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Box,
  FieldHelperText,
  Fieldset,
  Input,
  Spinner,
  Stack,
  Textarea,
  Text,
  Icon,
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
  }>({
    type: 'idle',
  })
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

    const result = await invokeWrapper<boolean>(
      TauriCommand.CREATE_COLLECTION,
      {
        collectionName,
        metadata,
      },
    )

    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        setStatus({ type: 'error', message: error })
      })
      .with({ type: 'success' }, ({ result }) => {
        setStatus({ type: 'finished' })
        // fetchCollections()
        console.log(result)
      })
  }

  const validateName = () => {
    const validList = []

    const value = nameRef.current?.value || ''

    // 3-63 characters
    validList.push(value.length >= 3 && value.length <= 63)

    // starts and ends with an alphanumeric character, otherwise contains only alphanumeric characters, underscores or hyphens
    validList.push(/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(value))

    // contains no two consecutive periods
    validList.push(!/\.\./.test(value))

    // not a valid IPv4 address
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
      scrollBehavior={'inside'}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <>
            {match(status)
              .with({ type: 'idle' }, () => (
                <>
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
                          onChange={() => {
                            validateName()
                          }}
                        />
                        {nameValid != null && (
                          <>
                            <FieldHelperText
                              color={nameValid[0] ? 'green' : 'red'}
                              title={nameValid[0] ? '0-valid' : '0-invalid'}
                            >
                              • contains 3-63 characters
                            </FieldHelperText>
                            <FieldHelperText
                              color={nameValid[1] ? 'green' : 'red'}
                              title={nameValid[1] ? '1-valid' : '1-invalid'}
                            >
                              • starts and ends with an alphanumeric character,
                              otherwise contains only alphanumeric characters,
                              underscores or hyphens
                            </FieldHelperText>
                            <FieldHelperText
                              color={nameValid[2] ? 'green' : 'red'}
                              title={nameValid[2] ? '2-valid' : '2-invalid'}
                            >
                              • contains no two consecutive periods
                            </FieldHelperText>
                            <FieldHelperText
                              color={nameValid[3] ? 'green' : 'red'}
                              title={nameValid[3] ? '3-valid' : '3-invalid'}
                            >
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
                </>
              ))
              .with({ type: 'loading' }, () => (
                <Box textAlign={'center'}>
                  <Spinner size={'xl'} />
                  <Text>Loading...</Text>
                </Box>
              ))
              .with({ type: 'finished' }, () => (
                <Box textAlign={'center'} title="finished">
                  <Icon w={16} h={16} color="green.500" mt={4}>
                    <CheckCircleIcon />
                  </Icon>
                </Box>
              ))
              .with({ type: 'error' }, ({ message }) => (
                <Box mt={4} textAlign={'center'}>
                  <Icon w={16} h={16} color="red.500">
                    <CloseIcon />
                  </Icon>
                  <Text color={'red.500'} mt={2}>
                    {message}
                  </Text>
                  <Button
                    onClick={() =>
                      setStatus({
                        type: 'idle',
                      })
                    }
                  >
                    Retry
                  </Button>
                </Box>
              ))
              .exhaustive()}
          </>
        </DialogBody>
        <DialogFooter display={status.type === 'idle' ? '' : 'none'}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            loading={status.type === 'loading'}
            disabled={!isNameValid}
            onClick={createCollection}
          >
            create
          </Button>
        </DialogFooter>
        <DialogCloseTrigger onClick={onClose} border={0} />
      </DialogContent>
    </DialogRoot>
  )
}

export default CreateCollectionDialog
