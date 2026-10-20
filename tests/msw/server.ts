import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** MSW for Node: Vitest API tests, and the dev server when API_MODE=mock. */
export const server = setupServer(...handlers);
