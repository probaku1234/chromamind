import { describe, test, beforeAll, afterEach, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import MainPage from './MainPage'
import renderWithProvider from './utils/renderWithProvider'
import { InvokeArgs } from '@tauri-apps/api/core'

afterEach(() => {
  clearMocks()
})

describe('MainPage', () => {
  test('should render the MainPage component', async () => {
    const mockCommandHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      if (cmd === 'get_chroma_version') {
        return Promise.resolve('0.1.0' as unknown as T) // casting string to T
      } else {
        return Promise.resolve('unknown command' as unknown as T) // casting string to T
      }
    }

    mockIPC(mockCommandHandler)

    renderWithProvider(<MainPage />, {
      initialState: {
        currentMenu: 'Home',
        currentCollection: 'test',
      },
    })

    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('should render the correct component based on the currentMenu state', async () => {
    renderWithProvider(<MainPage />, {
      initialState: {
        currentMenu: 'Settings',
        currentCollection: 'test',
      },
    })

    expect(screen.getByText('Reset Chroma')).toBeInTheDocument()
  })

  // FIXME: This test is not working as expected
  // test('should render the correct component when currentMenu state changed', async () => {
  //   const mockCommandHandler = <T,>(
  //     cmd: string,
  //     _: InvokeArgs | undefined,
  //   ): Promise<T> => {
  //     if (cmd === 'get_chroma_version') {
  //       return Promise.resolve('0.1.0' as unknown as T) // casting string to T
  //     } else {
  //       return Promise.resolve('unknown command' as unknown as T) // casting string to T
  //     }
  //   }

  //   mockIPC(mockCommandHandler)

  //   // @ts-ignore
  //   // const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

  //   renderWithProvider(<MainPage />, {
  //     initialState: {
  //       currentMenu: 'Settings',
  //       currentCollection: 'test',
  //     },
  //   })

  //   screen.debug(screen.getAllByRole('group')[0])
  //   fireEvent(
  //     screen.getByTestId('nav-item-Home'),
  //     new MouseEvent('click', {
  //       bubbles: true,
  //       cancelable: true,
  //     }),
  //   )
  //   // await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
  //   //   timeout: 5000,
  //   // })
  //   const box = await screen.findByTestId('home-main-box')
  //   expect(box).toBeInTheDocument()

  //   // screen.debug(screen.getByText('Chroma Version: 0.1.0'), 5000)
  // })
})
