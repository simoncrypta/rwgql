import { gql } from "graphql-tag";

import type { ValidatorDirectiveFunc } from "@rwgql/auth/graphql";
import { createValidatorDirective } from "@rwgql/auth/graphql";

import { requireAuth as applicationRequireAuth } from "../../lib/auth";

export const schema = gql`
  """
  Use to check whether or not a user is authenticated and is associated
  with an optional set of roles.
  """
  directive @requireAuth(roles: [String]) on FIELD_DEFINITION
`;

type RequireAuthValidate = ValidatorDirectiveFunc<{ roles?: string[] }>;

const validate: RequireAuthValidate = ({ directiveArgs, context }) => {
  const { roles } = directiveArgs;
  applicationRequireAuth(context, { roles });
};

const requireAuth = createValidatorDirective(schema, validate);

export default requireAuth;
