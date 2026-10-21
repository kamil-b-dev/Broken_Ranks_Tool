import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

// Only tests importing the HTTP fixture need interception; keep its lifecycle local to them.
export const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
