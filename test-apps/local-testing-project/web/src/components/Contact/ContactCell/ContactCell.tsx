import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { FindContactById, FindContactByIdVariables } from "types/graphql";

import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import Contact from "src/components/Contact/Contact/Contact";

export const QUERY: TypedDocumentNode<FindContactById, FindContactByIdVariables> = gql`
  query FindContactById($id: Int!) {
    contact: contact(id: $id) {
      id
      name
      email
      message
      createdAt
    }
  }
`;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => <div>Contact not found</div>;

export const Failure = ({ error }: CellFailureProps<FindContactByIdVariables>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({
  contact,
}: CellSuccessProps<FindContactById, FindContactByIdVariables>) => {
  if (!contact) return <Empty />;
  return <Contact contact={contact} />;
};

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
