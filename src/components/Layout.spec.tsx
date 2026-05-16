import { afterEach, describe, test, expect, vi } from 'vitest'
import { clearMocks } from '@tauri-apps/api/mocks'
import renderWithProvider from '../utils/renderWithProvider'
import { Provider } from '@/components/ui/provider'
import Layout from './Layout.tsx'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { updateMenu } from '../slices/currentMenuSlice'
import configureMockStore from 'redux-mock-store'

// Mock @tauri-apps/api/app so getVersion() is controllable in tests
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(),
}))

import { getVersion } from '@tauri-apps/api/app'

const mockStore = configureMockStore()

afterEach(() => {
  clearMocks()
  vi.clearAllMocks()
})

describe('Layout', () => {
  test('should render the Layout component', async () => {
    vi.mocked(getVersion).mockResolvedValue('1.0.0')

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

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Collections')).toBeInTheDocument()
  })

  test('should render Settings nav item', () => {
    vi.mocked(getVersion).mockResolvedValue('1.0.0')

    renderWithProvider(
      <Provider>
        <Layout>
          <div>hello</div>
        </Layout>
      </Provider>,
      { initialState: { currentMenu: 'Home', currentCollection: '' } },
    )

    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('should render children', () => {
    vi.mocked(getVersion).mockResolvedValue('1.0.0')

    renderWithProvider(
      <Provider>
        <Layout>
          <div>my child content</div>
        </Layout>
      </Provider>,
      { initialState: { currentMenu: 'Home', currentCollection: '' } },
    )

    expect(screen.getByText('my child content')).toBeInTheDocument()
  })

  test('should dispatch updateMenu("Home") when Home is clicked', () => {
    vi.mocked(getVersion).mockResolvedValue('1.0.0')

    const store = mockStore({ currentMenu: 'Collections', currentCollection: '' })

    renderWithProvider(
      <Provider>
        <Layout>
          <div />
        </Layout>
      </Provider>,
      { store },
    )

    fireEvent.click(screen.getByText('Home'))

    expect(store.getActions()).toContainEqual(updateMenu('Home'))
  })

  test('should dispatch updateMenu("Collections") when Collections is clicked', () => {
    vi.mocked(getVersion).mockResolvedValue('1.0.0')

    const store = mockStore({ currentMenu: 'Home', currentCollection: '' })

    renderWithProvider(
      <Provider>
        <Layout>
          <div />
        </Layout>
      </Provider>,
      { store },
    )

    fireEvent.click(screen.getByText('Collections'))

    expect(store.getActions()).toContainEqual(updateMenu('Collections'))
  })

  test('should dispatch updateMenu("Settings") when Settings is clicked', () => {
    vi.mocked(getVersion).mockResolvedValue('1.0.0')

    const store = mockStore({ currentMenu: 'Home', currentCollection: '' })

    renderWithProvider(
      <Provider>
        <Layout>
          <div />
        </Layout>
      </Provider>,
      { store },
    )

    fireEvent.click(screen.getByText('Settings'))

    expect(store.getActions()).toContainEqual(updateMenu('Settings'))
  })

  test('should display app version from getVersion()', async () => {
    vi.mocked(getVersion).mockResolvedValue('2.3.4')

    renderWithProvider(
      <Provider>
        <Layout>
          <div />
        </Layout>
      </Provider>,
      { initialState: { currentMenu: 'Home', currentCollection: '' } },
    )

    await waitFor(() => expect(screen.getByText('v 2.3.4')).toBeInTheDocument())
  })

  test('should not display version when getVersion() fails', async () => {
    vi.mocked(getVersion).mockRejectedValue(new Error('not available'))

    renderWithProvider(
      <Provider>
        <Layout>
          <div />
        </Layout>
      </Provider>,
      { initialState: { currentMenu: 'Home', currentCollection: '' } },
    )

    // Give it time to settle — version text should stay empty
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText(/^v /)).not.toBeInTheDocument()
  })
})
