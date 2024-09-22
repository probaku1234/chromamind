import { CurrentMenuState } from "./slices/currentMenuSlice";

export interface State {
  currentMenu: CurrentMenuState;
  currentCollection: string;
}

export interface EmbeddingsData {
  id: string;
  metadata: Record<string, string>;
  document: string;
  embedding: number[];
}