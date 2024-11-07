// @ts-expect-error react is not used in this file
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
import { Show, Spinner, VStack, Text, Editable } from '@chakra-ui/react'
import { DataListItem, DataListRoot } from '@/components/ui/data-list'

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
  const [collectionData, setCollectionData] = useState<CollectionData | null>(
    null,
  )

  const fetchCollectionData = async () => {
    const result = await invokeWrapper<CollectionData>(
      TauriCommand.FETCH_COLLECTION_DATA,
      {
        collectionName: collectionName,
      },
    )

    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
      })
      .with({ type: 'success' }, ({ result }) => {
        setCollectionData(result)
      })
      .exhaustive()
  }

  useEffect(() => {
    if (role == 'info') {
      fetchCollectionData()
    }
  }, [])

  return (
    <>
      <DialogRoot open={isOpen} scrollBehavior={'inside'}>
        <DialogBackdrop />
        <DialogContent>
          {match(role)
            .with('info', () => (
              <Show
                when={collectionData !== null}
                fallback={
                  <VStack colorPalette="teal">
                    <Spinner color="brand.500" />
                    <Text color="brand.500">Loading...</Text>
                  </VStack>
                }
              >
                <DialogHeader>
                  <DialogTitle>
                    <Editable.Root
                      textAlign="center"
                      defaultValue={collectionName}
                      activationMode="dblclick"
                      fontSize={'large'}
                      onValueChange={(value) => {
                        console.log(value)
                      }}
                    >
                      <Editable.Preview />
                      <Editable.Input />
                    </Editable.Root>
                  </DialogTitle>
                </DialogHeader>
                <DialogCloseTrigger onClick={onClose} />
                <DialogBody>
                  <DataListRoot>
                    <DataListItem label="ID" value={collectionData?.id} />
                    <DataListItem
                      label="Configuration"
                      value={
                        <pre>
                          {JSON.stringify(
                            collectionData?.configuration,
                            null,
                            2,
                          )}
                        </pre>
                      }
                    />
                    <DataListItem
                      label="Metadata"
                      value={
                        <Editable.Root
                          textAlign="start"
                          defaultValue={JSON.stringify(
                            collectionData?.metadata,
                            null,
                            2,
                          )}
                          activationMode="dblclick"
                        >
                          <Editable.Preview />
                          <Editable.Input />
                        </Editable.Root>
                      }
                    />
                  </DataListRoot>
                </DialogBody>
                <DialogFooter>
                  <Button onClick={onClose}>Close</Button>
                </DialogFooter>
              </Show>
            ))
            .otherwise(() => (
              <></>
            ))}
        </DialogContent>
      </DialogRoot>
    </>
  )
}

export default CollectionDialog
