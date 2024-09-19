import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const currentCollectionSlice = createSlice({
    name: 'currentCollection',
    initialState: '',
    reducers: {
      updateCollection: (state, action: PayloadAction<string>) => {
        state = action.payload;
  
        return state;
      }
    },
  });
  
  export const { updateCollection } = currentCollectionSlice.actions;
  export default currentCollectionSlice.reducer;