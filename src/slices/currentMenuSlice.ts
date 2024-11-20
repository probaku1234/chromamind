import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LOCAL_STORAGE_KEY_PREFIX } from '@/types'
export type CurrentMenuState = 'Home' | 'Collections' | 'Settings'

const currentMenuKey = `${LOCAL_STORAGE_KEY_PREFIX}-currentMenu`

const currentMenuSlice = createSlice({
  name: 'currentMenu',
  initialState:
    sessionStorage.getItem(currentMenuKey) ?? 'Home',
  reducers: {
    updateMenu: (state, action: PayloadAction<CurrentMenuState>) => {
      state = action.payload
      sessionStorage.setItem(currentMenuKey, state)
      return state
    },
  },
})

export const { updateMenu } = currentMenuSlice.actions
export default currentMenuSlice.reducer
