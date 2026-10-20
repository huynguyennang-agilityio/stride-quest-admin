import { authHandlers } from "./auth";
import { challengeHandlers } from "./challenges";

/** The happy path of every endpoint the admin calls; tests override one with `server.use()`. */
export const handlers = [...authHandlers, ...challengeHandlers];
