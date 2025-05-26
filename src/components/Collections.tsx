import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  // Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  SimpleGrid,
  Skeleton,
  Spacer,
  Table as CKTable,
  useDisclosure,
  Text,
  Stack,
  FlexProps,
  useRecipe,
  NumberInput,
} from '@chakra-ui/react'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuContextTrigger,
} from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { Toaster, toaster } from '@/components/ui/toaster'
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createListCollection } from '@chakra-ui/react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CollectionData,
  EmbeddingsData,
  EmbeddingsDataValueType,
  State,
} from '../types'
import {
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowBackIcon,
  ArrowForwardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RepeatIcon,
} from '@chakra-ui/icons'
import { CiCircleInfo } from 'react-icons/ci'
import { EmptyState } from '@/components/ui/empty-state'
import { FiCheck, FiClipboard, FiCopy, FiPlus, FiStar } from 'react-icons/fi'
// import { FaFileCsv, FaPrint, FaRegFilePdf, FaTrash } from 'react-icons/fa6'
import { useResizable } from 'react-resizable-layout'
import { cn } from '../utils/cn'
import '../styles/collection.css'
import { embeddingToString } from '../utils/embeddingToString'
import { MiddleTruncate } from '@re-dev/react-truncate'
import { JsonEditor } from 'json-edit-react'
import { match, P } from 'ts-pattern'
import { copyClipboard } from '../utils/copyToClipboard'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { TauriCommand, LOCAL_STORAGE_KEY_PREFIX } from '../types.ts'
import { updateCollection } from '@/slices/currentCollectionSlice.ts'
import { updateMenu } from '@/slices/currentMenuSlice.ts'
import { useLocalStorage } from '@uidotdev/usehooks'
import {
  CreateCollectionDialog,
  CollectionDialog,
  ErrorDisplay,
  NoDataDisplay,
  LoadingDataDisplay,
  GuidePopup,
} from '@/components/collection_components'
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { LuMinus, LuPlus } from 'react-icons/lu'

const DEFAULT_PAGES = [10, 25, 50, 100]
const TERMINAL_HEIGHT_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-terminal-height`
const FAVORITE_COLLECTIONS_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-favorite-collections`
const COLLECTION_NAV_WIDTH = 64

const frameworks = createListCollection({
  items: DEFAULT_PAGES.map((pageSize) => ({
    value: pageSize,
    label: `${pageSize} rows`,
  })),
})

const Collections: React.FC = () => {
  const url = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`) || ''
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection,
  )
  const [embeddings, setEmbeddings] = React.useState<EmbeddingsData[]>([])
  const [collectionId, setCollectionId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [tableLoading, setTableLoading] = React.useState(true)
  const [error, setError] = useState<string | undefined>()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGES[0])
  const [rowCount, setRowCount] = useState<number | undefined>()
  const [selectedCell, setSelectedCell] = useState<string | undefined>()
  const [detailViewContent, setDetailViewContent] = useState<
    EmbeddingsDataValueType | undefined
  >()
  const { open, onOpen, onClose } = useDisclosure()
  const {
    open: openCreateCollection,
    onOpen: onOpenCreateCollection,
    onClose: onCloseCreateCollection,
  } = useDisclosure()
  const currentContextCollection = useRef('')
  const [collections, setCollections] = useState<
    { id: string; name: string; isFavorite: boolean }[]
  >([])
  const [collectionFilter, setCollectionFilter] = useState('')
  const [favoriteCollections, setFavoriteCollections] = useLocalStorage<
    string[]
  >(`${FAVORITE_COLLECTIONS_KEY}:${url}`, [])
  const [selectedCollectionIds, setSelectedCollections] = useState<string[]>([])
  const navRef = useRef<HTMLDivElement>(null)
  const moveToInputRef = useRef<HTMLInputElement>(null)

  const initialHeight = parseFloat(
    localStorage.getItem(TERMINAL_HEIGHT_KEY) || '10',
  )
  const {
    isDragging: isTerminalDragging,
    position: terminalH,
    separatorProps: terminalDragBarProps,
  } = useResizable({
    axis: 'y',
    initial: initialHeight,
    min: 30,
    reverse: true,
    onResizeEnd: (args) => {
      console.debug('Terminal position:', args.position)
      localStorage.setItem(TERMINAL_HEIGHT_KEY, args.position.toString())
    },
  })
  const dispatch = useDispatch()
  const columnHelper = useMemo(() => createColumnHelper<EmbeddingsData>(), [])

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor('document', {
        cell: (info) => (
          <MiddleTruncate end={0}>{info.getValue()}</MiddleTruncate>
        ),
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor('embedding', {
        cell: (info) => (
          <MiddleTruncate end={0}>
            {embeddingToString(info.getValue())}
          </MiddleTruncate>
        ),
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor('metadata', {
        cell: (info) => JSON.stringify(info.getValue()),
      }),
    ],
    [columnHelper],
  )

  const table = useReactTable({
    columns,
    data: embeddings || [],
    // initialState: { pagination: { pageSize: DEFAULT_PAGES[0] } },
    autoResetPageIndex: false,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    // sorting
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    // pagination
    // getPaginationRowModel: getPaginationRowModel(),
    // column visible
    onColumnVisibilityChange: setColumnVisibility,
    // column filter
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    rowCount,
  })

  const countMaxColumns = useMemo(() => {
    return Math.max(
      ...table.getHeaderGroups().map((headerGroup) => {
        return headerGroup.headers.length
      }),
    )
  }, [table])

  async function fetchCollections() {
    const result = await invokeWrapper<{ id: string; name: string }[]>(
      TauriCommand.FETCH_COLLECTIONS,
    )
    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        return
      })
      .with({ type: 'success' }, async ({ result }) => {
        setCollections(
          result.map((collection) => ({ ...collection, isFavorite: false })),
        )
      })
      .exhaustive()
  }

  const onFavoriteCollection = (name: string) => {
    if (favoriteCollections.includes(name)) {
      setFavoriteCollections(
        favoriteCollections.filter((collection) => collection !== name),
      )
    } else {
      setFavoriteCollections([...favoriteCollections, name])
    }
  }

  const deleteCollection = async (collectionName: string) => {
    const names = selectedCollectionIds.map(
      (id) => collections.find((value) => value.id == id)?.name,
    )
    if (names.includes(undefined)) {
      console.error('Collection not found', selectedCollectionIds, names)
      toaster.create({
        title: 'Failed to delete collection',
        type: 'error',
        duration: 2000,
      })
      throw new Error('Collection not found')
    }
    const result = await invokeWrapper<void>(TauriCommand.DELETE_COLLECTION, {
      collectionNames:
        selectedCollectionIds.length > 0
          ? selectedCollectionIds.map(
              (id) => collections.find((value) => value.id == id)?.name,
            )
          : [collectionName],
    })

    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        toaster.create({
          title: 'Failed to delete collection',
          type: 'error',
          duration: 2000,
        })
      })
      .with({ type: 'success' }, async () => {
        dispatch(updateCollection(''))
        const message =
          selectedCollectionIds.length > 0
            ? `${selectedCollectionIds.length} collections deleted`
            : `Collection ${collectionName} deleted`
        toaster.create({
          title: message,
          type: 'success',
          duration: 2000,
        })
        await fetchCollections()
      })
      .exhaustive()

    setSelectedCollections([])
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  // fetch collection data
  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!currentCollection) return

      setError(undefined)
      const result = await invokeWrapper<CollectionData>(
        TauriCommand.FETCH_COLLECTION_DATA,
        {
          collectionName: currentCollection,
        },
      )

      match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
          setError(error)
          return
        })
        .with({ type: 'success' }, ({ result }) => {
          setCollectionId(result.id)
        })
        .exhaustive()
    }

    fetchCollectionData()
  }, [currentCollection])

  // fetch total row count
  useEffect(() => {
    const fetchRowCount = async () => {
      if (!currentCollection) return

      console.log('fetching row count')
      setLoading(true)
      const result = await invokeWrapper<number>(TauriCommand.FETCH_ROW_COUNT, {
        collectionName: currentCollection,
      })

      match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
          setError(error)
          return
        })
        .with({ type: 'success' }, ({ result }) => {
          setRowCount(result)
        })
        .exhaustive()
      setLoading(false)
    }

    fetchRowCount()
  }, [pageSize, currentCollection])

  // fetch embeddings
  useEffect(() => {
    const fetchEmbeddings = async () => {
      if (!currentCollection) return

      console.log('fetching embeddings')
      setTableLoading(true)
      const result = await invokeWrapper<EmbeddingsData[]>(
        TauriCommand.FETCH_EMBEDDINGS,
        {
          collectionName: currentCollection,
          limit: pageSize,
          offset: pageIndex,
        },
      )

      match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
          setError(error)
        })
        .with({ type: 'success' }, ({ result }) => {
          console.log(embeddings)
          setEmbeddings(result)
        })
        .exhaustive()
      setTableLoading(false)
    }

    fetchEmbeddings()
  }, [pageIndex, pageSize, currentCollection])

  return (
    <Box minH="100vh" width={'100%'}>
      <Stack direction={'row'} gap={0} maxH={'100vh'}>
        <Box height={'100vh'}>
          <Box pl="2" mt="2" width={COLLECTION_NAV_WIDTH}>
            <Toaster />
            <Stack
              direction={'row'}
              justifyContent={'center'}
              alignItems={'center'}
              mt={1}
              mr={0}
              gap={'0.2rem'}
              ref={navRef}
            >
              <Input
                type="text"
                size={'sm'}
                borderRadius={'8px'}
                placeholder="collection name"
                height={'2rem'}
                px={'0.3rem'}
                onChange={(e) => setCollectionFilter(e.target.value)}
              />
              <CreateCollectionDialog
                open={openCreateCollection}
                onClose={onCloseCreateCollection}
                fetchCollections={fetchCollections}
              />
              <Tooltip content="New Collection">
                <IconButton
                  boxSize={5}
                  cursor={'pointer'}
                  className="clickable-icon"
                  width={'2rem'}
                  height={'2rem'}
                  onClick={onOpenCreateCollection}
                  bg={'brand.500'}
                  title={'Create Collection'}
                >
                  {/* <FiPlusCircle /> */}
                  <FiPlus />
                </IconButton>
              </Tooltip>
              <Tooltip content="Refresh Collections">
                <IconButton
                  boxSize={5}
                  cursor={'pointer'}
                  className="clickable-icon"
                  width={'2rem'}
                  height={'2rem'}
                  bg={'brand.500'}
                  onClick={fetchCollections}
                >
                  <RepeatIcon />
                </IconButton>
              </Tooltip>
              <GuidePopup
                positioning={{
                  offset: { crossAxis: 0, mainAxis: 5 },
                  placement: 'bottom',
                }}
                title="Collection Navigation"
                messages={[
                  'Click to select collection',
                  'Double click to activate collection',
                  'Right click to open context menu',
                  'You can delete multiple collections at once',
                ]}
              >
                <IconButton
                  boxSize={3}
                  width={'24px'}
                  height={'24px'}
                  p={0}
                  backgroundColor={'transparent'}
                  borderColor={'transparent'}
                  minW={'24px'}
                  boxShadow={'none'}
                  color={'gray.400'}
                >
                  <CiCircleInfo />
                </IconButton>
              </GuidePopup>
            </Stack>
            {currentContextCollection.current && (
              <CollectionDialog
                isOpen={open}
                onOpen={onOpen}
                onClose={onClose}
                role={'info'}
                collectionName={currentContextCollection.current}
              />
            )}

            <Box
              overflowY={'scroll'}
              style={{
                maxHeight: `calc(100vh - ${navRef.current?.clientHeight}px - 16px)`,
              }}
              mt={2}
            >
              <MenuRoot>
                {collections
                  .map((collection) => {
                    return {
                      ...collection,
                      isFavorite: favoriteCollections.includes(collection.name),
                    }
                  }) // add isFavorite property
                  .filter((value) => value.name.includes(collectionFilter)) // filter by collection name
                  .sort((a, b) => {
                    if (a.isFavorite && !b.isFavorite) {
                      return -1
                    }
                    if (!a.isFavorite && b.isFavorite) {
                      return 1
                    }
                    return 0
                  }) // sort by favorite
                  .map((collection) => (
                    <MenuContextTrigger
                      asChild
                      key={collection.id}
                      onContextMenu={() => {
                        currentContextCollection.current = collection.name
                      }}
                      onClick={() => {
                        setSelectedCollections((prev) => {
                          if (prev.includes(collection.id)) {
                            return prev.filter((id) => id !== collection.id)
                          } else {
                            return [...prev, collection.id]
                          }
                        })
                        console.log(selectedCollectionIds)
                      }}
                    >
                      <CollectionNavItem
                        name={collection.name}
                        isFavorite={collection.isFavorite}
                        onFavorite={onFavoriteCollection}
                        isSelected={selectedCollectionIds.includes(
                          collection.id,
                        )}
                      >
                        <Tooltip
                          content={`${collection.name}`}
                          aria-label="A tooltip"
                        >
                          <Text truncate>{collection.name}</Text>
                        </Tooltip>
                      </CollectionNavItem>
                    </MenuContextTrigger>
                  ))}
                <MenuContent>
                  <MenuItem
                    value={'info'}
                    onClick={() => {
                      onOpen()
                    }}
                  >
                    Collection Info
                  </MenuItem>
                  <DialogRoot role={'alertdialog'}>
                    <DialogTrigger asChild>
                      <MenuItem
                        value={'delete'}
                        color="fg.error"
                        _hover={{ bg: 'bg.error', color: 'fg.error' }}
                      >
                        Delete Collection
                      </MenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                      </DialogHeader>
                      <DialogBody>
                        <p>
                          This action cannot be undone. This will permanently
                          delete the collection.
                        </p>
                      </DialogBody>
                      <DialogFooter>
                        <DialogActionTrigger asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogActionTrigger>
                        <DialogActionTrigger asChild>
                          <Button
                            buttonType="critical"
                            onClick={() => {
                              deleteCollection(currentContextCollection.current)
                            }}
                          >
                            Delete
                          </Button>
                        </DialogActionTrigger>
                      </DialogFooter>
                      <DialogCloseTrigger />
                    </DialogContent>
                  </DialogRoot>
                </MenuContent>
              </MenuRoot>
            </Box>
          </Box>
        </Box>
        {currentCollection == '' && !loading ? (
          <EmptyState
            title="No Collection Selected"
            description="Choose collection to get started"
            height={'100vh'}
            width={'full'}
            textAlign={'center'}
            alignContent={'center'}
          />
        ) : loading ? (
          <Box height={'100vh'} width={'full'}>
            <LoadingDataDisplay />
          </Box>
        ) : error ? (
          <Box height={'100vh'} width={'full'}>
            <ErrorDisplay message={error} />
          </Box>
        ) : embeddings.length === 0 ? (
          <Box width={'full'}>
            <NoDataDisplay />
          </Box>
        ) : (
          <Box
            className={
              'flex flex-column h-screen bg-dark font-mono color-white overflow-hidden'
            }
            pt={2}
            pl={2}
            pr={2}
            width={'full'}
          >
            <Box className={'flex grow'} overflowY={'scroll'}>
              <Box width={'100%'}>
                {collectionId ? (
                  <Flex>
                    <Tooltip content={`${collectionId}`} aria-label="A tooltip">
                      <Badge
                        colorPalette="green"
                        fontSize={'1em'}
                        ml={2}
                        mr={2}
                        borderRadius={'10px'}
                        onClick={() => {
                          copyClipboard(
                            collectionId,
                            () => {
                              toaster.create({
                                title: 'Copied to clipboard',
                                type: 'success',
                                duration: 2000,
                              })
                            },
                            () => {
                              toaster.create({
                                title: 'Failed to copy to clipboard',
                                type: 'error',
                                duration: 2000,
                              })
                            },
                          )
                        }}
                        display={'flex'}
                        cursor={'pointer'}
                      >
                        <Icon alignSelf={'center'} mr={'1'}>
                          <FiCopy />
                        </Icon>
                        collection id
                      </Badge>
                    </Tooltip>

                    <Badge
                      colorPalette="blue"
                      fontSize={'1em'}
                      ml={2}
                      mr={2}
                      borderRadius={'10px'}
                    >
                      total embeddings: {rowCount}
                    </Badge>
                    <Spacer />
                    <Badge
                      colorPalette="purple"
                      fontSize={'1em'}
                      ml={2}
                      mr={2}
                      borderRadius={'10px'}
                    >
                      dimensions: {embeddings[0].embedding.length}
                    </Badge>
                  </Flex>
                ) : (
                  <Box>
                    <Skeleton height={'1em'} />
                  </Box>
                )}
                <Box
                  w="full"
                  whiteSpace="normal"
                  data-testid={'data-view-table'}
                >
                  <CKTable.Root size="sm" variant="line">
                    <CKTable.Header>
                      {table.getHeaderGroups().map((headerGroup, hgIndex) => {
                        return (
                          <CKTable.Row
                            key={`header-group-${headerGroup.id}-${hgIndex}`}
                          >
                            {headerGroup.headers.map((header, headerIndex) => {
                              // eslint-disable-next-line
                              const meta: any = header.column.columnDef
                              return (
                                <CKTable.ColumnHeader
                                  key={`header-column-${headerGroup.id}-${header.id}-${headerIndex}`}
                                  // isNumeric={meta?.isNumeric}
                                  // colSpan={header.colSpan}
                                  minW={`${meta?.minSize}px`}
                                >
                                  <Flex
                                    direction="row"
                                    justify="space-between"
                                    gap="0.5rem"
                                  >
                                    <HStack gap="0.5rem" w="full" h="2rem">
                                      <Text fontSize={'2xl'}>
                                        {flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                        )}
                                      </Text>
                                    </HStack>
                                  </Flex>
                                </CKTable.ColumnHeader>
                              )
                            })}
                          </CKTable.Row>
                        )
                      })}
                    </CKTable.Header>
                    {tableLoading ? (
                      <CKTable.Body>
                        <CKTable.Row className={'loading-border-animation'}>
                          {/*<Divider />*/}
                          <CKTable.Cell colSpan={countMaxColumns}>
                            <LoadingDataDisplay />
                          </CKTable.Cell>
                          {/*<Divider />*/}
                        </CKTable.Row>
                      </CKTable.Body>
                    ) : error ? (
                      <CKTable.Body>
                        <CKTable.Row>
                          <CKTable.Cell colSpan={countMaxColumns}>
                            <ErrorDisplay message={error ?? undefined} />
                          </CKTable.Cell>
                        </CKTable.Row>
                      </CKTable.Body>
                    ) : embeddings == null ||
                      embeddings == undefined ||
                      embeddings?.length == 0 ? (
                      <CKTable.Body>
                        <CKTable.Row>
                          <CKTable.Cell colSpan={countMaxColumns}>
                            <NoDataDisplay />
                          </CKTable.Cell>
                        </CKTable.Row>
                      </CKTable.Body>
                    ) : (
                      embeddings &&
                      embeddings?.length > 0 && (
                        <CKTable.Body>
                          {table.getRowModel().rows?.map((row, index) => (
                            <CKTable.Row
                              key={`body-${row.id}-${index}`}
                              _hover={{ shadow: 'md', bg: 'blackAlpha.50' }}
                            >
                              {row.getVisibleCells().map((cell, indexCell) => {
                                return (
                                  <CKTable.Cell
                                    key={`body-cell-${row.id}-${cell.id}-${indexCell}`}
                                    data-testid={cell.id}
                                    whiteSpace="normal"
                                    onClick={() => {
                                      setSelectedCell(
                                        selectedCell === cell.id
                                          ? undefined
                                          : cell.id,
                                      )
                                      setDetailViewContent(
                                        selectedCell === cell.id
                                          ? undefined
                                          : row.getValue(cell.column.id),
                                      )
                                    }}
                                    backgroundColor={
                                      selectedCell === cell.id ? 'blue.200' : ''
                                    }
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                  </CKTable.Cell>
                                )
                              })}
                            </CKTable.Row>
                          ))}
                        </CKTable.Body>
                      )
                    )}
                    <CKTable.Footer>
                      <CKTable.Row>
                        <CKTable.Cell colSpan={countMaxColumns}>
                          <Flex w="full">
                            <HStack>
                              <Button
                                size="sm"
                                onClick={() => {
                                  table.setPageIndex(0)
                                  setPageIndex(0)
                                }}
                                disabled={!table.getCanPreviousPage()}
                              >
                                <ArrowBackIcon />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setPageIndex(pageIndex - 1)}
                                disabled={!table.getCanPreviousPage()}
                                data-testid={'data-view-previous-button'}
                              >
                                <ChevronLeftIcon />
                              </Button>
                              <HStack minW="fit-content" justify="center">
                                <Text>
                                  {`Page ${
                                    table.getState().pagination.pageIndex + 1
                                  } / ${table.getPageCount()}`}
                                </Text>
                              </HStack>
                              <Button
                                size="sm"
                                onClick={() => setPageIndex(pageIndex + 1)}
                                disabled={!table.getCanNextPage()}
                                data-testid={'data-view-next-button'}
                              >
                                <ChevronRightIcon />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  table.setPageIndex(table.getPageCount() - 1)
                                  setPageIndex(table.getPageCount() - 1)
                                }}
                                disabled={!table.getCanNextPage()}
                              >
                                <ArrowForwardIcon />
                              </Button>
                            </HStack>
                            <HStack ml={4}>
                              {/* <Text minW="fit-content">Go To : </Text> */}
                              <NumberInput.Root
                                defaultValue="1"
                                unstyled
                                min={1}
                                max={table.getPageCount()}
                                variant={'flushed'}
                                width={'50%'}
                                allowMouseWheel
                              >
                                <HStack gap="2">
                                  <NumberInput.DecrementTrigger asChild>
                                    <IconButton variant="outline" size="sm">
                                      <LuMinus />
                                    </IconButton>
                                  </NumberInput.DecrementTrigger>
                                  <NumberInput.Input
                                    textAlign="center"
                                    // fontSize="lg"
                                    minW="3ch"
                                    ref={moveToInputRef}
                                  />
                                  <NumberInput.IncrementTrigger asChild>
                                    <IconButton variant="outline" size="sm">
                                      <LuPlus />
                                    </IconButton>
                                  </NumberInput.IncrementTrigger>
                                </HStack>
                              </NumberInput.Root>
                              <Button
                                onClick={() => {
                                  if (!moveToInputRef.current) return

                                  const page = Number(
                                    moveToInputRef.current.value,
                                  )
                                  table.setPageIndex(page - 1)
                                  setPageIndex(page - 1)
                                }}
                              >
                                Go to Page
                              </Button>
                            </HStack>
                            <Spacer />
                            <Flex justify="end">
                              <SelectRoot
                                collection={frameworks}
                                onValueChange={(e) => {
                                  console.log(e)
                                  table.setPageSize(Number(e.value[0]))
                                  setPageSize(Number(e.value[0]))
                                }}
                                // FIXME: string to int
                                // @ts-expect-error pageSize is string
                                defaultValue={[pageSize]}
                              >
                                <SelectLabel>Page Size</SelectLabel>
                                <SelectTrigger>
                                  <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                  {frameworks.items.map((item) => (
                                    <SelectItem key={item.value} item={item}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectRoot>
                            </Flex>
                          </Flex>
                        </CKTable.Cell>
                      </CKTable.Row>
                    </CKTable.Footer>
                  </CKTable.Root>
                </Box>
              </Box>
            </Box>
            {/* bottom box */}
            <Splitter
              {...terminalDragBarProps}
              dir="horizontal"
              isDragging={isTerminalDragging}
            />
            <Box
              className={cn(
                'shrink-0 bg-darker contents',
                isTerminalDragging && 'dragging',
              )}
              style={{ height: terminalH }}
              backgroundColor={'secondBg'}
              overflowY={'auto'}
              pt={2}
              pr={2}
              pl={2}
            >
              <DetailView detailViewContent={detailViewContent} />
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export default React.memo(Collections)

// eslint-disable-next-line
const Splitter = ({ id = 'drag-bar', dir, isDragging, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <Box
      id={id}
      data-testid={id}
      tabIndex={0}
      className={cn(
        'sample-drag-bar',
        dir === 'horizontal' && 'sample-drag-bar--horizontal',
        (isDragging || isFocused) && 'sample-drag-bar--dragging',
      )}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  )
}

const DetailView: React.FC<{
  detailViewContent: EmbeddingsDataValueType | undefined
}> = ({ detailViewContent }) => {
  return match(detailViewContent)
    .with(undefined, () => 'Click on a cell to view details')
    .with(P.string, (content) => (
      <Box data-testid="detail-view-string">
        <IconButton
          variant="outline"
          colorScheme="teal"
          aria-label="copy to clipboard"
          fontSize="20px"
          position={'absolute'}
          right={'2em'}
          marginTop={'0.5em'}
          onClick={() => {
            copyClipboard(
              content,
              () => {
                toaster.create({
                  title: 'Copied to clipboard',
                  type: 'success',
                  duration: 2000,
                })
              },
              () => {
                toaster.create({
                  title: 'Failed to copy to clipboard',
                  type: 'error',
                  duration: 2000,
                })
              },
            )
          }}
        >
          <FiClipboard />
        </IconButton>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{content}</Text>
      </Box>
    ))
    .with(P.array(P.number), (content) => (
      <Box data-testid="detail-view-embedding">
        <IconButton
          variant="outline"
          colorScheme="teal"
          aria-label="copy to clipboard"
          fontSize="20px"
          position={'absolute'}
          right={'2em'}
          marginTop={'0.5em'}
          onClick={() => {
            copyClipboard(
              content.join(','),
              () => {
                toaster.create({
                  title: 'Copied to clipboard',
                  duration: 2000,
                })
              },
              () => {
                toaster.create({
                  title: 'Failed to copy to clipboard',
                  type: 'error',
                  duration: 2000,
                })
              },
            )
          }}
        >
          <FiClipboard />
        </IconButton>
        <SimpleGrid columns={[1, 5, 10]} gap={4}>
          {content.map((value, index) => (
            <Badge key={index} size={'lg'}>
              {value}
            </Badge>
          ))}
        </SimpleGrid>
      </Box>
    ))
    .otherwise((content) => (
      <Box data-testid="detail-view-metadata">
        <JsonEditor data={content} maxWidth={'100%'} />
      </Box>
    ))
}

interface CollectionNavItemProps extends FlexProps {
  children: ReactNode
  name: string
  isFavorite: boolean
  onFavorite: (name: string) => void
  isSelected: boolean
}

const CollectionNavItem = ({
  children,
  name,
  isFavorite,
  onFavorite,
  isSelected,
  ...rest
}: CollectionNavItemProps) => {
  const dispatch = useDispatch()
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection,
  )
  const recipe = useRecipe({ key: 'layoutCollectionNavs' })
  const layoutCollectionNavsStyles = recipe()

  return (
    <Box
      as="a"
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
      onDoubleClick={() => {
        dispatch(updateCollection(name))
        dispatch(updateMenu('Collections'))
      }}
    >
      <Flex
        align="center"
        pt={'4'}
        pb={'4'}
        borderRadius="lg"
        role="group"
        cursor="pointer"
        color="buttonBg"
        background={
          isSelected ? 'var(--chakra-colors-collection-nav-hover-bg)' : ''
        }
        css={layoutCollectionNavsStyles}
        {...rest}
      >
        <Icon
          mr="2"
          fontSize="16"
          _groupHover={
            {
              // color: 'white',
            }
          }
          color={'yellow.500'}
          fill={isFavorite ? 'currentcolor' : 'none'}
          onClick={() => onFavorite(name)}
          // FIXME: use something else
          // @ts-expect-error title no longer exist in prop, but it requires for testing
          title={isFavorite ? `${name}-favorite` : `${name}-not-favorite`}
        >
          <FiStar />
        </Icon>
        {children}
        {currentCollection === name && (
          <Icon ml={'auto'} mr={'1rem'} fontSize="16" color={'green.500'}>
            <FiCheck />
          </Icon>
        )}
      </Flex>
    </Box>
  )
}
