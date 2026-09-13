// ============================================================================
// Legacy Socket.IO shim — DISABLED (no network connection).
//
// The app no longer uses the Express/Socket.IO backend. All live updates are
// handled directly via Supabase Realtime channels. Many components still call
// `socket.on(...)` / `socket.off(...)`, so instead of connecting to a dead
// server (which spammed the console with localhost:5000 errors), we export a
// harmless no-op stub that satisfies those calls without any network traffic.
// ============================================================================

const noop = () => socketStub;

const socketStub = {
  connected: false,
  on: noop,
  off: noop,
  once: noop,
  emit: noop,
  connect: noop,
  disconnect: noop,
  removeAllListeners: noop,
};

export const socket = socketStub;

