import { createContext } from "react-router";

/** Per-request CSP nonce, set by workers/app.ts and read by entry.server.tsx. */
export const nonceContext = createContext<string>("");
