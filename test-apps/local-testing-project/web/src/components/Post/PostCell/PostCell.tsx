import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { FindPostById, FindPostByIdVariables } from "types/graphql";

import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import Post from "src/components/Post/Post/Post";

export const QUERY: TypedDocumentNode<FindPostById, FindPostByIdVariables> = gql`
  query FindPostById($id: Int!) {
    post: post(id: $id) {
      id
      title
      body
      authorId
      createdAt
    }
  }
`;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => <div>Post not found</div>;

export const Failure = ({ error }: CellFailureProps<FindPostByIdVariables>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({ post }: CellSuccessProps<FindPostById, FindPostByIdVariables>) => {
  if (!post) return <Empty />;
  return <Post post={post} />;
};

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
