import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type {
  FindAggregatedBlogPostQuery,
  FindAggregatedBlogPostQueryVariables,
} from "types/graphql";

import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import AuthorFragmentCell, { FRAGMENT } from "src/components/AuthorFragmentCell/AuthorFragmentCell";

// The `...AuthorFragmentCell_author` spread pulls in the data requirements
// that AuthorFragmentCell declares with its FRAGMENT export. The fragment
// definition is composed explicitly below, so
// everything is fetched in a single request – no request waterfall like the
// one WaterfallBlogPostCell creates
export const QUERY: TypedDocumentNode<
  FindAggregatedBlogPostQuery,
  FindAggregatedBlogPostQueryVariables
> = gql`
  ${FRAGMENT}
  query FindAggregatedBlogPostQuery($id: Int!) {
    aggregatedBlogPost: post(id: $id) {
      id
      title
      body
      createdAt
      author {
        ...AuthorFragmentCell_author
      }
    }
  }
`;

export const Loading = () => <div>Loading...</div>;

export const Empty = () => <div>Empty</div>;

export const Failure = ({ error }: CellFailureProps<FindAggregatedBlogPostQueryVariables>) => (
  <div style={{ color: "red" }}>Error: {error?.message}</div>
);

export const Success = ({
  aggregatedBlogPost,
}: CellSuccessProps<FindAggregatedBlogPostQuery, FindAggregatedBlogPostQueryVariables>) => (
  <article className="aggregated-blog-post">
    {aggregatedBlogPost && (
      <>
        <header className="mt-4">
          <p className="text-sm">
            {new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(aggregatedBlogPost.createdAt))}{" "}
            - By: <AuthorFragmentCell author={aggregatedBlogPost.author} />
          </p>
          <h2 className="mt-2 text-xl font-semibold">{aggregatedBlogPost.title}</h2>
        </header>
        <div className="mt-2 mb-4 font-light text-gray-900">{aggregatedBlogPost.body}</div>
      </>
    )}
  </article>
);

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
