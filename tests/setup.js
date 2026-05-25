// Global test setup. jsdom doesn't ship ResizeObserver, used by Leaflet.
import { vi } from 'vitest'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub
}

// Silence Leaflet's expectation that images resolve to a URL.
if (typeof globalThis.URL.createObjectURL !== 'function') {
  globalThis.URL.createObjectURL = () => 'blob:stub'
}

// vi is re-exported for convenience in tests that need fake timers.
export { vi }
