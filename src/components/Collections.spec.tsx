import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import renderWithProvider from '../utils/renderWithProvider'
import { InvokeArgs } from '@tauri-apps/api/core'
import { match } from 'ts-pattern'
import Collections from './Collections'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from '../types'
import { copyClipboard } from '../utils/copyToClipboard'
import { Provider } from '@/components/ui/provider'
import Layout from '@/components/Layout.tsx'

afterEach(() => {
  clearMocks()
})

describe('Collections', () => {
  const mockCommandHandler = <T,>(
    cmd: string,
    _: InvokeArgs | undefined,
  ): Promise<T> => {
    return match(cmd)
      .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
        Promise.resolve({
          id: 1,
          metadata: {},
        } as unknown as T),
      )
      .with(TauriCommand.FETCH_ROW_COUNT, () =>
        Promise.resolve(2 as unknown as T),
      )
      .with(TauriCommand.FETCH_EMBEDDINGS, () =>
        Promise.resolve([
          {
            id: 1,
            metadata: {},
            document: 'test',
            embedding: [1, 2, 3],
          },
          {
            id: 2,
            metadata: {},
            document: 'test',
            embedding: [1, 2, 3],
          },
        ] as unknown as T),
      )
      .otherwise(() => Promise.resolve('unknown command' as unknown as T))
  }

  describe('rendering', () => {
    test('should render the Collections component', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      expect(
        screen.getByText('Click on a cell to view details'),
      ).toBeInTheDocument()
    })

    test('should render loading when not finished', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      expect(screen.getByText('Fetching Embeddings')).toBeInTheDocument()
    })

    test('should render empty when no data', async () => {
      const mockCommandHandler = <T,>(
        cmd: string,
        _: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
            Promise.resolve({
              id: 1,
              metadata: {},
            } as unknown as T),
          )
          .with(TauriCommand.FETCH_ROW_COUNT, () =>
            Promise.resolve(0 as unknown as T),
          )
          .with(TauriCommand.FETCH_EMBEDDINGS, () =>
            Promise.resolve([] as unknown as T),
          )
          .otherwise(() => Promise.resolve('unknown command' as unknown as T))
      }

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      expect(screen.getByText('Collection is empty')).toBeInTheDocument()
    })
  })

  describe('collection data', () => {
    const collectionId = 'test collection'
    const collectionData = {
      foo: 'bar',
    }
    const totalRows = 2
    const embedding = [1, 2, 3]
    const mockCommandHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
          Promise.resolve({
            id: collectionId,
            metadata: collectionData,
          } as unknown as T),
        )
        .with(TauriCommand.FETCH_ROW_COUNT, () =>
          Promise.resolve(totalRows as unknown as T),
        )
        .with(TauriCommand.FETCH_EMBEDDINGS, () =>
          Promise.resolve([
            {
              id: 1,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 1',
              embedding: embedding,
            },
            {
              id: 2,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
              embedding: embedding,
            },
          ] as unknown as T),
        )
        .otherwise(() => Promise.resolve('unknown command' as unknown as T))
    }

    test('should render collection data', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      expect(screen.getByText(`collection id`)).toBeInTheDocument()
      expect(
        screen.getByText(`total embeddings: ${totalRows}`),
      ).toBeInTheDocument()
      expect(
        screen.getByText(`dimensions: ${embedding.length}`),
      ).toBeInTheDocument()
    })

    test('should copy collection id when button is clicked', async () => {
      mockIPC(mockCommandHandler)

      vi.mock('../utils/copyToClipboard', () => ({
        copyClipboard: vi.fn(),
      }))
      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      fireEvent(
        screen.getByText(`collection id`),
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      )

      expect(copyClipboard).toHaveBeenCalled()
    })
  })

  describe('data view', () => {
    const collectionId = 'test collection'
    const collectionData = {
      foo: 'bar',
    }
    const totalRows = 2
    const embedding = [1, 2, 3]
    const mockCommandHandler = <T,>(
      cmd: string,
      args: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
          Promise.resolve({
            id: collectionId,
            metadata: collectionData,
          } as unknown as T),
        )
        .with(TauriCommand.FETCH_ROW_COUNT, () =>
          Promise.resolve(totalRows as unknown as T),
        )
        .with(TauriCommand.FETCH_EMBEDDINGS, () => {
          console.log(args)
          return Promise.resolve([
            {
              id: 1,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 1',
              embedding: embedding,
            },
            {
              id: 2,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
              embedding: embedding,
            },
          ] as unknown as T)
        })
        .otherwise(() => Promise.resolve('unknown command' as unknown as T))
    }

    test('should render table', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      expect(screen.getByTestId('data-view-table')).toBeInTheDocument()
    })

    test('should button disabled when last page', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      expect(screen.getByTestId('data-view-previous-button')).toBeDisabled()
      expect(screen.getByTestId('data-view-next-button')).toBeDisabled()
    })

    test('should render previous / next data when arrow button is clicked', async () => {
      const embeddings = [
        [
          {
            id: 1,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 1',
            embedding: embedding,
          },
          {
            id: 2,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 2',
            embedding: embedding,
          },
        ],
        [
          {
            id: 3,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 3',
            embedding: embedding,
          },
          {
            id: 4,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 4',
            embedding: embedding,
          },
        ],
      ]
      const mockCommandHandler = <T,>(
        cmd: string,
        args: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
            Promise.resolve({
              id: collectionId,
              metadata: collectionData,
            } as unknown as T),
          )
          .with(TauriCommand.FETCH_ROW_COUNT, () =>
            Promise.resolve(20 as unknown as T),
          )
          .with(TauriCommand.FETCH_EMBEDDINGS, () => {
            // @ts-ignore
            return Promise.resolve(embeddings[args?.offset | 0] as unknown as T)
          })
          .otherwise(() => Promise.resolve('unknown command' as unknown as T))
      }

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByTestId('data-view-next-button'))
      await waitFor(() => expect(mock).toHaveBeenCalled(), {
        timeout: 5000,
      })

      expect(screen.getByText('Page 2 / 2')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('data-view-previous-button'))
      await waitFor(() => expect(mock).toHaveBeenCalled(), {
        timeout: 5000,
      })

      expect(screen.getByText('Page 1 / 2')).toBeInTheDocument()
    })
  })

  describe('details view', () => {
    test('should render the details view when a cell is clicked', async () => {
      const mockCommandHandler = <T,>(
        cmd: string,
        _: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
            Promise.resolve({
              id: 1,
              metadata: {},
            } as unknown as T),
          )
          .with(TauriCommand.FETCH_ROW_COUNT, () =>
            Promise.resolve(2 as unknown as T),
          )
          .with(TauriCommand.FETCH_EMBEDDINGS, () =>
            Promise.resolve([
              {
                id: 1,
                metadata: {
                  foo: 'bar',
                },
                document: 'test document 1',
                embedding: [1, 2, 3],
              },
              {
                id: 2,
                metadata: {
                  foo: 'bar',
                },
                document: 'test document 2',
                embedding: [1, 2, 3],
              },
            ] as unknown as T),
          )
          .otherwise(() => Promise.resolve('unknown command' as unknown as T))
      }

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Collections',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByTestId('0_document'))

      //   await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
      //     timeout: 5000,
      //   })

      const { getByText } = within(screen.getByTestId('detail-view-string'))
      expect(getByText('test document 1')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('0_embedding'))

      expect(screen.getByTestId('detail-view-embedding')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('0_metadata'))

      expect(screen.getByTestId('detail-view-metadata')).toBeInTheDocument()
    })
  })

  describe('Collection Nav', () => {
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
        .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
          Promise.resolve({
            id: 1,
            metadata: {},
          } as unknown as T),
        )
        .with(TauriCommand.FETCH_ROW_COUNT, () =>
          Promise.resolve(2 as unknown as T),
        )
        .with(TauriCommand.FETCH_EMBEDDINGS, () =>
          Promise.resolve([
            {
              id: 1,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 1',
              embedding: [1, 2, 3],
            },
            {
              id: 2,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
              embedding: [1, 2, 3],
            },
          ] as unknown as T),
        )
        .otherwise(() => {
          throw new Error(`Unexpected command: ${cmd}`)
        })
    }

    test('should filtering collection work', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Collections />
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      const inputField = screen.getByPlaceholderText('collection name')

      fireEvent.change(inputField, {
        target: { value: testCollections[1].name },
      })

      expect(screen.queryByText(testCollections[0].name)).toBeNull()
    })

    test('should refreshing collection work', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(
        <Provider>
          <Layout>
            <Collections />
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

      // fireEvent.click(screen.getByText('Collections'))
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
            <Collections />
          </Layout>
        </Provider>,
        {
          initialState: {
            currentMenu: 'Settings',
            currentCollection: 'test',
          },
        },
      )

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
        timeout: 5000,
      })

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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

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
            .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
              Promise.resolve({
                id: 1,
                metadata: {},
              } as unknown as T),
            )
            .with(TauriCommand.FETCH_ROW_COUNT, () =>
              Promise.resolve(2 as unknown as T),
            )
            .with(TauriCommand.FETCH_EMBEDDINGS, () =>
              Promise.resolve([
                {
                  id: 1,
                  metadata: {
                    foo: 'bar',
                  },
                  document: 'test document 1',
                  embedding: [1, 2, 3],
                },
                {
                  id: 2,
                  metadata: {
                    foo: 'bar',
                  },
                  document: 'test document 2',
                  embedding: [1, 2, 3],
                },
              ] as unknown as T),
            )
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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

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

    describe('context menu', () => {
      test('should render context menu', async () => {
        mockIPC(mockCommandHandler)

        // @ts-ignore
        const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

        renderWithProvider(
          <Provider>
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

        fireEvent.contextMenu(screen.getAllByText(testCollections[0].name)[1])

        const menu = await screen.findByText('Collection Info')
        expect(menu).toBeInTheDocument()
      })

      test('should show collection info when clicked', async () => {
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
            .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
              Promise.resolve({
                id: 1,
                metadata: {},
              } as unknown as T),
            )
            .with(TauriCommand.FETCH_ROW_COUNT, () =>
              Promise.resolve(2 as unknown as T),
            )
            .with(TauriCommand.FETCH_EMBEDDINGS, () =>
              Promise.resolve([
                {
                  id: 1,
                  metadata: {
                    foo: 'bar',
                  },
                  document: 'test document 1',
                  embedding: [1, 2, 3],
                },
                {
                  id: 2,
                  metadata: {
                    foo: 'bar',
                  },
                  document: 'test document 2',
                  embedding: [1, 2, 3],
                },
              ] as unknown as T),
            )
            .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
              Promise.resolve({} as unknown as T),
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
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

        fireEvent.contextMenu(screen.getAllByText(testCollections[0].name)[1])

        const menu = await screen.findByText('Collection Info')

        fireEvent.click(menu)

        await waitFor(() => expect(mock).toHaveBeenCalled(), {
          timeout: 5000,
        })

        expect(screen.getByText('Configuration')).toBeInTheDocument()
      })

      // FIXME: this test is not working
      test.skip('should call delete collection when clicked', async () => {
        const mockCommandHandler = <T,>(
          cmd: string,
          _: InvokeArgs | undefined,
        ): Promise<T> => {
          console.log(cmd, _)
          return (
            match(cmd)
              .with(TauriCommand.FETCH_COLLECTIONS, () =>
                Promise.resolve(testCollections as unknown as T),
              )
              .with('plugin:window|title', () =>
                Promise.resolve(
                  `chromamind: ${testWindowTitle}` as unknown as T,
                ),
              )
              .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
                Promise.resolve({
                  id: 1,
                  metadata: {},
                } as unknown as T),
              )
              .with(TauriCommand.FETCH_ROW_COUNT, () =>
                Promise.resolve(2 as unknown as T),
              )
              .with(TauriCommand.FETCH_EMBEDDINGS, () =>
                Promise.resolve([
                  {
                    id: 1,
                    metadata: {
                      foo: 'bar',
                    },
                    document: 'test document 1',
                    embedding: [1, 2, 3],
                  },
                  {
                    id: 2,
                    metadata: {
                      foo: 'bar',
                    },
                    document: 'test document 2',
                    embedding: [1, 2, 3],
                  },
                ] as unknown as T),
              )
              // .with(TauriCommand.DELETE_COLLECTION, (asdf: never) => {
              //   console.log(asdf)
              //   return Promise.resolve({} as unknown as T)
              // })
              .otherwise(() => {
                throw new Error(`Unexpected command: ${cmd}`)
              })
          )
        }

        mockIPC(mockCommandHandler)

        // @ts-ignore
        const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

        renderWithProvider(
          <Provider>
            <Collections />
          </Provider>,
          {
            initialState: {
              currentMenu: 'Settings',
              currentCollection: 'test',
            },
          },
        )

        await waitFor(() => expect(mock).toHaveBeenCalledTimes(4), {
          timeout: 5000,
        })

        fireEvent.contextMenu(screen.getAllByText(testCollections[0].name)[1])

        const menu = await screen.findByText('Delete Collection')

        fireEvent.click(menu)

        const sex = await screen.findByText('Are you sure?')
        screen.debug(sex)
        const button = await screen.findByText('This action')
        screen.debug(button)
        fireEvent.click(screen.getByText('Delete'))

        await waitFor(() => expect(mock).toHaveBeenCalled(), {
          timeout: 5000,
        })
      })
    })
  })
})
