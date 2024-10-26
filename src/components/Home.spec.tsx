import Home from './Home'
import { describe, test, beforeAll, afterEach, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { InvokeArgs } from '@tauri-apps/api/core'
import { TauriCommand } from '../types'
import { match } from 'ts-pattern'
import { Provider } from '@/components/ui/provider'

beforeAll(() => {
})

afterEach(() => {
  clearMocks()
})

describe('Home', () => {
  const chromaVersion = '0.1.0'
  const testCollections = [{ id: '1', name: 'collection1' }]
  const mockCommandHandler = <T, >(
    cmd: string,
    _: InvokeArgs | undefined,
  ): Promise<T> => {
    return match(cmd)
      .with(TauriCommand.GET_CHROMA_VERSION, () =>
        Promise.resolve(chromaVersion as unknown as T),
      )
      .with(TauriCommand.FETCH_COLLECTIONS, () => {
        return Promise.resolve(testCollections as unknown as T)
      })
      .otherwise(() => {
        console.log(cmd)
        return Promise.resolve(true as unknown as T)
      })
  }

  describe('Connection Box', () => {
    test('should render the Connection box', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(<Provider><Home /></Provider>)

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText(testCollections.length)).toBeInTheDocument()
    })
  })

  describe('Version Box', () => {
    test('should render the version box', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(<Provider><Home /></Provider>)

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText(chromaVersion)).toBeInTheDocument()
    })

    test('should render check icon if test connection is successful', async () => {
      const mockCommandHandler = <T, >(
        cmd: string,
        _: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.GET_CHROMA_VERSION, () =>
            Promise.resolve(chromaVersion as unknown as T),
          )
          .with(TauriCommand.FETCH_COLLECTIONS, () => {
            return Promise.resolve(testCollections as unknown as T)
          })
          .with(TauriCommand.HEALTH_CHECK, () => {
            return Promise.resolve(true as unknown as T)
          })
          .otherwise(() => {
            console.log(cmd)
            return Promise.resolve(true as unknown as T)
          })
      }

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(<Provider><Home /></Provider>)

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => expect(mock).toHaveBeenCalled())

      expect(screen.getByTitle('success')).toBeInTheDocument()
    })

    test('should render x icon if test connection is unsuccessful', async () => {
      const mockCommandHandler = <T, >(
        cmd: string,
        _: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.GET_CHROMA_VERSION, () =>
            Promise.resolve(chromaVersion as unknown as T),
          )
          .with(TauriCommand.FETCH_COLLECTIONS, () => {
            return Promise.resolve(testCollections as unknown as T)
          })
          .with(TauriCommand.HEALTH_CHECK, () => {
            return Promise.reject(true as unknown as T)
          })
          .otherwise(() => {
            console.log(cmd)
            return Promise.resolve(true as unknown as T)
          })
      }

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(<Provider><Home /></Provider>)

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => expect(mock).toHaveBeenCalled())

      expect(screen.getByTitle('fail')).toBeInTheDocument()
    })
  })

  describe('Overview Box', () => {
    test('should render the overview box', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(<Provider><Home /></Provider>)

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText(testCollections.length)).toBeInTheDocument()
    })
  })
})
