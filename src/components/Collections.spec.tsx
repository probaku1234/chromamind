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
      .with(TauriCommand.FETCH_COLLECTIONS, () =>
        Promise.resolve([] as unknown as T),
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
            metadata: {},
            document: 'test',
          },
          {
            id: 2,
            metadata: {},
            document: 'test',
          },
        ] as unknown as T),
      )
      .with(TauriCommand.FETCH_EMBEDDING, () =>
        Promise.resolve([1, 2, 3] as unknown as T),
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
          .with(TauriCommand.FETCH_COLLECTIONS, () =>
            Promise.resolve([] as unknown as T),
          )
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
        .with(TauriCommand.FETCH_COLLECTIONS, () =>
          Promise.resolve([] as unknown as T),
        )
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
            },
            {
              id: 2,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
            },
          ] as unknown as T),
        )
        .with(TauriCommand.FETCH_EMBEDDING, () =>
          Promise.resolve(embedding as unknown as T),
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
        .with(TauriCommand.FETCH_COLLECTIONS, () =>
          Promise.resolve([] as unknown as T),
        )
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
            },
            {
              id: 2,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
            },
          ] as unknown as T)
        })
        .with(TauriCommand.FETCH_EMBEDDING, () =>
          Promise.resolve(embedding as unknown as T),
        )
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
          },
          {
            id: 2,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 2',
          },
        ],
        [
          {
            id: 3,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 3',
          },
          {
            id: 4,
            metadata: {
              foo: 'bar',
            },
            document: 'test document 4',
          },
        ],
      ]
      const mockCommandHandler = <T,>(
        cmd: string,
        args: InvokeArgs | undefined,
      ): Promise<T> => {
        return match(cmd)
          .with(TauriCommand.FETCH_COLLECTIONS, () =>
            Promise.resolve([] as unknown as T),
          )
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
          .with(TauriCommand.FETCH_EMBEDDING, () =>
            Promise.resolve(embedding as unknown as T),
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
    const detailsViewMockHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with(TauriCommand.FETCH_COLLECTIONS, () =>
          Promise.resolve([] as unknown as T),
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
              id: '1',
              metadata: {
                foo: 'bar',
              },
              document: 'test document 1',
            },
            {
              id: '2',
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
            },
          ] as unknown as T),
        )
        .with(TauriCommand.FETCH_EMBEDDING, () =>
          Promise.resolve([0.1, 0.2, 0.3] as unknown as T),
        )
        .otherwise(() => Promise.resolve('unknown command' as unknown as T))
    }

    test('should render the details view when a cell is clicked', async () => {
      mockIPC(detailsViewMockHandler)

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

      const { getByText } = within(screen.getByTestId('detail-view-string'))
      expect(getByText('test document 1')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('0_metadata'))

      expect(screen.getByTestId('detail-view-metadata')).toBeInTheDocument()
    })

    test('embedding Show/Hide toggle should lazy-fetch and cache', async () => {
      mockIPC(detailsViewMockHandler)

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

      // Open the detail sidebar
      fireEvent.click(screen.getByTestId('0_document'))

      // Embedding values should NOT be visible yet
      expect(
        screen.queryByTestId('detail-view-embedding'),
      ).not.toBeInTheDocument()

      // Click Show button
      const showBtn = screen.getByTestId('embedding-toggle-btn')
      expect(showBtn).toHaveTextContent('Show')
      fireEvent.click(showBtn)

      // After fetching, embedding values appear and button says Hide
      await waitFor(
        () =>
          expect(
            screen.getByTestId('detail-view-embedding'),
          ).toBeInTheDocument(),
        { timeout: 3000 },
      )
      expect(screen.getByTestId('embedding-toggle-btn')).toHaveTextContent(
        'Hide',
      )

      // Count how many times FETCH_EMBEDDING was called so far
      const fetchEmbeddingCallCount = mock.mock.calls.filter(
        ([cmd]: [string]) => cmd === TauriCommand.FETCH_EMBEDDING,
      ).length
      expect(fetchEmbeddingCallCount).toBe(1)

      // Click Hide
      fireEvent.click(screen.getByTestId('embedding-toggle-btn'))
      expect(
        screen.queryByTestId('detail-view-embedding'),
      ).not.toBeInTheDocument()

      // Click Show again — should NOT trigger another FETCH_EMBEDDING (cache hit)
      fireEvent.click(screen.getByTestId('embedding-toggle-btn'))
      await waitFor(
        () =>
          expect(
            screen.getByTestId('detail-view-embedding'),
          ).toBeInTheDocument(),
        { timeout: 1000 },
      )

      const fetchEmbeddingCallCountAfter = mock.mock.calls.filter(
        ([cmd]: [string]) => cmd === TauriCommand.FETCH_EMBEDDING,
      ).length
      expect(fetchEmbeddingCallCountAfter).toBe(1) // still 1 — cache was used
    })

    describe('metadata editing', () => {
      const editMockHandler =
        (updateResult: 'ok' | 'error') =>
        <T,>(cmd: string, _: InvokeArgs | undefined): Promise<T> =>
          match(cmd)
            .with(TauriCommand.FETCH_COLLECTIONS, () =>
              Promise.resolve([] as unknown as T),
            )
            .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
              Promise.resolve({ id: 1, metadata: {} } as unknown as T),
            )
            .with(TauriCommand.FETCH_ROW_COUNT, () =>
              Promise.resolve(1 as unknown as T),
            )
            .with(TauriCommand.FETCH_EMBEDDINGS, () =>
              Promise.resolve([
                {
                  id: '1',
                  metadata: { foo: 'bar', score: 42 },
                  document: 'test document 1',
                },
              ] as unknown as T),
            )
            .with(TauriCommand.UPDATE_RECORD_METADATA, () =>
              updateResult === 'ok'
                ? Promise.resolve(null as unknown as T)
                : // Tauri rejects with the command's `Err(String)`, not an Error.
                  Promise.reject('backend exploded' as unknown as T),
            )
            .otherwise(() => Promise.resolve('unknown command' as unknown as T))

      // Renders Collections, opens the sidebar on the first row and enters
      // metadata edit mode. Returns the invoke spy for payload assertions.
      const openEditor = async (updateResult: 'ok' | 'error' = 'ok') => {
        mockIPC(editMockHandler(updateResult))

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
        fireEvent.click(screen.getByText('Edit'))

        return mock
      }

      const updateCalls = (mock: Awaited<ReturnType<typeof openEditor>>) =>
        mock.mock.calls.filter(
          ([cmd]: [string]) => cmd === TauriCommand.UPDATE_RECORD_METADATA,
        )

      test('should prefill the editor from the record metadata', async () => {
        await openEditor()

        expect(screen.getByLabelText('Metadata key 1')).toHaveValue('foo')
        expect(screen.getByLabelText('Metadata value 1')).toHaveValue('bar')
        expect(screen.getByLabelText('Metadata type 1')).toHaveValue('string')

        expect(screen.getByLabelText('Metadata key 2')).toHaveValue('score')
        expect(screen.getByLabelText('Metadata value 2')).toHaveValue('42')
        // The type is inferred from the value's runtime type.
        expect(screen.getByLabelText('Metadata type 2')).toHaveValue('number')
      })

      test('should send an edited value and refetch the rows', async () => {
        const mock = await openEditor()

        const fetchEmbeddingsBefore = mock.mock.calls.filter(
          ([cmd]: [string]) => cmd === TauriCommand.FETCH_EMBEDDINGS,
        ).length

        fireEvent.change(screen.getByLabelText('Metadata value 1'), {
          target: { value: 'baz' },
        })
        fireEvent.click(screen.getByText('Save'))

        await waitFor(() => expect(updateCalls(mock)).toHaveLength(1))
        expect(updateCalls(mock)[0][1]).toEqual({
          collectionName: 'test',
          id: '1',
          metadata: { foo: 'baz', score: 42 },
          removedKeys: [],
        })

        // The table and sidebar refresh from the server after a save.
        await waitFor(() =>
          expect(
            mock.mock.calls.filter(
              ([cmd]: [string]) => cmd === TauriCommand.FETCH_EMBEDDINGS,
            ).length,
          ).toBe(fetchEmbeddingsBefore + 1),
        )

        // Editor closes on success.
        await waitFor(() =>
          expect(
            screen.queryByLabelText('Metadata key 1'),
          ).not.toBeInTheDocument(),
        )
      })

      test('should send a newly added key', async () => {
        const mock = await openEditor()

        fireEvent.click(screen.getByText('Add metadata'))
        fireEvent.change(screen.getByLabelText('Metadata key 3'), {
          target: { value: 'active' },
        })
        fireEvent.change(screen.getByLabelText('Metadata type 3'), {
          target: { value: 'boolean' },
        })
        fireEvent.click(screen.getByText('Save'))

        await waitFor(() => expect(updateCalls(mock)).toHaveLength(1))
        expect(updateCalls(mock)[0][1]).toEqual({
          collectionName: 'test',
          id: '1',
          metadata: { foo: 'bar', score: 42, active: true },
          removedKeys: [],
        })
      })

      test('should report a removed key in removedKeys', async () => {
        const mock = await openEditor()

        fireEvent.click(screen.getByLabelText('Remove metadata 2'))
        fireEvent.click(screen.getByText('Save'))

        await waitFor(() => expect(updateCalls(mock)).toHaveLength(1))
        expect(updateCalls(mock)[0][1]).toEqual({
          collectionName: 'test',
          id: '1',
          metadata: { foo: 'bar' },
          removedKeys: ['score'],
        })
      })

      test('should treat a renamed key as add-new plus remove-old', async () => {
        const mock = await openEditor()

        fireEvent.change(screen.getByLabelText('Metadata key 1'), {
          target: { value: 'renamed' },
        })
        fireEvent.click(screen.getByText('Save'))

        await waitFor(() => expect(updateCalls(mock)).toHaveLength(1))
        expect(updateCalls(mock)[0][1]).toEqual({
          collectionName: 'test',
          id: '1',
          metadata: { renamed: 'bar', score: 42 },
          removedKeys: ['foo'],
        })
      })

      test('should block saving a non-numeric value on a number row', async () => {
        const mock = await openEditor()

        fireEvent.change(screen.getByLabelText('Metadata value 2'), {
          target: { value: 'not a number' },
        })
        fireEvent.click(screen.getByText('Save'))

        expect(
          await screen.findByText('score must be a number'),
        ).toBeInTheDocument()
        expect(updateCalls(mock)).toHaveLength(0)
      })

      test('should block saving an empty key', async () => {
        const mock = await openEditor()

        fireEvent.change(screen.getByLabelText('Metadata key 1'), {
          target: { value: '' },
        })
        fireEvent.click(screen.getByText('Save'))

        expect(
          await screen.findByText('Key cannot be empty'),
        ).toBeInTheDocument()
        expect(updateCalls(mock)).toHaveLength(0)
      })

      test('should block saving duplicate keys', async () => {
        const mock = await openEditor()

        fireEvent.change(screen.getByLabelText('Metadata key 2'), {
          target: { value: 'foo' },
        })
        fireEvent.click(screen.getByText('Save'))

        expect(
          await screen.findByText('Duplicate key: foo'),
        ).toBeInTheDocument()
        expect(updateCalls(mock)).toHaveLength(0)
      })

      test('should stay in edit mode when the backend fails', async () => {
        const mock = await openEditor('error')

        fireEvent.change(screen.getByLabelText('Metadata value 1'), {
          target: { value: 'baz' },
        })
        fireEvent.click(screen.getByText('Save'))

        await waitFor(() => expect(updateCalls(mock)).toHaveLength(1))
        // Inputs are still on screen with the user's pending edit intact.
        expect(screen.getByLabelText('Metadata value 1')).toHaveValue('baz')
      })

      test('should discard pending edits on Cancel', async () => {
        const mock = await openEditor()

        fireEvent.change(screen.getByLabelText('Metadata value 1'), {
          target: { value: 'baz' },
        })
        fireEvent.click(screen.getByText('Cancel'))

        expect(updateCalls(mock)).toHaveLength(0)
        // Back to the read-only list showing the original value.
        const { getByText } = within(screen.getByTestId('detail-view-metadata'))
        expect(getByText('bar')).toBeInTheDocument()
      })
    })
  })

  describe('bulk delete', () => {
    const deleteMockHandler =
      (deleteResult: 'ok' | 'error') =>
      <T,>(cmd: string, _: InvokeArgs | undefined): Promise<T> =>
        match(cmd)
          .with(TauriCommand.FETCH_COLLECTIONS, () =>
            Promise.resolve([] as unknown as T),
          )
          .with(TauriCommand.FETCH_COLLECTION_DATA, () =>
            Promise.resolve({ id: 1, metadata: {} } as unknown as T),
          )
          // More than one page's worth, so the Next button is enabled.
          .with(TauriCommand.FETCH_ROW_COUNT, () =>
            Promise.resolve(25 as unknown as T),
          )
          .with(TauriCommand.FETCH_EMBEDDINGS, () =>
            Promise.resolve([
              { id: 'a', metadata: {}, document: 'doc a' },
              { id: 'b', metadata: {}, document: 'doc b' },
            ] as unknown as T),
          )
          .with(TauriCommand.DELETE_RECORDS, () =>
            deleteResult === 'ok'
              ? Promise.resolve(null as unknown as T)
              : // Tauri rejects with the command's `Err(String)`, not an Error.
                Promise.reject('backend exploded' as unknown as T),
          )
          .otherwise(() => Promise.resolve('unknown command' as unknown as T))

    const renderTable = async (deleteResult: 'ok' | 'error' = 'ok') => {
      mockIPC(deleteMockHandler(deleteResult))

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

      return mock
    }

    const deleteCalls = (mock: Awaited<ReturnType<typeof renderTable>>) =>
      mock.mock.calls.filter(
        ([cmd]: [string]) => cmd === TauriCommand.DELETE_RECORDS,
      )

    const countOf = (
      mock: Awaited<ReturnType<typeof renderTable>>,
      command: TauriCommand,
    ) => mock.mock.calls.filter(([cmd]: [string]) => cmd === command).length

    test('should not show the action bar until a row is selected', async () => {
      await renderTable()

      expect(screen.queryByText('1 selected')).not.toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Select row a'))

      expect(await screen.findByText('1 selected')).toBeInTheDocument()
    })

    test('should select every row on the page from the header checkbox', async () => {
      await renderTable()

      fireEvent.click(screen.getByLabelText('Select all rows'))

      expect(await screen.findByText('2 selected')).toBeInTheDocument()
    })

    test('should not open the detail sidebar when ticking a checkbox', async () => {
      await renderTable()

      fireEvent.click(screen.getByLabelText('Select row a'))

      expect(await screen.findByText('1 selected')).toBeInTheDocument()
      // The sidebar renders this heading; the row click handler must not fire.
      expect(screen.queryByText('Row Detail')).not.toBeInTheDocument()
    })

    test('should delete the selected ids after confirming', async () => {
      const mock = await renderTable()

      const embeddingsBefore = countOf(mock, TauriCommand.FETCH_EMBEDDINGS)
      const rowCountBefore = countOf(mock, TauriCommand.FETCH_ROW_COUNT)

      fireEvent.click(screen.getByLabelText('Select row a'))
      fireEvent.click(screen.getByLabelText('Select row b'))
      fireEvent.click(await screen.findByText('Delete'))

      expect(await screen.findByText('Are you sure?')).toBeInTheDocument()
      expect(
        screen.getByText(/permanently delete 2 record\(s\)/),
      ).toBeInTheDocument()

      // The dialog's Delete is the second one on screen (action bar + dialog).
      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[deleteButtons.length - 1])

      await waitFor(() => expect(deleteCalls(mock)).toHaveLength(1))
      expect(deleteCalls(mock)[0][1]).toEqual({
        collectionName: 'test',
        ids: ['a', 'b'],
      })

      // Both the rows and the total count must be refreshed.
      await waitFor(() => {
        expect(countOf(mock, TauriCommand.FETCH_EMBEDDINGS)).toBe(
          embeddingsBefore + 1,
        )
        expect(countOf(mock, TauriCommand.FETCH_ROW_COUNT)).toBe(
          rowCountBefore + 1,
        )
      })

      // Selection cleared, so the action bar goes away.
      await waitFor(() =>
        expect(screen.queryByText('2 selected')).not.toBeInTheDocument(),
      )
    })

    test('should not delete anything when the dialog is cancelled', async () => {
      const mock = await renderTable()

      fireEvent.click(screen.getByLabelText('Select row a'))
      fireEvent.click(await screen.findByText('Delete'))
      expect(await screen.findByText('Are you sure?')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Cancel'))

      expect(deleteCalls(mock)).toHaveLength(0)
      // Selection survives a cancel.
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    test('should keep the selection when the backend fails', async () => {
      const mock = await renderTable('error')

      fireEvent.click(screen.getByLabelText('Select row a'))
      fireEvent.click(await screen.findByText('Delete'))
      expect(await screen.findByText('Are you sure?')).toBeInTheDocument()

      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[deleteButtons.length - 1])

      await waitFor(() => expect(deleteCalls(mock)).toHaveLength(1))
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    test('should clear the selection when the page changes', async () => {
      await renderTable()

      fireEvent.click(screen.getByLabelText('Select row a'))
      expect(await screen.findByText('1 selected')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('data-view-next-button'))

      await waitFor(() =>
        expect(screen.queryByText('1 selected')).not.toBeInTheDocument(),
      )
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
        .with(TauriCommand.CREATE_COLLECTION, () =>
          Promise.resolve(true as unknown as T),
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
            },
            {
              id: 2,
              metadata: {
                foo: 'bar',
              },
              document: 'test document 2',
            },
          ] as unknown as T),
        )
        .with(TauriCommand.FETCH_EMBEDDING, () =>
          Promise.resolve([1, 2, 3] as unknown as T),
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

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(5), {
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

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(5), {
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

        fireEvent.contextMenu(screen.getAllByText(testCollections[0].name)[0])

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

        fireEvent.contextMenu(screen.getAllByText(testCollections[0].name)[0])

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

        fireEvent.contextMenu(screen.getAllByText(testCollections[0].name)[0])

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
