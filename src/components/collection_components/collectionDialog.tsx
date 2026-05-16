import React, { useEffect, useState } from 'react'
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { match } from 'ts-pattern'
import { CollectionData, TauriCommand } from '@/types.ts'
import { invokeWrapper } from '@/utils/invokeTauri.ts'
import { Box, Flex, Show, Spinner, Text, VStack } from '@chakra-ui/react'

const CollectionDialog = ({
  isOpen,
  onClose,
  role,
  collectionName,
}: {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  role: 'info'
  collectionName?: string
}) => {
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null)

  const fetchCollectionData = async () => {
    const result = await invokeWrapper<CollectionData>(TauriCommand.FETCH_COLLECTION_DATA, {
      collectionName,
    })
    match(result)
      .with({ type: 'error' }, ({ error }) => { console.error(error) })
      .with({ type: 'success' }, ({ result }) => { setCollectionData(result) })
      .exhaustive()
  }

  useEffect(() => {
    if (isOpen && role === 'info') {
      fetchCollectionData()
    }
  }, [isOpen])

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box mb={4}>
      <Text
        fontSize="11px"
        fontWeight="600"
        color="gray.400"
        textTransform="uppercase"
        letterSpacing="wide"
        mb="5px"
      >
        {label}
      </Text>
      <Box
        fontSize="12px"
        fontFamily="'JetBrains Mono', monospace"
        color="gray.900"
        bg="brand.50"
        px={3}
        py="6px"
        borderRadius="md"
        wordBreak="break-all"
      >
        {value}
      </Box>
    </Box>
  )

  return (
    <DialogRoot open={isOpen} scrollBehavior="inside">
      <DialogBackdrop />
      <DialogContent>
        {match(role)
          .with('info', () => (
            <Show
              when={collectionData !== null}
              fallback={
                <VStack p={8}>
                  <Spinner color="brand.500" />
                  <Text color="brand.500">Loading...</Text>
                </VStack>
              }
            >
              <DialogHeader>
                <DialogTitle>{collectionName}</DialogTitle>
              </DialogHeader>
              <DialogCloseTrigger onClick={onClose} />
              <DialogBody>
                <InfoRow label="ID" value={collectionData?.id} />
                <InfoRow
                  label="Configuration"
                  value={
                    <pre style={{ margin: 0, fontSize: 12 }}>
                      {JSON.stringify(collectionData?.configuration, null, 2)}
                    </pre>
                  }
                />
                <InfoRow
                  label="Metadata"
                  value={
                    <pre style={{ margin: 0, fontSize: 12 }}>
                      {JSON.stringify(collectionData?.metadata, null, 2)}
                    </pre>
                  }
                />
              </DialogBody>
              <DialogFooter>
                <Flex justify="flex-end">
                  <Button onClick={onClose}>Close</Button>
                </Flex>
              </DialogFooter>
            </Show>
          ))
          .otherwise(() => <></>)}
      </DialogContent>
    </DialogRoot>
  )
}

export default CollectionDialog
