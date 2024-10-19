import { afterEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import renderWithProvider from '../utils/renderWithProvider'
import { InvokeArgs } from '@tauri-apps/api/core'
import { match } from 'ts-pattern'
import Collections from './Collections'
import { TauriCommand } from '../types'
import { copyClipboard } from '../utils/copyToClipboard'

afterEach(() => {
  clearMocks()
})

describe('Collections', () => {
  describe('rendering', () => {
    test('should render the Collections component', async () => {
      const mockCommandHandler = <T, >(
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

      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
        timeout: 5000,
      })

      expect(
        screen.getByText('Click on a cell to view details'),
      ).toBeInTheDocument()
    })

    test('should render loading when not finished', async () => {
      const mockCommandHandler = <T, >(
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

      mockIPC(mockCommandHandler)

      // @ts-ignore
      vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    test('should render empty when no data', async () => {
      const mockCommandHandler = <T, >(
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

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
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
    const mockCommandHandler = <T, >(
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

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
        timeout: 5000,
      })

      expect(
        screen.getByText(`collection id`),
      ).toBeInTheDocument()
      expect(screen.getByText(`Metadata`)).toBeInTheDocument()
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

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
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

    test('should open modal when metadata badge clicked', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
        timeout: 5000,
      })

      fireEvent.click(screen.getByTestId('collection-metadata-badge'))

      expect(screen.getByText('Collection Metadata')).toBeInTheDocument()
    })
  })

  describe('data view', () => {
    const collectionId = 'test collection'
    const collectionData = {
      foo: 'bar',
    }
    const totalRows = 2
    const embedding = [1, 2, 3]
    const mockCommandHandler = <T, >(
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

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
        timeout: 5000,
      })

      expect(screen.getByTestId('data-view-table')).toBeInTheDocument()
    })

    test('should button disabled when last page', async () => {
      mockIPC(mockCommandHandler)

      // @ts-ignore
      const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
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
      const mockCommandHandler = <T, >(
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

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
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
      const mockCommandHandler = <T, >(
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

      renderWithProvider(<Collections />, {
        initialState: {
          currentMenu: 'Collections',
          currentCollection: 'test',
        },
      })

      await waitFor(() => expect(mock).toHaveBeenCalledTimes(3), {
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
})
