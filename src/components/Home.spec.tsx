import Home from './Home'
import { describe, test, beforeAll, afterEach, beforeEach, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { InvokeArgs } from '@tauri-apps/api/core'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from '../types'
import { match } from 'ts-pattern'
import { Provider } from '@/components/ui/provider'

beforeAll(() => {})

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  clearMocks()
  localStorage.clear()
})

describe('Home', () => {
  const chromaVersion = '0.1.0'
  const testCollections = [{ id: '1', name: 'collection1' }]
  const mockCommandHandler = <T,>(
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

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText(testCollections.length)).toBeInTheDocument()
    })
  })

  describe('Version Box', () => {
    test('should render the version box', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      const versionBox = await screen.findByText(chromaVersion)
      expect(versionBox).toBeInTheDocument()
    })

    test('should render check icon if test connection is successful', async () => {
      const mockCommandHandler = <T,>(
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

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))

      fireEvent.click(screen.getByText('Test Connection'))

      await waitFor(() => expect(mock).toHaveBeenCalled())

      expect(screen.getByTitle('success')).toBeInTheDocument()
    })

    test('should render x icon if test connection is unsuccessful', async () => {
      const mockCommandHandler = <T,>(
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

      render(
        <Provider>
          <Home />
        </Provider>,
      )

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

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText(testCollections.length)).toBeInTheDocument()
    })
  })

  describe('Skeleton loading states', () => {
    test('should show skeletons before data loads', () => {
      // Use a never-resolving promise so data never arrives
      mockIPC(<T,>(_cmd: string, _: InvokeArgs | undefined): Promise<T> =>
        new Promise(() => {}),
      )

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      // Assert the loading state via stable UI: labels render, but async values do not yet.
      expect(screen.getByText('Collections')).toBeInTheDocument()
      expect(screen.getByText('Version')).toBeInTheDocument()
      expect(screen.queryByText(chromaVersion)).not.toBeInTheDocument()
      expect(screen.queryByText(String(testCollections.length))).not.toBeInTheDocument()
    })
  })

  describe('Refresh button', () => {
    test('should re-fetch data when Refresh is clicked', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      // Wait for initial 2 calls (GET_CHROMA_VERSION + FETCH_COLLECTIONS)
      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))

      fireEvent.click(screen.getByText('Refresh'))

      // After refresh another 2 calls should be made (total 4)
      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4))
      expect(screen.getByText(chromaVersion)).toBeInTheDocument()
      expect(screen.getByText(testCollections.length)).toBeInTheDocument()
    })
  })

  describe('Connection info from localStorage', () => {
    test('should display URL from localStorage', async () => {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`, 'http://localhost:8000')
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText('http://localhost:8000')).toBeInTheDocument()
    })

    test('should display tenant and database when set in localStorage', async () => {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`, 'my-tenant')
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`, 'my-database')
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.getByText('my-tenant')).toBeInTheDocument()
      expect(screen.getByText('my-database')).toBeInTheDocument()
    })

    test('should not display tenant or database when not set in localStorage', async () => {
      // localStorage is cleared in beforeEach
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      expect(screen.queryByText('my-tenant')).not.toBeInTheDocument()
      expect(screen.queryByText('my-database')).not.toBeInTheDocument()
    })
  })

  describe('Error states', () => {
    test('should keep skeletons visible when GET_CHROMA_VERSION fails', async () => {
      const errorHandler = <T,>(cmd: string, _: InvokeArgs | undefined): Promise<T> =>
        match(cmd)
          .with(TauriCommand.GET_CHROMA_VERSION, () => Promise.reject('version error' as unknown as T))
          .with(TauriCommand.FETCH_COLLECTIONS, () =>
            Promise.resolve(testCollections as unknown as T),
          )
          .otherwise(() => Promise.resolve(true as unknown as T))

      mockIPC(errorHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      // Version text should NOT appear when the command failed
      expect(screen.queryByText(chromaVersion)).not.toBeInTheDocument()
    })

    test('should keep collections skeleton visible when FETCH_COLLECTIONS fails', async () => {
      const errorHandler = <T,>(cmd: string, _: InvokeArgs | undefined): Promise<T> =>
        match(cmd)
          .with(TauriCommand.GET_CHROMA_VERSION, () =>
            Promise.resolve(chromaVersion as unknown as T),
          )
          .with(TauriCommand.FETCH_COLLECTIONS, () => Promise.reject('fetch error' as unknown as T))
          .otherwise(() => Promise.resolve(true as unknown as T))

      mockIPC(errorHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))
      // Collections count text should NOT appear when the command failed
      expect(screen.queryByText(testCollections.length)).not.toBeInTheDocument()
    })
  })

  describe('Test Connection button states', () => {
    test('should show "Testing…" and be disabled while health check is in progress', async () => {
      let resolveHealthCheck!: (value: boolean) => void
      const slowHandler = <T,>(cmd: string, _: InvokeArgs | undefined): Promise<T> =>
        match(cmd)
          .with(TauriCommand.GET_CHROMA_VERSION, () =>
            Promise.resolve(chromaVersion as unknown as T),
          )
          .with(TauriCommand.FETCH_COLLECTIONS, () =>
            Promise.resolve(testCollections as unknown as T),
          )
          .with(TauriCommand.HEALTH_CHECK, () =>
            new Promise<T>((resolve) => {
              resolveHealthCheck = (v) => resolve(v as unknown as T)
            }),
          )
          .otherwise(() => Promise.resolve(true as unknown as T))

      mockIPC(slowHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      render(
        <Provider>
          <Home />
        </Provider>,
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(2))

      fireEvent.click(screen.getByText('Test Connection'))

      // While in-flight the button label changes and becomes disabled
      await waitFor(() => expect(screen.getByText('Testing…')).toBeInTheDocument())
      expect(screen.getByText('Testing…')).toBeDisabled()

      // Resolve the health check so the component finishes
      resolveHealthCheck(true)
      await waitFor(() => expect(screen.getByText('Test Connection')).toBeInTheDocument())
    })
  })
})
