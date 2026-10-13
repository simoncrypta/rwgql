import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { FindContacts, FindContactsVariables } from "types/graphql";

import { Link, routes } from "@rwgql/router";
import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import Contacts from "src/components/Contact/Contacts/Contacts";

export const QUERY: TypedDocumentNode<FindContacts, FindContactsVariables> = gql`
  query FindContacts {
    contacts {
      id
      name
      email
      message
      createdAt
    }
  }
`;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => {
  return (
    <div className="rw-text-center">
      No contacts yet.{" "}
      <Link to={routes.newContact()} className="rw-link">
        Create one?
      </Link>
    </div>
  );
};

export const Failure = ({ error }: CellFailureProps<FindContactsVariables>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({ contacts }: CellSuccessProps<FindContacts, FindContactsVariables>) => {
  return <Contacts contacts={contacts} />;
};

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
