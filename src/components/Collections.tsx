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
  // IconButton,
  // Menu,
  // MenuButton,
  // MenuItem,
  // MenuList,
  // VStack,
  // UseDisclosureReturn,
  // useDisclosure,
  Box,
  Spinner,
  // CheckboxGroup,
  // Tooltip,
} from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { EmbeddingsData, State } from '../types'
import { invoke } from '@tauri-apps/api/core'
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  // ColumnDef,
  SortingState,
  getSortedRowModel,
  getPaginationRowModel,
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
// import { FaFileCsv, FaPrint, FaRegFilePdf, FaTrash } from 'react-icons/fa6'
import { useResizable } from 'react-resizable-layout'
import { cn } from '../utils/cn'
import '../styles/collection.css'
import { embeddingToString } from '../utils/embeddingToString'
import { MiddleTruncate } from '@re-dev/react-truncate'

const DEFAULT_PAGES = [10, 25, 50, 100]

const Collections: React.FC = () => {
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection,
  )
  const [embeddings, setEmbeddings] = React.useState<EmbeddingsData[]>([])
  const [loading, setLoading] = React.useState(true)
  const {
    isDragging: isTerminalDragging,
    position: terminalH,
    separatorProps: terminalDragBarProps,
  } = useResizable({
    axis: 'y',
    initial: 10,
    min: 30,
    reverse: true,
  })
  const [error, setError] = useState<string | undefined>()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columnHelper = createColumnHelper<EmbeddingsData>()

  const columns = [
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
  ]

  const table = useReactTable({
    columns,
    data: embeddings || [],
    initialState: { pagination: { pageSize: DEFAULT_PAGES[0] } },
    autoResetPageIndex: false,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    // sorting
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    // pagination
    getPaginationRowModel: getPaginationRowModel(),
    // column visible
    onColumnVisibilityChange: setColumnVisibility,
    // column filter
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  })

  const countMaxColumns = useMemo(() => {
    return Math.max(
      ...table.getHeaderGroups().map((headerGroup) => {
        return headerGroup.headers.length
      }),
    )
  }, [table])

  useEffect(() => {
    const fetchEmbeddings = async () => {
      console.log('fetching embeddings')
      // Fetch embeddings
      try {
        setLoading(true)

        const embeddings: EmbeddingsData[] = await invoke('fetch_embeddings', {
          collection: currentCollection,
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
  }, [currentCollection])

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
          <Box className={'flex grow'}>
            <Box width={'100%'}>
              <Flex>
                <Box>collection id</Box>
                <Box>dimensions: {embeddings[0].embedding.length}</Box>
              </Flex>
              <TableContainer w="full" whiteSpace="normal">
                <CKTable size="sm" variant="striped">
                  <Thead>
                    {table.getHeaderGroups().map((headerGroup, hgIndex) => {
                      return (
                        <Tr key={`header-group-${headerGroup.id}-${hgIndex}`}>
                          {headerGroup.headers.map((header, headerIndex) => {
                            // eslint-disable-next-line
                            const meta: any = header.column.columnDef
                            console.log('meta', meta)
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
                              onClick={() => table.setPageIndex(0)}
                              isDisabled={!table.getCanPreviousPage()}
                            >
                              <ArrowBackIcon />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => table.previousPage()}
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
                              onClick={() => table.nextPage()}
                              isDisabled={!table.getCanNextPage()}
                            >
                              <ChevronRightIcon />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                table.setPageIndex(table.getPageCount() - 1)
                              }
                              isDisabled={!table.getCanNextPage()}
                            >
                              <ArrowForwardIcon />
                            </Button>
                          </HStack>
                          <HStack ml={4}>
                            <Text minW="fit-content">Go To : </Text>
                            <Input
                              type="number"
                              defaultValue={
                                table.getState().pagination.pageIndex + 1
                              }
                              onChange={(e) => {
                                const page = e.target.value
                                  ? Number(e.target.value) - 1
                                  : 0
                                table.setPageIndex(page)
                              }}
                              size="sm"
                            />
                          </HStack>
                          <Spacer />
                          <Flex justify="end">
                            <Select
                              minW="fit-content"
                              value={table.getState().pagination.pageSize}
                              size="sm"
                              onChange={(e) => {
                                table.setPageSize(Number(e.target.value))
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
          >
            Placeholder
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default Collections

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
