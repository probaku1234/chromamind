import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import {
  Badge,
  Box,
  Flex,
  FlexProps,
  Icon,
  IconButton,
  Input,
  NumberInput,
  Spacer,
  Table as CKTable,
  Text,
  useDisclosure,
  useRecipe,
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
import { createListCollection } from '@chakra-ui/react'
import { useDispatch, useSelector } from 'react-redux'
import { EmbeddingsData, State } from '../types'
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

import { FiCheck, FiClipboard, FiCopy, FiPlus, FiStar, FiX } from 'react-icons/fi'
import { MiddleTruncate } from '@re-dev/react-truncate'
import { JsonEditor } from 'json-edit-react'
import { match } from 'ts-pattern'
import { copyClipboard } from '../utils/copyToClipboard'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { TauriCommand, LOCAL_STORAGE_KEY_PREFIX, CollectionData } from '../types.ts'
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
import { LuMinus, LuPlus } from 'react-icons/lu'

const DEFAULT_PAGES = [10, 25, 50, 100]
const FAVORITE_COLLECTIONS_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-favorite-collections`
const COLLECTION_NAV_WIDTH = '240px'
const DETAIL_SIDEBAR_WIDTH = '320px'

const frameworks = createListCollection({
  items: DEFAULT_PAGES.map((pageSize) => ({
    value: pageSize,
    label: `${pageSize} rows`,
  })),
})

// ── Not-selected state ────────────────────────────────────────────────────
const ListIcon = () => (
  <svg width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const NotSelectedState = () => (
  <Flex flex={1} direction="column" align="center" justify="center" bg="secondBg" gap={3}>
    <Box color="gray.300"><ListIcon /></Box>
    <Text fontSize="lg" fontWeight="600" color="gray.500">No Collection Selected</Text>
    <Text fontSize="sm" color="gray.400">Choose a collection to get started</Text>
  </Flex>
)

// ── Full Document Modal ───────────────────────────────────────────────────
const FullDocumentModal = ({ doc, onClose }: { doc: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    copyClipboard(doc, () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => {})
  }
  return (
    <DialogRoot open modal onOpenChange={(d) => { if (!d.open) onClose() }}>
      <DialogContent maxW="600px">
        <DialogHeader>
          <DialogTitle>Full Document</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Box
            fontSize="13px"
            color="gray.900"
            lineHeight="1.7"
            bg="gray.50"
            px={4}
            py="14px"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="border"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            fontFamily="'JetBrains Mono', monospace"
          >
            {doc}
          </Box>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogActionTrigger>
          <Button onClick={copy}>
            <Icon><FiCopy /></Icon>
            {copied ? 'Copied!' : 'Copy document'}
          </Button>
        </DialogFooter>
        <DialogCloseTrigger onClick={onClose} />
      </DialogContent>
    </DialogRoot>
  )
}

// ── Detail Sidebar ────────────────────────────────────────────────────────
const DetailSidebar = ({
  row,
  onClose,
  onShowFullDoc,
  fetchAndCacheEmbedding,
}: {
  row: EmbeddingsData
  onClose: () => void
  onShowFullDoc: (doc: string) => void
  fetchAndCacheEmbedding: (id: string) => Promise<number[]>
}) => {
  const [docCopied, setDocCopied] = useState(false)
  const [embeddingVisible, setEmbeddingVisible] = useState(false)
  const [embeddingValues, setEmbeddingValues] = useState<number[] | null>(null)
  const [embeddingLoading, setEmbeddingLoading] = useState(false)
  const [embeddingError, setEmbeddingError] = useState<string | null>(null)

  const copyDoc = () => {
    copyClipboard(
      row.document,
      () => { setDocCopied(true); setTimeout(() => setDocCopied(false), 1500) },
      () => {},
    )
  }

  const truncDoc = row.document.length > 120
    ? row.document.substring(0, 120) + '…'
    : row.document

  return (
    <Box
      w={DETAIL_SIDEBAR_WIDTH}
      flexShrink={0}
      bg="secondBg"
      borderLeft="1px"
      borderColor="border"
      display="flex"
      flexDirection="column"
      h="100%"
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py="14px"
        borderBottom="1px"
        borderColor="border"
        bg="brand.50"
      >
        <Box>
          <Text fontSize="13px" fontWeight="600" color="brand.900">Row Detail</Text>
          <Text
            fontSize="10px"
            color="gray.400"
            fontFamily="'JetBrains Mono', monospace"
            mt="2px"
          >
            {String(row.id).substring(0, 18)}…
          </Text>
        </Box>
        <IconButton
          size="xs"
          variant="ghost"
          aria-label="Close detail"
          onClick={onClose}
        >
          <FiX />
        </IconButton>
      </Flex>

      {/* Scrollable content — embedding first, then details */}
      <Box overflowY="auto" flex={1}>
        {/* Embedding section */}
        <Box px={4} py={3} bg="gray.50" borderBottom="1px" borderColor="border">
          <Flex align="center" justify="space-between" mb={embeddingVisible && embeddingValues ? 2 : 0}>
            <Text
              fontSize="10px"
              fontWeight="600"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Embedding vector
            </Text>
            <button
              data-testid="embedding-toggle-btn"
              disabled={embeddingLoading}
              onClick={async () => {
                if (embeddingVisible) {
                  setEmbeddingVisible(false)
                  return
                }
                if (embeddingValues !== null) {
                  setEmbeddingVisible(true)
                  return
                }
                setEmbeddingLoading(true)
                setEmbeddingError(null)
                try {
                  const vec = await fetchAndCacheEmbedding(row.id)
                  setEmbeddingValues(vec)
                  setEmbeddingVisible(true)
                } catch (e) {
                  setEmbeddingError(String(e))
                } finally {
                  setEmbeddingLoading(false)
                }
              }}
              style={{
                fontSize: 10,
                color: 'var(--chakra-colors-brand-600)',
                background: 'none',
                border: 'none',
                cursor: embeddingLoading ? 'default' : 'pointer',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {embeddingLoading ? 'Loading…' : embeddingVisible ? 'Hide' : 'Show'}
            </button>
          </Flex>
          {embeddingError && (
            <Text fontSize="11px" color="red.500" mt={1}>{embeddingError}</Text>
          )}
          {embeddingVisible && embeddingValues && (
            <Box data-testid="detail-view-embedding" display="flex" flexWrap="wrap" gap="5px">
              {embeddingValues.slice(0, 4).map((v, i) => (
                <Box
                  key={i}
                  as="span"
                  bg="brand.50"
                  color="brand.700"
                  px="7px"
                  py="2px"
                  borderRadius="5px"
                  fontSize="11px"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {v.toFixed(4)}
                </Box>
              ))}
              {embeddingValues.length > 4 && (
                <Text fontSize="11px" color="gray.400" alignSelf="center">
                  …{embeddingValues.length - 4} dims total
                </Text>
              )}
              <Box mt={1} w="100%">
                <button
                  onClick={() => {
                    copyClipboard(
                      JSON.stringify(embeddingValues),
                      () => toaster.create({ title: 'Copied full vector', type: 'success', duration: 2000 }),
                      () => toaster.create({ title: 'Failed to copy', type: 'error', duration: 2000 }),
                    )
                  }}
                  style={{
                    fontSize: 10,
                    color: 'var(--chakra-colors-brand-600)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Copy full vector
                </button>
              </Box>
            </Box>
          )}
        </Box>

        {/* ID, Document, Metadata */}
        <Box px={4} py="14px">
        {/* ID */}
        <Box mb={4}>
          <Text
            fontSize="10px"
            fontWeight="600"
            color="gray.400"
            textTransform="uppercase"
            letterSpacing="wide"
            mb="5px"
          >
            ID
          </Text>
          <Box
            fontSize="11px"
            fontFamily="'JetBrains Mono', monospace"
            color="gray.900"
            bg="brand.50"
            px="9px"
            py="6px"
            borderRadius="md"
            wordBreak="break-all"
          >
            {row.id}
          </Box>
        </Box>

        {/* Document */}
        <Box mb={4}>
          <Flex align="center" justify="space-between" mb="5px">
            <Text
              fontSize="10px"
              fontWeight="600"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Document
            </Text>
            <Flex gap="5px" align="center">
              <button
                onClick={() => onShowFullDoc(row.document)}
                style={{
                  fontSize: 10,
                  color: 'var(--chakra-colors-brand-600)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                View full
              </button>
              <Text fontSize="10px" color="gray.300">|</Text>
              <button
                onClick={copyDoc}
                style={{
                  fontSize: 10,
                  color: docCopied
                    ? 'var(--chakra-colors-green-500)'
                    : 'var(--chakra-colors-brand-600)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {docCopied ? 'Copied' : 'Copy'}
              </button>
            </Flex>
          </Flex>
          <Box
            data-testid="detail-view-string"
            fontSize="12px"
            color="gray.900"
            lineHeight="1.65"
            bg="gray.50"
            px="10px"
            py="8px"
            borderRadius="md"
            borderWidth="1px"
            borderColor="border"
          >
            {truncDoc}
            {row.document.length > 120 && (
              <Box
                as="button"
                display="block"
                mt="6px"
                fontSize="11px"
                color="brand.600"
                bg="none"
                border="none"
                cursor="pointer"
                fontWeight="500"
                onClick={() => onShowFullDoc(row.document)}
              >
                Show full document →
              </Box>
            )}
          </Box>
        </Box>

        {/* Metadata */}
        <Box>
          <Text
            fontSize="10px"
            fontWeight="600"
            color="gray.400"
            textTransform="uppercase"
            letterSpacing="wide"
            mb={2}
          >
            Metadata
          </Text>
          <Box data-testid="detail-view-metadata">
            {typeof row.metadata === 'object' && row.metadata !== null
              ? Object.entries(row.metadata).map(([k, v]) => (
                  <Flex
                    key={k}
                    justify="space-between"
                    alignItems="flex-start"
                    py="7px"
                    borderBottom="1px"
                    borderColor="gray.100"
                  >
                    <Text fontSize="11px" fontWeight="600" color="brand.700" flexShrink={0} mr={2}>
                      {k}
                    </Text>
                    <Text
                      fontSize="11px"
                      color="gray.900"
                      fontFamily="'JetBrains Mono', monospace"
                      textAlign="right"
                      wordBreak="break-all"
                    >
                      {String(v)}
                    </Text>
                  </Flex>
                ))
              : <JsonEditor data={row.metadata} maxWidth="100%" />
            }
          </Box>
        </Box>
      </Box>
      </Box>

      {/* Footer actions */}
      <Flex px="14px" py="10px" borderTop="1px" borderColor="border" gap={2}>
        <Button
          variant="outline"
          size="sm"
          flex={1}
          justifyContent="center"
          onClick={() => {
            copyClipboard(
              row.id,
              () => toaster.create({ title: 'Copied to clipboard', type: 'success', duration: 2000 }),
              () => toaster.create({ title: 'Failed to copy', type: 'error', duration: 2000 }),
            )
          }}
        >
          <Icon><FiClipboard /></Icon> Copy ID
        </Button>
        <Button
          variant="ghost"
          size="sm"
          flex={1}
          justifyContent="center"
          onClick={async () => {
            try {
              const embedding = await fetchAndCacheEmbedding(row.id)
              copyClipboard(
                JSON.stringify({ ...row, embedding }),
                () => toaster.create({ title: 'Copied to clipboard', type: 'success', duration: 2000 }),
                () => toaster.create({ title: 'Failed to copy', type: 'error', duration: 2000 }),
              )
            } catch {
              toaster.create({ title: 'Failed to fetch embedding', type: 'error', duration: 2000 })
            }
          }}
        >
          <Icon><FiCopy /></Icon> Copy JSON
        </Button>
      </Flex>
    </Box>
  )
}

// ── Collections ───────────────────────────────────────────────────────────
const Collections: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const url = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`) || ''
  const currentCollection = useSelector<State, string>((state: State) => state.currentCollection)
  const [embeddings, setEmbeddings] = useState<EmbeddingsData[]>([])
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [collectionDimension, setCollectionDimension] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGES[0])
  const [rowCount, setRowCount] = useState<number | undefined>()
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [embeddingCache, setEmbeddingCache] = useState<Map<string, number[]>>(new Map())
  const [fullDoc, setFullDoc] = useState<string | null>(null)
  const [demoState, setDemoState] = useState<'loaded' | 'empty' | 'error' | null>(null)
  const { open, onOpen, onClose } = useDisclosure()
  const {
    open: openCreateCollection,
    onOpen: onOpenCreateCollection,
    onClose: onCloseCreateCollection,
  } = useDisclosure()
  const currentContextCollection = useRef('')
  const [collections, setCollections] = useState<{ id: string; name: string; isFavorite: boolean }[]>([])
  const [collectionFilter, setCollectionFilter] = useState('')
  const [favoriteCollections, setFavoriteCollections] = useLocalStorage<string[]>(
    `${FAVORITE_COLLECTIONS_KEY}:${url}`,
    [],
  )
  const [selectedCollectionIds, setSelectedCollections] = useState<string[]>([])
  const navRef = useRef<HTMLDivElement>(null)
  const moveToInputRef = useRef<HTMLInputElement>(null)
  const dispatch = useDispatch()
  const columnHelper = useMemo(() => createColumnHelper<EmbeddingsData>(), [])

  const selectedRow = selectedRowId !== null
    ? embeddings.find((e) => e.id === selectedRowId) ?? null
    : null

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        footer: (info) => info.column.id,
      }),
      columnHelper.accessor('document', {
        cell: (info) => <MiddleTruncate end={0}>{info.getValue()}</MiddleTruncate>,
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
    autoResetPageIndex: false,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination: { pageIndex, pageSize },
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    rowCount,
  })

  const countMaxColumns = useMemo(
    () => Math.max(...table.getHeaderGroups().map((hg) => hg.headers.length)),
    [table],
  )

  async function fetchCollections() {
    const result = await invokeWrapper<{ id: string; name: string }[]>(TauriCommand.FETCH_COLLECTIONS)
    match(result)
      .with({ type: 'error' }, ({ error }) => { console.error(error) })
      .with({ type: 'success' }, ({ result }) => {
        setCollections(result.map((c) => ({ ...c, isFavorite: false })))
      })
      .exhaustive()
  }

  const onFavoriteCollection = (name: string) => {
    if (favoriteCollections.includes(name)) {
      setFavoriteCollections(favoriteCollections.filter((c) => c !== name))
    } else {
      setFavoriteCollections([...favoriteCollections, name])
    }
  }

  const deleteCollection = async (collectionName: string) => {
    const names = selectedCollectionIds.map(
      (id) => collections.find((value) => value.id === id)?.name,
    )
    if (names.includes(undefined)) {
      console.error('Collection not found', selectedCollectionIds, names)
      toaster.create({ title: 'Failed to delete collection', type: 'error', duration: 2000 })
      throw new Error('Collection not found')
    }
    const result = await invokeWrapper<void>(TauriCommand.DELETE_COLLECTION, {
      collectionNames:
        selectedCollectionIds.length > 0
          ? selectedCollectionIds.map((id) => collections.find((v) => v.id === id)?.name)
          : [collectionName],
    })
    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        toaster.create({ title: 'Failed to delete collection', type: 'error', duration: 2000 })
      })
      .with({ type: 'success' }, async () => {
        dispatch(updateCollection(''))
        const message =
          selectedCollectionIds.length > 0
            ? `${selectedCollectionIds.length} collections deleted`
            : `Collection ${collectionName} deleted`
        toaster.create({ title: message, type: 'success', duration: 2000 })
        await fetchCollections()
      })
      .exhaustive()
    setSelectedCollections([])
  }

  useEffect(() => { fetchCollections() }, [])

  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!currentCollection) return
      setError(undefined)
      const result = await invokeWrapper<CollectionData>(TauriCommand.FETCH_COLLECTION_DATA, {
        collectionName: currentCollection,
      })
      match(result)
        .with({ type: 'error' }, ({ error }) => { console.error(error); setError(error) })
        .with({ type: 'success' }, ({ result }) => {
          setCollectionId(result.id)
          setCollectionDimension(result.dimension ?? null)
        })
        .exhaustive()
    }
    fetchCollectionData()
  }, [currentCollection])

  useEffect(() => {
    const fetchRowCount = async () => {
      if (!currentCollection) return
      setLoading(true)
      const result = await invokeWrapper<number>(TauriCommand.FETCH_ROW_COUNT, {
        collectionName: currentCollection,
      })
      match(result)
        .with({ type: 'error' }, ({ error }) => { console.error(error); setError(error) })
        .with({ type: 'success' }, ({ result }) => { setRowCount(result) })
        .exhaustive()
      setLoading(false)
    }
    fetchRowCount()
  }, [pageSize, currentCollection])

  const fetchEmbeddings = async () => {
    if (!currentCollection) return
    setTableLoading(true)
    setError(undefined)
    const result = await invokeWrapper<EmbeddingsData[]>(TauriCommand.FETCH_EMBEDDINGS, {
      collectionName: currentCollection,
      limit: pageSize,
      offset: pageIndex,
    })
    match(result)
      .with({ type: 'error' }, ({ error }) => { console.error(error); setError(error) })
      .with({ type: 'success' }, ({ result }) => { setEmbeddings(result) })
      .exhaustive()
    setTableLoading(false)
  }

  useEffect(() => {
    setEmbeddingCache(new Map())
    setSelectedRowId(null)
    setCollectionDimension(null)
  }, [currentCollection])

  useEffect(() => {
    fetchEmbeddings()
  }, [pageIndex, pageSize, currentCollection])

  const fetchAndCacheEmbedding = useCallback(
    async (id: string): Promise<number[]> => {
      if (embeddingCache.has(id)) {
        return embeddingCache.get(id)!
      }
      const result = await invokeWrapper<number[]>(TauriCommand.FETCH_EMBEDDING, {
        collectionName: currentCollection,
        id,
      })
      if (result.type === 'error') throw new Error(result.error)
      const vec = result.result
      setEmbeddingCache((prev) => new Map(prev).set(id, vec))
      return vec
    },
    [embeddingCache, currentCollection],
  )

  return (
    <Box display="flex" h="100vh" overflow="hidden" style={style}>
      <Toaster />

      {/* ── Left: Collection list panel ─────────────────────────────── */}
      <Box
        w={COLLECTION_NAV_WIDTH}
        flexShrink={0}
        bg="secondBg"
        display="flex"
        flexDirection="column"
        h="100%"
        overflow="hidden"
      >
        {/* Panel header */}
        <Box px={3} pt="14px" pb="10px" borderBottom="1px" borderColor="border" ref={navRef}>
          <Text
            fontSize="11px"
            fontWeight="600"
            color="gray.400"
            textTransform="uppercase"
            letterSpacing="wide"
            mb="10px"
          >
            Collections
          </Text>
          <Flex gap="6px" align="center">
            <Input
              type="text"
              size="sm"
              borderRadius="8px"
              placeholder="collection name"
              height="2rem"
              px="0.4rem"
              flex={1}
              onChange={(e) => setCollectionFilter(e.target.value)}
            />
            <CreateCollectionDialog
              open={openCreateCollection}
              onClose={onCloseCreateCollection}
              fetchCollections={fetchCollections}
            />
            <Tooltip content="New Collection">
              <IconButton
                size="xs"
                borderRadius="6px"
                bg="brand.600"
                color="white"
                _hover={{ bg: 'brand.500' }}
                cursor="pointer"
                onClick={onOpenCreateCollection}
                title="Create Collection"
                aria-label="Create Collection"
              >
                <FiPlus />
              </IconButton>
            </Tooltip>
            <Tooltip content="Refresh Collections">
              <IconButton
                size="xs"
                borderRadius="6px"
                borderWidth="1px"
                borderColor="border"
                bg="white"
                color="gray.600"
                _hover={{ bg: 'gray.50' }}
                cursor="pointer"
                onClick={fetchCollections}
                aria-label="Refresh Collections"
              >
                <RepeatIcon />
              </IconButton>
            </Tooltip>
            <GuidePopup
              title="Collection Navigation"
              messages={[
                'Click to select collection',
                'Double click to activate collection',
                'Right click to open context menu',
                'Star icon toggles favorite',
                'You can delete multiple collections at once',
              ]}
            />
          </Flex>
        </Box>

        {/* Collection list */}
        <Box overflowY="auto" flex={1}>
          <MenuRoot>
            {collections
              .map((c) => ({ ...c, isFavorite: favoriteCollections.includes(c.name) }))
              .filter((c) => c.name.includes(collectionFilter))
              .sort((a, b) => (a.isFavorite ? -1 : 0) - (b.isFavorite ? -1 : 0))
              .map((collection) => (
                <MenuContextTrigger
                  asChild
                  key={collection.id}
                  onContextMenu={() => { currentContextCollection.current = collection.name }}
                  onClick={() => {
                    setSelectedCollections((prev) =>
                      prev.includes(collection.id)
                        ? prev.filter((id) => id !== collection.id)
                        : [...prev, collection.id],
                    )
                  }}
                >
                  <CollectionNavItem
                    name={collection.name}
                    isFavorite={collection.isFavorite}
                    onFavorite={onFavoriteCollection}
                    isSelected={selectedCollectionIds.includes(collection.id)}
                  >
                    <Text truncate fontSize="12px" title={collection.name}>{collection.name}</Text>
                  </CollectionNavItem>
                </MenuContextTrigger>
              ))}
            {collections.length > 0 &&
              collections.filter((c) => c.name.includes(collectionFilter)).length === 0 && (
                <Box px={3} py={8} textAlign="center">
                  <Text fontSize="12px" color="gray.400">No collections match your filter</Text>
                </Box>
              )}
            <MenuContent>
              <MenuItem value="info" onClick={onOpen}>
                Collection Info
              </MenuItem>
              <DialogRoot role="alertdialog">
                <DialogTrigger asChild>
                  <MenuItem value="delete" color="fg.error" _hover={{ bg: 'bg.error', color: 'fg.error' }}>
                    Delete Collection
                  </MenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                  </DialogHeader>
                  <DialogBody>
                    <p>This action cannot be undone. This will permanently delete the collection.</p>
                  </DialogBody>
                  <DialogFooter>
                    <DialogActionTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogActionTrigger>
                    <DialogActionTrigger asChild>
                      <Button
                        buttonType="critical"
                        onClick={() => deleteCollection(currentContextCollection.current)}
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

        {currentContextCollection.current && (
          <CollectionDialog
            isOpen={open}
            onOpen={onOpen}
            onClose={onClose}
            role="info"
            collectionName={currentContextCollection.current}
          />
        )}
      </Box>

      {/* ── Center: Main content ────────────────────────────────────── */}
      {demoState === 'empty' ? (
        <Box flex={1} h="100%"><NoDataDisplay /></Box>
      ) : demoState === 'error' ? (
        <Box flex={1} h="100%"><ErrorDisplay message="Demo error: something went wrong" /></Box>
      ) : currentCollection === '' && !loading ? (
        <NotSelectedState />
      ) : loading ? (
        <Box flex={1} h="100%"><LoadingDataDisplay /></Box>
      ) : error && !demoState ? (
        <Box flex={1} h="100%"><ErrorDisplay message={error} onRetry={fetchEmbeddings} /></Box>
      ) : embeddings.length === 0 && tableLoading ? (
        <Box flex={1} h="100%"><LoadingDataDisplay /></Box>
      ) : embeddings.length === 0 ? (
        <Box flex={1} h="100%"><NoDataDisplay /></Box>
      ) : (
        <Box flex={1} overflow="hidden" display="flex" flexDirection="column" bg="secondBg">
          {/* Badges header */}
          <Flex align="center" gap={2} px="14px" py="10px" borderBottom="1px" borderColor="border" flexShrink={0}>
            {collectionId ? (
              <>
                <Tooltip content={collectionId}>
                  <Badge
                    colorPalette="green"
                    fontSize="12px"
                    borderRadius="md"
                    px={2}
                    py="2px"
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap={1}
                    onClick={() => {
                      copyClipboard(
                        collectionId,
                        () => toaster.create({ title: 'Copied to clipboard', type: 'success', duration: 2000 }),
                        () => toaster.create({ title: 'Failed to copy', type: 'error', duration: 2000 }),
                      )
                    }}
                  >
                    <Icon><FiCopy /></Icon> collection id
                  </Badge>
                </Tooltip>
                <Badge colorPalette="blue" fontSize="12px" borderRadius="md" px={2} py="2px">
                  total embeddings: {rowCount}
                </Badge>
                {collectionDimension !== null && (
                  <Badge colorPalette="purple" fontSize="12px" borderRadius="md" px={2} py="2px">
                    dimensions: {collectionDimension}
                  </Badge>
                )}
              </>
            ) : null}
            <Spacer />

          </Flex>

          {/* Table */}
          <Box flex={1} overflowY="auto">
            <Box w="full" whiteSpace="normal" data-testid="data-view-table">
              <CKTable.Root size="sm" variant="line">
                <CKTable.Header>
                  {table.getHeaderGroups().map((headerGroup, hgIndex) => (
                    <CKTable.Row key={`header-group-${headerGroup.id}-${hgIndex}`}>
                      {headerGroup.headers.map((header, headerIndex) => {
                        // eslint-disable-next-line
                        const meta: any = header.column.columnDef
                        return (
                          <CKTable.ColumnHeader
                            key={`header-column-${headerGroup.id}-${header.id}-${headerIndex}`}
                            minW={`${meta?.minSize}px`}
                            bg="secondBg"
                            position="sticky"
                            top={0}
                            zIndex={1}
                            borderBottom="2px"
                            borderColor="border"
                          >
                            <Text fontSize="13px" fontWeight="600" color="gray.900" py={1}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </Text>
                          </CKTable.ColumnHeader>
                        )
                      })}
                    </CKTable.Row>
                  ))}
                </CKTable.Header>
                {tableLoading ? (
                  <CKTable.Body>
                    <CKTable.Row className="loading-border-animation">
                      <CKTable.Cell colSpan={countMaxColumns}>
                        <LoadingDataDisplay />
                      </CKTable.Cell>
                    </CKTable.Row>
                  </CKTable.Body>
                ) : error ? (
                  <CKTable.Body>
                    <CKTable.Row>
                      <CKTable.Cell colSpan={countMaxColumns}>
                        <ErrorDisplay message={error} onRetry={fetchEmbeddings} />
                      </CKTable.Cell>
                    </CKTable.Row>
                  </CKTable.Body>
                ) : embeddings.length === 0 ? (
                  <CKTable.Body>
                    <CKTable.Row>
                      <CKTable.Cell colSpan={countMaxColumns}>
                        <NoDataDisplay />
                      </CKTable.Cell>
                    </CKTable.Row>
                  </CKTable.Body>
                ) : (
                  <CKTable.Body>
                    {table.getRowModel().rows?.map((row, index) => {
                      const isSelected = selectedRowId === row.original.id
                      return (
                        <CKTable.Row
                          key={`body-${row.id}-${index}`}
                          cursor="pointer"
                          bg={
                            isSelected
                              ? 'brand.50'
                              : index % 2 === 0
                              ? 'secondBg'
                              : 'gray.50'
                          }
                          borderLeft={isSelected ? '3px solid var(--chakra-colors-brand-600)' : '3px solid transparent'}
                          transition="background 0.1s"
                          _hover={{ bg: isSelected ? 'brand.50' : 'gray.100' }}
                        >
                          {row.getVisibleCells().map((cell, indexCell) => (
                            <CKTable.Cell
                              key={`body-cell-${row.id}-${cell.id}-${indexCell}`}
                              data-testid={cell.id}
                              whiteSpace="normal"
                              fontSize="12px"
                              color={isSelected ? 'brand.800' : 'gray.700'}
                              fontFamily={
                                cell.column.id === 'id' || cell.column.id === 'embedding'
                                  ? "'JetBrains Mono', monospace"
                                  : undefined
                              }
                              onClick={() => {
                                setSelectedRowId(row.original.id)
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </CKTable.Cell>
                          ))}
                        </CKTable.Row>
                      )
                    })}
                  </CKTable.Body>
                )}
                <CKTable.Footer>
                  <CKTable.Row>
                    <CKTable.Cell colSpan={countMaxColumns}>
                      <Flex w="full" align="center">
                        <Flex gap={1} align="center">
                          <Button
                            size="sm"
                            onClick={() => { table.setPageIndex(0); setPageIndex(0) }}
                            disabled={!table.getCanPreviousPage()}
                          >
                            <ArrowBackIcon />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setPageIndex(pageIndex - 1)}
                            disabled={!table.getCanPreviousPage()}
                            data-testid="data-view-previous-button"
                          >
                            <ChevronLeftIcon />
                          </Button>
                          <Text fontSize="12px" color="gray.600" mx={2} whiteSpace="nowrap">
                            {`Page ${table.getState().pagination.pageIndex + 1} / ${table.getPageCount()}`}
                          </Text>
                          <Button
                            size="sm"
                            onClick={() => setPageIndex(pageIndex + 1)}
                            disabled={!table.getCanNextPage()}
                            data-testid="data-view-next-button"
                          >
                            <ChevronRightIcon />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { table.setPageIndex(table.getPageCount() - 1); setPageIndex(table.getPageCount() - 1) }}
                            disabled={!table.getCanNextPage()}
                          >
                            <ArrowForwardIcon />
                          </Button>
                        </Flex>
                        <Flex align="center" gap={2} ml={4}>
                          <NumberInput.Root
                            defaultValue="1"
                            unstyled
                            min={1}
                            max={table.getPageCount()}
                            variant="flushed"
                            width="50%"
                            allowMouseWheel
                          >
                            <Flex align="center" gap={2}>
                              <NumberInput.DecrementTrigger asChild>
                                <IconButton variant="outline" size="sm"><LuMinus /></IconButton>
                              </NumberInput.DecrementTrigger>
                              <NumberInput.Input
                                textAlign="center"
                                minW="3ch"
                                ref={moveToInputRef}
                              />
                              <NumberInput.IncrementTrigger asChild>
                                <IconButton variant="outline" size="sm"><LuPlus /></IconButton>
                              </NumberInput.IncrementTrigger>
                            </Flex>
                          </NumberInput.Root>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!moveToInputRef.current) return
                              const page = Number(moveToInputRef.current.value)
                              table.setPageIndex(page - 1)
                              setPageIndex(page - 1)
                            }}
                          >
                            Go to Page
                          </Button>
                        </Flex>
                        <Spacer />
                        <SelectRoot
                          collection={frameworks}
                          onValueChange={(e) => {
                            table.setPageSize(Number(e.value[0]))
                            setPageSize(Number(e.value[0]))
                          }}
                          // @ts-expect-error pageSize is string
                          defaultValue={[pageSize]}
                        >
                          <SelectLabel fontSize="12px" color="gray.400">Page Size</SelectLabel>
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
                    </CKTable.Cell>
                  </CKTable.Row>
                </CKTable.Footer>
              </CKTable.Root>
            </Box>
          </Box>

          {/* Bottom hint when no row selected */}
          {!selectedRowId && (
            <Box
              px={4}
              py="8px"
              borderTop="1px"
              borderColor="border"
              bg="gray.50"
              flexShrink={0}
            >
              <Text fontSize="12px" color="gray.400">Click on a cell to view details</Text>
            </Box>
          )}
        </Box>
      )}

      {/* ── Right: Detail sidebar ───────────────────────────────────── */}
      {selectedRow && (
        <DetailSidebar
          row={selectedRow}
          onClose={() => setSelectedRowId(null)}
          onShowFullDoc={(doc) => setFullDoc(doc)}
          fetchAndCacheEmbedding={fetchAndCacheEmbedding}
        />
      )}

      {/* Full document modal */}
      {fullDoc && <FullDocumentModal doc={fullDoc} onClose={() => setFullDoc(null)} />}

      {/* ── Dev: Demo state controls ────────────────────────────────── */}
      {import.meta.env.DEV && (
        <Flex
          position="fixed"
          bottom={4}
          right={4}
          align="center"
          gap="6px"
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="lg"
          px={3}
          py="7px"
          boxShadow="sm"
          zIndex={1000}
        >
          <Text fontSize="10px" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="wide" mr={1}>
            Demo State
          </Text>
          {(['loaded', 'empty', 'error'] as const).map((state) => (
            <Box
              key={state}
              as="button"
              px="10px"
              py="3px"
              borderRadius="md"
              fontSize="12px"
              fontWeight="500"
              cursor="pointer"
              border="1px solid"
              borderColor={demoState === state ? 'brand.600' : 'gray.200'}
              bg={demoState === state ? 'brand.600' : 'white'}
              color={demoState === state ? 'white' : 'gray.600'}
              _hover={{ borderColor: 'brand.400', color: demoState === state ? 'white' : 'brand.600' }}
              transition="all 0.12s"
              onClick={() => setDemoState(demoState === state ? null : state)}
            >
              {state}
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  )
}

export default React.memo(Collections)

// ── Collection Nav Item ───────────────────────────────────────────────────
interface CollectionNavItemProps extends FlexProps {
  children: React.ReactNode
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
  const currentCollection = useSelector<State, string>((state: State) => state.currentCollection)
  const isActive = currentCollection === name
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
        px={3}
        py="9px"
        cursor="pointer"
        role="group"
        bg={isActive ? 'brand.50' : isSelected ? 'gray.50' : 'transparent'}
        borderLeft={isActive ? '3px solid var(--chakra-colors-brand-600)' : '3px solid transparent'}
        transition="all 0.12s"
        _hover={{ bg: isActive ? 'brand.50' : 'gray.50' }}
        css={layoutCollectionNavsStyles}
        {...rest}
      >
        <Icon
          mr={2}
          fontSize="14px"
          color="yellow.500"
          fill={isFavorite ? 'currentcolor' : 'none'}
          flexShrink={0}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(name)
          }}
          // @ts-expect-error title no longer exist in prop, but it requires for testing
          title={isFavorite ? `${name}-favorite` : `${name}-not-favorite`}
        >
          <FiStar />
        </Icon>
        {children}
        {isActive && (
          <Icon ml="auto" mr="4px" fontSize="12px" color="green.500" flexShrink={0}>
            <FiCheck />
          </Icon>
        )}
      </Flex>
    </Box>
  )
}
