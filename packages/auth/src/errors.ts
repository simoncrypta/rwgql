import { GraphQLError } from "graphql";

export class AuthenticationError extends GraphQLError {
  constructor(message = "You don't have permission to do that.") {
    super(message, { extensions: { code: "UNAUTHENTICATED" } });
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message = "You don't have access to do that.") {
    super(message, { extensions: { code: "FORBIDDEN" } });
    this.name = "ForbiddenError";
  }
}
