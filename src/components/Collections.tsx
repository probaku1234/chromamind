import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  // Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  SimpleGrid,
  Skeleton,
  Spacer,
  Spinner,
  Table as CKTable,
  useDisclosure,
  Text,
  Stack,
  Fieldset,
  FlexProps,
  useRecipe,
  FieldHelperText,
  Textarea,
} from '@chakra-ui/react'
import { Field } from '@/components/ui/field'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  // DialogTitle,
  // DialogTrigger,
  DialogBackdrop,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Metadata,
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
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  RepeatIcon,
  WarningTwoIcon,
} from '@chakra-ui/icons'
import { EmptyState } from '@/components/ui/empty-state'
import { GoInbox } from 'react-icons/go'
import {
  FiCheck,
  FiClipboard,
  FiCopy,
  FiPlusCircle,
  FiStar,
} from 'react-icons/fi'
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
  const [metadata, setMetadata] = React.useState<Metadata>({})
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
  const [collections, setCollections] = useState<
    { id: number; name: string; isFavorite: boolean }[]
  >([])
  const [collectionFilter, setCollectionFilter] = useState('')
  const [favoriteCollections, setFavoriteCollections] = useLocalStorage<
    string[]
  >(`${FAVORITE_COLLECTIONS_KEY}:${url}`, [])
  const navRef = useRef<HTMLDivElement>(null)

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
    const result = await invokeWrapper<{ id: number; name: string }[]>(
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
          setMetadata(result.metadata)
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
          <Box pl="4" mt="2" width={COLLECTION_NAV_WIDTH}>
            <Stack
              direction={'row'}
              justifyContent={'center'}
              alignItems={'center'}
              mt={1}
              mr={4}
              ref={navRef}
            >
              <Input
                type="text"
                size={'sm'}
                borderRadius={'15px'}
                placeholder="collection name"
                onChange={(e) => setCollectionFilter(e.target.value)}
              />
              <CreateCollectionDialog
                open={openCreateCollection}
                onClose={onCloseCreateCollection}
              />
              <Icon
                boxSize={5}
                cursor={'pointer'}
                className="clickable-icon"
                onClick={onOpenCreateCollection}
                // FIXME: use something else
                // @ts-expect-error title no longer exist in prop, but it requires for testing
                title={'Create Collection'}
              >
                <FiPlusCircle />
              </Icon>
              <Icon
                boxSize={5}
                cursor={'pointer'}
                className="clickable-icon"
                onClick={fetchCollections}
              >
                <RepeatIcon />
              </Icon>
            </Stack>

            <Box
              overflowY={'scroll'}
              style={{
                maxHeight: `calc(100vh - ${navRef.current?.clientHeight}px - 16px)`,
              }}
              mt={2}
            >
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
                  <CollectionNavItem
                    key={collection.id}
                    name={collection.name}
                    isFavorite={collection.isFavorite}
                    onFavorite={onFavoriteCollection}
                  >
                    <Tooltip
                      content={`${collection.name}`}
                      aria-label="A tooltip"
                    >
                      <Text truncate>{collection.name}</Text>
                    </Tooltip>
                  </CollectionNavItem>
                ))}
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
            <Box className={'flex grow'} overflowY={'auto'}>
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
                      >
                        <Icon alignSelf={'center'} mr={'1'}>
                          <FiCopy />
                        </Icon>
                        collection id
                      </Badge>
                    </Tooltip>

                    <CollectionMetadataModal
                      isOpen={open}
                      onOpen={onOpen}
                      onClose={onClose}
                      metadata={metadata}
                    />
                    <Badge
                      colorPalette="teal"
                      fontSize={'1em'}
                      ml={2}
                      mr={2}
                      borderRadius={'10px'}
                      onClick={onOpen}
                      data-testid="collection-metadata-badge"
                    >
                      Metadata
                    </Badge>
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
                  <Toaster />
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
                              <Text minW="fit-content">Go To : </Text>
                              <Input
                                type="number"
                                defaultValue={pageIndex + 1}
                                onChange={(e) => {
                                  const page = e.target.value
                                    ? Number(e.target.value) - 1
                                    : 0

                                  if (
                                    page < 0 ||
                                    page >= table.getPageCount()
                                  ) {
                                    e.target.value = String(page)
                                    return
                                  }

                                  table.setPageIndex(page)
                                  setPageIndex(page)
                                  table.getPageCount()
                                }}
                                size="sm"
                              />
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

const NoDataDisplay = () => {
  return (
    <Flex
      direction="column"
      p={4}
      align="center"
      justify="center"
      bgColor="gray.100"
      height={'100vh'}
    >
      <Icon boxSize="150px" mb={3} color="gray.400">
        <GoInbox />
      </Icon>
      <Heading>Collection is empty</Heading>
      <Text fontSize={'2xl'} color={'gray.500'}>
        Upload more documents
      </Text>
    </Flex>
  )
}

const LoadingDataDisplay = () => {
  return (
    <Flex
      direction="column"
      p={4}
      align="center"
      justify="center"
      bgColor="gray.100"
      height={'100%'}
    >
      <Spinner
        size="xl"
        boxSize="70px"
        // thickness="0.25rem"
        mb={3}
        color="gray.400"
      />
      <Text>Fetching Embeddings</Text>
    </Flex>
  )
}

const ErrorDisplay = ({ message }: { message: string }) => {
  const DEFAULT_ERROR_MESSAGE = 'Error'

  return (
    <Flex
      direction="column"
      p={4}
      align="center"
      justify="center"
      bgColor="gray.100"
      height={'100%'}
    >
      <Icon boxSize="150px" mb={3} color="red.500">
        <WarningTwoIcon />
      </Icon>
      <Heading>{message ?? DEFAULT_ERROR_MESSAGE}</Heading>
    </Flex>
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
        <SimpleGrid columns={[1, 5, 10]} gap={10}>
          {content.map((value, index) => (
            <Text key={index}>{value},</Text>
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

const CollectionMetadataModal = ({
  isOpen,
  onClose,
  metadata,
}: {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  metadata: Metadata
}) => {
  return (
    <>
      <DialogRoot open={isOpen}>
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader>Collection Metadata</DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            <JsonEditor data={metadata} />
          </DialogBody>

          <DialogFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost">Secondary Action</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}

interface CollectionNavItemProps extends FlexProps {
  children: ReactNode
  name: string
  isFavorite: boolean
  onFavorite: (name: string) => void
}

const CollectionNavItem = ({
  children,
  name,
  isFavorite,
  onFavorite,
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
        mr={'4'}
        borderRadius="lg"
        role="group"
        cursor="pointer"
        color="buttonBg"
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
          <Icon ml="4" fontSize="16" color={'green.500'}>
            <FiCheck />
          </Icon>
        )}
      </Flex>
    </Box>
  )
}

const CreateCollectionDialog = ({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
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
    <>
      <DialogRoot
        open={open}
        modal
        closeOnEscape
        unmountOnExit
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
                                • starts and ends with an alphanumeric
                                character, otherwise contains only alphanumeric
                                characters, underscores or hyphens
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
    </>
  )
}
