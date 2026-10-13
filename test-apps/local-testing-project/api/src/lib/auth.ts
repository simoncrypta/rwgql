import { AuthenticationError, ForbiddenError, hasRoleForUser } from "@rwgql/auth/graphql";
import { db } from "./db.js";
export const cookieName = "local_testing_session";
export const getCurrentUser = async (session: { id: string | number }) =>
  typeof session.id === "string"
    ? db.user.findUnique({
        where: { id: session.id },
        select: { id: true, email: true, roles: true },
      })
    : null;
export type AuthContext = { currentUser?: Record<string, unknown> | null };
export const isAuthenticated = (context: AuthContext) => !!context.currentUser;
export const hasRole = (context: AuthContext, roles: string | string[] | undefined) =>
  hasRoleForUser(context.currentUser ?? null, roles);
export const requireAuth = (
  context: AuthContext,
  { roles }: { roles?: string | string[] } = {},
) => {
  if (!isAuthenticated(context))
    throw new AuthenticationError("You don't have permission to do that.");
  if (roles && !hasRole(context, roles))
    throw new ForbiddenError("You don't have access to do that.");
};
