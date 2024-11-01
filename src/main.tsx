import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Provider } from '@/components/ui/provider'
import { Provider as ReduxProvider } from 'react-redux'
import store from './store'
import NotFoundPage from './404'
import MainPage from './MainPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/home',
    element: <MainPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <ReduxProvider store={store}>
        {/* <ColorModeScript initialColorMode={theme.config.initialColorMode} /> */}
        <RouterProvider router={router} />
        {/* <App /> */}
      </ReduxProvider>
    </Provider>
  </React.StrictMode>,
)
