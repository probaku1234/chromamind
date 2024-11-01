import { afterEach, describe, test, expect } from 'vitest'
import { clearMocks } from '@tauri-apps/api/mocks'
import renderWithProvider from '../utils/renderWithProvider'
import { Provider } from '@/components/ui/provider'
import Layout from './Layout.tsx'
import { screen } from '@testing-library/react'

afterEach(() => {
  clearMocks()
})

describe('Layout', () => {
  test('should render the Layout component', async () => {
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
})
