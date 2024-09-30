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
