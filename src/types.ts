import { CurrentMenuState } from './slices/currentMenuSlice'

export interface State {
  currentMenu: CurrentMenuState
  currentCollection: string
}

export interface EmbeddingsData {
  id: string
  metadata: Record<string, string | number | boolean>
  document: string
}

export type Metadata = {
  [key: string]: string | number | boolean
}

export type CollectionData = {
  id: string
  metadata: Metadata
  configuration: Record<string, never>
  dimension?: number
}

export type EmbeddingsDataValueType = EmbeddingsData[keyof EmbeddingsData]

// ---------------------------------------------------------------------------
// Record search / metadata filtering
// ---------------------------------------------------------------------------

export type SearchMode = 'text' | 'id' | 'metadata'

export type MetadataValueType = 'string' | 'number' | 'boolean'

// Scalar comparison operators supported by ChromaDB's `where` filter.
export type MetadataOperator = '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte'

export interface MetadataCondition {
  field: string
  operator: MetadataOperator
  value: string
  type: MetadataValueType
}

// Human-readable labels for the operator dropdown.
export const OPERATOR_LABELS: Record<MetadataOperator, string> = {
  $eq: 'equals',
  $ne: 'not equals',
  $gt: 'greater than',
  $gte: 'greater than or equal to',
  $lt: 'less than',
  $lte: 'less than or equal to',
}

// Which operators are valid for each value type. Ordering comparisons only
// make sense for numbers (mirrors the ChromaDB Cloud filter UI).
export const OPERATORS_BY_TYPE: Record<MetadataValueType, MetadataOperator[]> =
  {
    string: ['$eq', '$ne'],
    boolean: ['$eq', '$ne'],
    number: ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte'],
  }

// The active, submitted search passed to the backend fetch commands.
export interface ActiveSearch {
  ids?: string[]
  whereFilter?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Record metadata editing
// ---------------------------------------------------------------------------

// One row of the metadata editor. `value` is always held as text while editing
// and coerced to `type` on save; `id` keeps React keys stable across renames.
export interface MetadataEditRow {
  id: string
  key: string
  value: string
  type: MetadataValueType
}

export enum TauriCommand {
  GREAT = 'great',
  CREATE_CLIENT = 'create_client',
  HEALTH_CHECK = 'health_check',
  CREATE_WINDOW = 'create_window',
  GET_CHROMA_VERSION = 'get_chroma_version',
  RESET_CHROMA = 'reset_chroma',
  FETCH_EMBEDDINGS = 'fetch_embeddings',
  FETCH_COLLECTION_DATA = 'fetch_collection_data',
  FETCH_ROW_COUNT = 'fetch_row_count',
  FETCH_COLLECTIONS = 'fetch_collections',
  CHECK_TENANT_AND_DATABASE = 'check_tenant_and_database',
  CREATE_COLLECTION = 'create_collection',
  DELETE_COLLECTION = 'delete_collection',
  FETCH_EMBEDDING = 'fetch_embedding',
  UPDATE_RECORD_METADATA = 'update_record_metadata',
}

export const LOCAL_STORAGE_KEY_PREFIX = 'chromamind'
export const CUSTOM_THEME_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-custom-theme`
export const CUSTOM_THEME_PREVIEW_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-custom-theme-preview`
export const GUIDE_POPUP_KEY_PREFIX = `${LOCAL_STORAGE_KEY_PREFIX}-guide-popup`
