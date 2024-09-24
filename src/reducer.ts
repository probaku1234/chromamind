import { combineReducers } from 'redux'
import currentMenuReducer from './slices/currentMenuSlice'
import currentCollectionReducer from './slices/currentCollectionSlice'

const rootReducer = combineReducers({
  currentMenu: currentMenuReducer,
  currentCollection: currentCollectionReducer,
})

export default rootReducer
