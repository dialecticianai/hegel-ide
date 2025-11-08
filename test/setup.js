// Test setup file - mocks for Electron and dependencies

import { vi } from 'vitest';

// Mock Electron IPC
const mockIpcRenderer = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn()
};

global.ipcRenderer = mockIpcRenderer;

// Mock require for Electron modules in IIFE modules - needs to be a real function
const mockRequire = (moduleName) => {
  if (moduleName === 'electron') {
    return { ipcRenderer: mockIpcRenderer };
  }
  if (moduleName === 'marked') {
    return { marked: { parse: (content) => `<p>${content}</p>` } };
  }
  if (moduleName === '@xterm/xterm') {
    return {
      Terminal: vi.fn(() => ({
        open: vi.fn(),
        dispose: vi.fn(),
        onData: vi.fn(),
        loadAddon: vi.fn()
      }))
    };
  }
  if (moduleName === '@xterm/addon-fit') {
    return {
      FitAddon: vi.fn(() => ({
        fit: vi.fn()
      }))
    };
  }
  return {};
};

// Make require available in global scope for eval'd code
global.require = mockRequire;
// Also make it a property that can be accessed directly
globalThis.require = mockRequire;

// Mock window object
global.window = global.window || {};
global.window.HegelIDE = {};
global.window.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
global.window.addEventListener = vi.fn();
global.window.removeEventListener = vi.fn();

// Mock Alpine
global.Alpine = {
  data: vi.fn(),
  $data: vi.fn()
};

// Mock document
global.document = {
  addEventListener: vi.fn(),
  getElementById: vi.fn()
};
