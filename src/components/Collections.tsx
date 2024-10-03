import React, { useEffect, useMemo, useState } from 'react'
import {
  Table as CKTable,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tfoot,
  HStack,
  Button,
  Select,
  Text,
  Input,
  Spacer,
  Flex,
  TableContainer,
  Icon,
  // Checkbox,
  // Divider,
  Heading,
  IconButton,
  // Menu,
  // MenuButton,
  // MenuItem,
  // MenuList,
  // VStack,
  // UseDisclosureReturn,
  // useDisclosure,
  Box,
  Spinner,
  Badge,
  Skeleton,
  SimpleGrid,
  // CheckboxGroup,
  // Tooltip,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import {
  CollectionData,
  EmbeddingsData,
  EmbeddingsDataValueType,
  Metadata,
  State,
} from '../types'
import { invoke } from '@tauri-apps/api/core'
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  // ColumnDef,
  SortingState,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  ColumnFiltersState,
  // Table as RETable,
  // Column,
  getFilteredRowModel,
  VisibilityState,
  // Row,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  ArrowBackIcon,
  ArrowForwardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  // HamburgerIcon,
  // Search2Icon,
  // SearchIcon,
  // TriangleDownIcon,
  // TriangleUpIcon,
  WarningTwoIcon,
} from '@chakra-ui/icons'
import {
  // GoFilter,
  GoInbox,
  // GoLinkExternal,
  // GoTasklist
} from 'react-icons/go'
import { FiClipboard } from 'react-icons/fi'
// import { FaFileCsv, FaPrint, FaRegFilePdf, FaTrash } from 'react-icons/fa6'
import { useResizable } from 'react-resizable-layout'
import { cn } from '../utils/cn'
import '../styles/collection.css'
import { embeddingToString } from '../utils/embeddingToString'
import { MiddleTruncate } from '@re-dev/react-truncate'
import { JsonEditor } from 'json-edit-react'
import { match, P } from 'ts-pattern'
import { copyClipboard } from '../utils/copyToClipboard'

const DEFAULT_PAGES = [10, 25, 50, 100]
const TERMINAL_HEIGHT_KEY = 'chromamaind-terminal-height'

const Collections: React.FC = () => {
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection,
  )
  const [embeddings, setEmbeddings] = React.useState<EmbeddingsData[]>([])
  const [collectionId, setCollectionId] = React.useState<string | null>(null)
  const [metadata, setMetadata] = React.useState<Metadata>({})
  const [loading, setLoading] = React.useState(true)
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
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

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
      try {
        console.log('fetching collection data')
        const collectionData: CollectionData = await invoke(
          'fetch_collection_data',
          {
            collectionName: currentCollection,
          },
        )
        // console.log('collection data', collectionData)
        setCollectionId(collectionData.id)
        setMetadata(collectionData.metadata)
      } catch (error) {
        console.error(error)
      }
    }

    fetchCollectionData()
  }, [currentCollection])

  // fetch total row count
  useEffect(() => {
    const fetchRowCount = async () => {
      try {
        console.log('fetching row count')
        const rowCount: number = await invoke('fetch_row_count', {
          collectionName: currentCollection,
          limit: pageSize,
          offset: pageIndex,
        })
        setRowCount(rowCount)
      } catch (error) {
        console.error(error)
        setError(error as string)
      }
    }

    fetchRowCount()
  }, [pageSize, currentCollection])

  // fetch embeddings
  useEffect(() => {
    const fetchEmbeddings = async () => {
      console.log('fetching embeddings')
      try {
        setLoading(true)

        const embeddings: EmbeddingsData[] = await invoke('fetch_embeddings', {
          collectionName: currentCollection,
          limit: pageSize,
          offset: pageIndex,
        })

        console.log(embeddings)
        setEmbeddings(embeddings)
      } catch (error) {
        console.error(error)
        setError(error as string)
      } finally {
        setLoading(false)
      }
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
                  {/* TODO: click copy value */}
                  <Badge
                    colorScheme="green"
                    fontSize={'1em'}
                    ml={2}
                    mr={2}
                    borderRadius={'10px'}
                    onClick={() => {
                      copyClipboard(
                        collectionId,
                        () => {
                          toast({
                            title: 'Copied to clipboard',
                            status: 'success',
                            duration: 2000,
                            isClosable: true,
                          })
                        },
                        () => {
                          toast({
                            title: 'Failed to copy to clipboard',
                            status: 'error',
                            duration: 2000,
                            isClosable: true,
                          })
                        },
                      )
                    }}
                  >
                    collection id: {collectionId}
                  </Badge>
                  {/* TODO: click show json value  react-json-view*/}
                  <CollectionMetadataModal
                    isOpen={isOpen}
                    onOpen={onOpen}
                    onClose={onClose}
                    metadata={metadata}
                  />
                  <Badge
                    colorScheme="teal"
                    fontSize={'1em'}
                    ml={2}
                    mr={2}
                    borderRadius={'10px'}
                    onClick={onOpen}
                  >
                    Metadata
                  </Badge>
                  <Badge
                    colorScheme="blue"
                    fontSize={'1em'}
                    ml={2}
                    mr={2}
                    borderRadius={'10px'}
                  >
                    total embeddings: {rowCount}
                  </Badge>
                  <Spacer />
                  <Badge
                    colorScheme="purple"
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
              <TableContainer w="full" whiteSpace="normal">
                <CKTable size="sm" variant="striped">
                  <Thead>
                    {table.getHeaderGroups().map((headerGroup, hgIndex) => {
                      return (
                        <Tr key={`header-group-${headerGroup.id}-${hgIndex}`}>
                          {headerGroup.headers.map((header, headerIndex) => {
                            // eslint-disable-next-line
                            const meta: any = header.column.columnDef
                            return (
                              <Th
                                key={`header-column-${headerGroup.id}-${header.id}-${headerIndex}`}
                                isNumeric={meta?.isNumeric}
                                colSpan={header.colSpan}
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
                              </Th>
                            )
                          })}
                        </Tr>
                      )
                    })}
                  </Thead>
                  {loading ? (
                    <Tbody>
                      <Tr>
                        <Td colSpan={countMaxColumns}>
                          <LoadingDataDisplay />
                        </Td>
                      </Tr>
                    </Tbody>
                  ) : error ? (
                    <Tbody>
                      <Tr>
                        <Td colSpan={countMaxColumns}>
                          <ErrorDisplay message={error ?? undefined} />
                        </Td>
                      </Tr>
                    </Tbody>
                  ) : embeddings == null ||
                    embeddings == undefined ||
                    embeddings?.length == 0 ? (
                    <Tbody>
                      <Tr>
                        <Td colSpan={countMaxColumns}>
                          <NoDataDisplay />
                        </Td>
                      </Tr>
                    </Tbody>
                  ) : (
                    embeddings &&
                    embeddings?.length > 0 && (
                      <Tbody>
                        {table.getRowModel().rows?.map((row, index) => (
                          <Tr
                            key={`body-${row.id}-${index}`}
                            _hover={{ shadow: 'md', bg: 'blackAlpha.50' }}
                          >
                            {row.getVisibleCells().map((cell, indexCell) => {
                              return (
                                <Td
                                  key={`body-cell-${row.id}-${cell.id}-${indexCell}`}
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
                                </Td>
                              )
                            })}
                          </Tr>
                        ))}
                      </Tbody>
                    )
                  )}
                  <Tfoot>
                    <Tr>
                      <Td colSpan={countMaxColumns}>
                        <Flex w="full">
                          <HStack>
                            <Button
                              size="sm"
                              onClick={() => {
                                table.setPageIndex(0)
                                setPageIndex(0)
                              }}
                              isDisabled={!table.getCanPreviousPage()}
                            >
                              <ArrowBackIcon />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setPageIndex(pageIndex - 1)}
                              isDisabled={!table.getCanPreviousPage()}
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
                              isDisabled={!table.getCanNextPage()}
                            >
                              <ChevronRightIcon />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                table.setPageIndex(table.getPageCount() - 1)
                                setPageIndex(table.getPageCount() - 1)
                              }}
                              isDisabled={!table.getCanNextPage()}
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
                            <Select
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
                            </Select>
                          </Flex>
                        </Flex>
                      </Td>
                    </Tr>
                  </Tfoot>
                </CKTable>
              </TableContainer>
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
      <Icon as={GoInbox} boxSize="150px" mb={3} color="gray.400" />
      <Heading>Collection is empty</Heading>
      <Text fontSize={'2xl'} textColor={'gray.500'}>
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
        thickness="0.25rem"
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
      <Icon as={WarningTwoIcon} boxSize="150px" mb={3} color="red.500" />
      <Heading>{message ?? DEFAULT_ERROR_MESSAGE}</Heading>
    </Flex>
  )
}

const DetailView: React.FC<{
  detailViewContent: EmbeddingsDataValueType | undefined
}> = ({ detailViewContent }) => {
  const toast = useToast()

  return match(detailViewContent)
    .with(undefined, () => 'Click on a cell to view details')
    .with(P.string, (content) => (
      <Box>
        <IconButton
          variant="outline"
          colorScheme="teal"
          aria-label="copy to clipboard"
          fontSize="20px"
          icon={<FiClipboard />}
          position={'absolute'}
          right={'2em'}
          marginTop={'0.5em'}
          onClick={() => {
            copyClipboard(
              content,
              () => {
                toast({
                  title: 'Copied to clipboard',
                  status: 'success',
                  duration: 2000,
                  isClosable: true,
                })
              },
              () => {
                toast({
                  title: 'Failed to copy to clipboard',
                  status: 'error',
                  duration: 2000,
                  isClosable: true,
                })
              },
            )
          }}
        />
        <Text style={{ whiteSpace: 'pre-wrap' }}>{content}</Text>
      </Box>
    ))
    .with(P.array(P.number), (content) => (
      <Box>
        <IconButton
          variant="outline"
          colorScheme="teal"
          aria-label="copy to clipboard"
          fontSize="20px"
          icon={<FiClipboard />}
          position={'absolute'}
          right={'2em'}
          marginTop={'0.5em'}
          onClick={() => {
            copyClipboard(
              content.join(','),
              () => {
                toast({
                  title: 'Copied to clipboard',
                  status: 'success',
                  duration: 2000,
                  isClosable: true,
                })
              },
              () => {
                toast({
                  title: 'Failed to copy to clipboard',
                  status: 'error',
                  duration: 2000,
                  isClosable: true,
                })
              },
            )
          }}
        />
        <SimpleGrid columns={[1, 5, 10]} spacing={10}>
          {content.map((value, index) => (
            <Text key={index}>{value},</Text>
          ))}
        </SimpleGrid>
      </Box>
    ))
    .otherwise((content) => (
      <Box>
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
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Collection Metadata</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <JsonEditor data={metadata} />
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost">Secondary Action</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
