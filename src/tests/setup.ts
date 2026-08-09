import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// jsdom's CSS parser (rrweb-cssom) can't parse `@layer name { ... }` blocks,
// which is how Chakra v3 emits its reset/base/token stylesheets. jsdom raises a
// jsdomError, which vitest routes to console.error, producing three stack traces
// per rendered provider. jsdom discards those sheets either way, so nothing is
// lost by silencing the report — but note that computed Chakra styles are
// therefore unavailable in tests; assert on roles/text, not resolved CSS values.
const consoleError = console.error
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Could not parse CSS stylesheet')
  ) {
    return
  }
  consoleError(...args)
}

// jsdom ships no canvas, so `getContext` logs a "Not implemented" error and
// returns null. `@re-dev/react-truncate` (Collections' document column) calls it
// on mount, producing ~55 stack traces per suite run. Return the same null jsdom
// would, minus the log — the library already guards with `ctx?.measureText(...)`,
// and it bails out earlier anyway because getBoundingClientRect().width is 0 in
// jsdom, so text is never actually truncated in tests.
HTMLCanvasElement.prototype.getContext = () => null

const matchMediaMock = vi.fn((query: unknown) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))
vi.stubGlobal('matchMedia', matchMediaMock)

afterEach(() => {
  cleanup()
})
