import React, { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { render, RenderOptions } from '@testing-library/react';
import configureMockStore from 'redux-mock-store';
import { Store } from 'redux';

const mockStore = configureMockStore();

interface RenderWithProviderOptions extends Omit<RenderOptions, 'queries'> {
  initialState?: any;
  store?: Store;
}

const renderWithProvider = (
  ui: ReactElement,
  {
    initialState,
    store = mockStore(initialState),
    ...renderOptions
  }: RenderWithProviderOptions = {}
) => {
  const Wrapper: React.FC = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export default renderWithProvider;