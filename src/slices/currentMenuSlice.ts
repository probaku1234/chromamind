import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type CurrentMenuState = 'Home' | 'Collections' | 'Settings'

const currentMenuSlice = createSlice({
  name: 'currentMenu',
  initialState: 'Home',
  reducers: {
    updateMenu: (state, action: PayloadAction<CurrentMenuState>) => {
      state = action.payload

      return state
    },
  },
})

export const { updateMenu } = currentMenuSlice.actions
export default currentMenuSlice.reducer
