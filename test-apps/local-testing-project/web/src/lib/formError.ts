import type { ErrorLike } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import type { RWGqlError } from "@cedarjs/forms";
// Cedar forms expect Apollo 3's error shape; preserve GraphQL field errors from Apollo 4.
export const formError = (error: ErrorLike | undefined): RWGqlError | undefined =>
  error
    ? {
        message: error.message,
        graphQLErrors: CombinedGraphQLErrors.is(error) ? error.errors : [],
        networkError: CombinedGraphQLErrors.is(error) ? null : error,
      }
    : undefined;
