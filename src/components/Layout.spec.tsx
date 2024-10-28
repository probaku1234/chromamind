import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from '../types.ts'
import renderWithProvider from '../utils/renderWithProvider'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { match } from 'ts-pattern'
import { InvokeArgs } from '@tauri-apps/api/core'
import { Provider } from '@/components/ui/provider'
import Layout from './Layout.tsx'

afterEach(() => {
  clearMocks()
})

describe('Layout', () => {
  const testCollections = [
    {
      id: '1',
      name: 'Collection 1',
    },
    {
      id: '2',
      name: 'Collection 2',
    },
  ]
  const testWindowTitle = 'chromamaind-test-window'
  const MOCK_FAVORITE_COLLECTIONS_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-favorite-collections:${testWindowTitle}`

  afterAll(() => {
    localStorage.removeItem(MOCK_FAVORITE_COLLECTIONS_KEY)
  })

  const mockCommandHandler = <T,>(
    cmd: string,
    _: InvokeArgs | undefined,
  ): Promise<T> => {
    return match(cmd)
      .with(TauriCommand.FETCH_COLLECTIONS, () =>
        Promise.resolve(testCollections as unknown as T),
      )
      .with('plugin:window|title', () =>
        Promise.resolve(`chromamind: ${testWindowTitle}` as unknown as T),
      )
      .otherwise(() => {
        throw new Error(`Unexpected command: ${cmd}`)
      })
  }

  test('should render the Layout component and collection list', async () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    renderWithProvider(
      <Provider>
        <Layout>
          <div>hello</div>
        </Layout>
      </Provider>,
      {
        initialState: {
          currentMenu: 'Settings',
          currentCollection: 'test',
        },
      },
    )

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    expect(screen.getByText('ChromaMind')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Collections'))

    for (const collection of testCollections) {
      expect(screen.getByText(collection.name)).toBeInTheDocument()
    }
  })

  test('should filtering collection work', async () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    renderWithProvider(
      <Provider>
        <Layout>
          <div>hello</div>
        </Layout>
      </Provider>,
      {
        initialState: {
          currentMenu: 'Settings',
          currentCollection: 'test',
        },
      },
    )

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    fireEvent.click(screen.getByText('Collections'))

    const inputField = screen.getByPlaceholderText('collection name')

    fireEvent.change(inputField, { target: { value: testCollections[1].name } })

    expect(screen.queryByText(testCollections[0].name)).toBeNull()
  })

  test('should refreshing collection work', async () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    renderWithProvider(
      <Provider>
        <Layout>
          <div>hello</div>
        </Layout>
      </Provider>,
      {
        initialState: {
          currentMenu: 'Settings',
          currentCollection: 'test',
        },
      },
    )

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    fireEvent.click(screen.getByText('Collections'))
  })

  test('should favorite collection work', async () => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`, testWindowTitle)
    localStorage.setItem(
      MOCK_FAVORITE_COLLECTIONS_KEY,
      JSON.stringify([testCollections[1].name]),
    )

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    renderWithProvider(
      <Provider>
        <Layout>
          <div>hello</div>
        </Layout>
      </Provider>,
      {
        initialState: {
          currentMenu: 'Settings',
          currentCollection: 'test',
        },
      },
    )

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    // click on the collections tab
    fireEvent.click(screen.getByText('Collections'))

    expect(
      screen.getByTitle(`${testCollections[0].name}-not-favorite`),
    ).toBeInTheDocument()
    expect(
      screen.getByTitle(`${testCollections[1].name}-favorite`),
    ).toBeInTheDocument()

    // make the collection as favorite
    fireEvent.click(
      screen.getByTitle(`${testCollections[0].name}-not-favorite`),
    )

    // both collections should be favorited
    expect(
      screen.getByTitle(`${testCollections[0].name}-favorite`),
    ).toBeInTheDocument()
    expect(
      screen.getByTitle(`${testCollections[1].name}-favorite`),
    ).toBeInTheDocument()

    localStorage.removeItem(MOCK_FAVORITE_COLLECTIONS_KEY)
  })

  describe('create collection', () => {
    test('should render create collection modal', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <div>hello</div>
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByText('Collections'))

      fireEvent.click(screen.getByTitle('Create Collection'))

      const box = await screen.findByText('New Collection')
      expect(box).toBeInTheDocument()
    })

    test('should validating name works', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <div>hello</div>
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByText('Collections'))

      fireEvent.click(screen.getByTitle('Create Collection'))

      await screen.findAllByPlaceholderText('collection name')
      const inputField = screen.getAllByPlaceholderText('collection name')[1]

      fireEvent.change(inputField, { target: { value: 'a' } })

      expect(screen.getByTitle('0-invalid')).toBeInTheDocument()

      fireEvent.change(inputField, { target: { value: '한국어' } })

      expect(screen.getByTitle('1-invalid')).toBeInTheDocument()

      fireEvent.change(inputField, { target: { value: 'Collection..1' } })

      expect(screen.getByTitle('2-invalid')).toBeInTheDocument()

      fireEvent.change(inputField, { target: { value: '127.0.0.1' } })

      expect(screen.getByTitle('3-invalid')).toBeInTheDocument()

      fireEvent.change(inputField, { target: { value: 'collection-3' } })

      expect(screen.getByTitle('0-valid')).toBeInTheDocument()
      expect(screen.getByTitle('1-valid')).toBeInTheDocument()
      expect(screen.getByTitle('2-valid')).toBeInTheDocument()
      expect(screen.getByTitle('3-valid')).toBeInTheDocument()
    })

    test('should button disabled if name is invalid', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <div>hello</div>
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByText('Collections'))

      fireEvent.click(screen.getByTitle('Create Collection'))

      await screen.findAllByPlaceholderText('collection name')
      const inputField = screen.getAllByPlaceholderText('collection name')[1]

      fireEvent.change(inputField, { target: { value: 'a' } })

      expect(screen.getByText('create')).toBeDisabled()
    })

    test('should call create_collection if name is valid', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <div>hello</div>
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByText('Collections'))

      fireEvent.click(screen.getByTitle('Create Collection'))

      await screen.findAllByPlaceholderText('collection name')
      const inputField = screen.getAllByPlaceholderText('collection name')[1]

      const testCollectionName = 'collection1'
      fireEvent.change(inputField, { target: { value: testCollectionName } })

      fireEvent.click(screen.getByText('create'))

      await waitFor(() => expect(mock).toHaveBeenCalled(), {
        timeout: 5000,
      })
    })

    test.skip('should render loading when loading', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <div>hello</div>
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByText('Collections'))

      fireEvent.click(screen.getByTitle('Create Collection'))

      await screen.findAllByPlaceholderText('collection name')
      const inputField = screen.getAllByPlaceholderText('collection name')[1]

      const testCollectionName = 'collection1'
      fireEvent.change(inputField, { target: { value: testCollectionName } })

      fireEvent.click(screen.getByText('create'))

      const asdf = await screen.findByText('Loading...')
      expect(asdf).toBeInTheDocument()
      // expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => expect(mock).toHaveBeenCalled(), {
        timeout: 5000,
      })

      expect(screen.getByTitle('finished')).toBeInTheDocument()
    })

    test('should render error when create collection fails', async () => {
      const errorMessage = 'something wrong'
      const mockCommandHandler = <T,>(
        cmd: string,
        _: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.FETCH_COLLECTIONS, () =>
            Promise.resolve(testCollections as unknown as T),
          )
          .with(TauriCommand.CREATE_COLLECTION, () => {
            return Promise.reject(errorMessage as unknown as T)
          })
          .with('plugin:window|title', () =>
            Promise.resolve(`chromamind: ${testWindowTitle}` as unknown as T),
          )
          .otherwise(() => {
            throw new Error(`Unexpected command: ${cmd}`)
          })
      }

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <div>hello</div>
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByText('Collections'))

      fireEvent.click(screen.getByTitle('Create Collection'))

      await screen.findAllByPlaceholderText('collection name')
      const inputField = screen.getAllByPlaceholderText('collection name')[1]

      const testCollectionName = 'collection1'
      fireEvent.change(inputField, { target: { value: testCollectionName } })

      fireEvent.click(screen.getByText('create'))

      // expect(screen.getByText('Loading...')).toBeInTheDocument()

      await waitFor(() => expect(mock).toHaveBeenCalled(), {
        timeout: 5000,
      })

      expect(screen.getByText('Retry')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })
})
