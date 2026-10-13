import { GraphQLError } from "graphql";
import { db } from "./db.js";
export class ServiceValidationError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: "BAD_USER_INPUT" } });
  }
}
export async function validateUniqueness<T>(
  _model: "post",
  where: { title: string },
  options: { db: typeof db; message: string },
  create: (client: typeof db) => T,
) {
  if (await options.db.post.findFirst({ where })) throw new ServiceValidationError(options.message);
  return create(options.db);
}
