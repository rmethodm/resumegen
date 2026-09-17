import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// happy-dom has no chrome.* global — every hook/component that talks to the
// extension APIs needs this present before it renders. Individual tests
// override sendMessage's resolved value per-call.
(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
        sendMessage: vi.fn(),
        openOptionsPage: vi.fn(),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
        },
    },
};
