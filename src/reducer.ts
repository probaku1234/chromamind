import { combineReducers } from 'redux';
import currentMenuReducer from './slices/currentMenuSlice';

const rootReducer = combineReducers({
  currentMenu: currentMenuReducer,
});

export default rootReducer;