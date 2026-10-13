import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { FindAuthorQuery, FindAuthorQueryVariables } from "types/graphql";

import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import Author from "src/components/Author/Author";

export const QUERY: TypedDocumentNode<FindAuthorQuery, FindAuthorQueryVariables> = gql`
  query FindAuthorQuery($id: String!) {
    author: user(id: $id) {
      email
      fullName
    }
  }
`;

export const Loading = () => <span>Loading...</span>;

export const Empty = () => <span>Empty</span>;

export const Failure = ({ error }: CellFailureProps<FindAuthorQueryVariables>) => (
  <span style={{ color: "red" }}>Error: {error?.message}</span>
);

export const Success = ({
  author,
}: CellSuccessProps<FindAuthorQuery, FindAuthorQueryVariables>) => (
  <span className="author-cell">{author && <Author author={author} />}</span>
);

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
