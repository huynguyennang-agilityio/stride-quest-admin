// Runs once when the Next.js server starts.
export async function register() {
  // Mock mode serves the contract examples instead of calling the backend. The
  // NODE_ENV check keeps MSW out of production builds; config also refuses it there.
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_RUNTIME === "nodejs") {
    const { config } = await import("@/lib/config");
    if (config.apiMode === "mock") {
      const { server } = await import("../tests/msw/server");
      server.listen({ onUnhandledRequest: "bypass" });
      console.info(`API_MODE=mock: serving contract examples for ${config.apiBaseUrl}`);
    }
  }
}
