import { CurrentMenuState } from './slices/currentMenuSlice'

export interface State {
  currentMenu: CurrentMenuState
  currentCollection: string
}

export interface EmbeddingsData {
  id: string
  metadata: Record<string, string | number | boolean>
  document: string
  embedding: number[]
}

export type Metadata = {
  [key: string]: string | number | boolean
}

export type CollectionData = {
  id: string
  metadata: Metadata
}

export type EmbeddingsDataValueType = EmbeddingsData[keyof EmbeddingsData]

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
}

export const LOCAL_STORAGE_KEY_PREFIX = 'chromamind'