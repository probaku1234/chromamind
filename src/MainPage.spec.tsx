import { describe, test, afterEach, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import MainPage from './MainPage'
import renderWithProvider from './utils/renderWithProvider'
import { InvokeArgs } from '@tauri-apps/api/core'
import { Provider as ChakraProvider } from '@/components/ui/provider'
import { Provider } from 'react-redux'
import { match } from 'ts-pattern'
import store from './store'

afterEach(() => {
  clearMocks()
})

describe('MainPage', () => {
  test('should render the MainPage component', async () => {
    const mockCommandHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with('get_chroma_version', () =>
          Promise.resolve('0.1.0' as unknown as T),
        )
        .with('fetch_collections', () => Promise.resolve([] as unknown as T))
        .otherwise(() => Promise.resolve('unknown command' as unknown as T))
    }

    mockIPC(mockCommandHandler)

    renderWithProvider(
      <ChakraProvider>
        <MainPage />{' '}
      </ChakraProvider>,
      {
        initialState: {
          currentMenu: 'Home',
          currentCollection: 'test',
        },
      },
    )

    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('should render the correct component based on the currentMenu state', async () => {
    renderWithProvider(
      <ChakraProvider>
        <MainPage />{' '}
      </ChakraProvider>,
      {
        initialState: {
          currentMenu: 'Settings',
          currentCollection: 'test',
        },
      },
    )

    expect(screen.getByText('Reset Chroma')).toBeInTheDocument()
  })

  test('should render the correct component when currentMenu state changed', async () => {
    const mockCommandHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with('get_chroma_version', () =>
          Promise.resolve('0.1.0' as unknown as T),
        )
        .with('fetch_collections', () => Promise.resolve([] as unknown as T))
        .otherwise(() => Promise.resolve('unknown command' as unknown as T))
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    render(
      <ChakraProvider>
        <Provider store={store}>
          <MainPage />
        </Provider>
        ,
      </ChakraProvider>,
    )

    fireEvent(
      screen.getByText('Settings'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    )
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(2), {
      timeout: 5000,
    })

    const box = await screen.findByText('Reset Chroma')
    expect(box).toBeInTheDocument()
  })
})
