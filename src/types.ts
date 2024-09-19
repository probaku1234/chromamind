import { CurrentMenuState } from "./slices/currentMenuSlice";

export interface State {
  currentMenu: CurrentMenuState;
  currentCollection: string;
}
