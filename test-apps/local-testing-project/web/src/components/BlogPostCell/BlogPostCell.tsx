import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { FindBlogPostQuery, FindBlogPostQueryVariables } from "types/graphql";

import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import BlogPost from "src/components/BlogPost/BlogPost";

export const QUERY: TypedDocumentNode<FindBlogPostQuery, FindBlogPostQueryVariables> = gql`
  query FindBlogPostQuery($id: Int!) {
    blogPost: post(id: $id) {
      id
      title
      body
      author {
        email
        fullName
      }
      createdAt
    }
  }
`;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => <div>Empty</div>;

export const Failure = ({ error }: CellFailureProps<FindBlogPostQueryVariables>) => (
  <div style={{ color: "red" }}>Error: {error?.message}</div>
);

export const Success = ({
  blogPost,
}: CellSuccessProps<FindBlogPostQuery, FindBlogPostQueryVariables>) => (
  <BlogPost blogPost={blogPost} />
);

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
