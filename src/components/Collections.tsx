import React, { useEffect, useMemo, useState } from 'react'
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
} from '@chakra-ui/react'
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
import {Button} from '@/components/ui/button'
import { createListCollection } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
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
  ChevronLeftIcon,
  ChevronRightIcon,
  WarningTwoIcon,
} from '@chakra-ui/icons'
import { GoInbox } from 'react-icons/go'
import { FiClipboard, FiCopy } from 'react-icons/fi'
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

const DEFAULT_PAGES = [10, 25, 50, 100]
const TERMINAL_HEIGHT_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-terminal-height`

const frameworks = createListCollection({
  items: DEFAULT_PAGES.map((pageSize) => ({
    value: pageSize,
    label: `${pageSize} rows`,
  })),
})

const Collections: React.FC = () => {
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection,
  )
  const [embeddings, setEmbeddings] = React.useState<EmbeddingsData[]>([])
  const [collectionId, setCollectionId] = React.useState<string | null>(null)
  const [metadata, setMetadata] = React.useState<Metadata>({})
  const [loading, setLoading] = React.useState(true)
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

  // fetch collection data
  useEffect(() => {
    const fetchCollectionData = async () => {
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
      {loading ? (
        <Box height={'100vh'}>
          <LoadingDataDisplay />
        </Box>
      ) : error ? (
        <Box height={'100vh'}>
          <ErrorDisplay message={error} />
        </Box>
      ) : embeddings.length === 0 ? (
        <NoDataDisplay />
      ) : (
        <Box
          className={
            'flex flex-column h-screen bg-dark font-mono color-white overflow-hidden'
          }
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
              <Box w="full" whiteSpace="normal" data-testid={'data-view-table'}>
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
                                    <Text>
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
                                table.setPageIndex(page)
                                setPageIndex(page)
                              }}
                              size="sm"
                            />
                          </HStack>
                          <Spacer />
                          <Flex justify="end">
                            {/* <Select
                              minW="fit-content"
                              value={pageSize}
                              size="sm"
                              onChange={(e) => {
                                table.setPageSize(Number(e.target.value))
                                setPageSize(Number(e.target.value))
                              }}
                            >
                              {DEFAULT_PAGES.map((pageSize, index) => (
                                <option key={`page-${index}`} value={pageSize}>
                                  Show {pageSize} rows
                                </option>
                              ))}
                            </Select> */}
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
            backgroundColor={'whitesmoke'}
            overflowY={'auto'}
          >
            <DetailView detailViewContent={detailViewContent} />
          </Box>
        </Box>
      )}
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
