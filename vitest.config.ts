import { defineConfig } from 'vitest/config'

// Os testes cobrem só as regras puras (app/lib): não precisam do Worker.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['tests/**/*.test.ts'] },
})
