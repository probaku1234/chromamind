import React, { ReactElement, ReactNode } from 'react'
import { Provider } from 'react-redux'
import { render, RenderOptions } from '@testing-library/react'
import configureMockStore from 'redux-mock-store'
import { Store } from 'redux'
import { State } from '../types'

const mockStore = configureMockStore()

interface RenderWithProviderOptions extends Omit<RenderOptions, 'queries'> {
  initialState?: State
  store?: Store
}

interface RenderWithProviderProps {
  children: ReactNode
}
const renderWithProvider = (
  ui: ReactElement,
  {
    initialState,
    store = mockStore(initialState),
    ...renderOptions
  }: RenderWithProviderOptions = {},
) => {
  const Wrapper: React.FC<RenderWithProviderProps> = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export default renderWithProvider
