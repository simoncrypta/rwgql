import { createAuthentication } from "@rwgql/auth";
import { createDbAuthClient } from "@rwgql/dbauth/web";
const client = createDbAuthClient({ authUrl: `${import.meta.env.VITE_API_URL ?? ""}/auth` });
export const { AuthProvider, useAuth } = createAuthentication(client);
