import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { FindPosts, FindPostsVariables } from "types/graphql";

import { Link, routes } from "@rwgql/router";
import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import Posts from "src/components/Post/Posts/Posts";

export const QUERY: TypedDocumentNode<FindPosts, FindPostsVariables> = gql`
  query FindPosts {
    posts {
      id
      title
      body
      authorId
      createdAt
    }
  }
`;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => {
  return (
    <div className="rw-text-center">
      No posts yet.{" "}
      <Link to={routes.newPost()} className="rw-link">
        Create one?
      </Link>
    </div>
  );
};

export const Failure = ({ error }: CellFailureProps<FindPostsVariables>) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({ posts }: CellSuccessProps<FindPosts, FindPostsVariables>) => {
  return <Posts posts={posts} />;
};

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
