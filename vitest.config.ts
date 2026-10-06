import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Loads the poisoned Mire Hag record so the eval expectations for the injection test resolve.
    env: { RUNESCALE_INJECTION_FIXTURE: '1' },
  },
});
