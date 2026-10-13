import { useReadQuery } from "@apollo/client/react";
import type { LoaderFunctionArgs } from "react-router";

import { apolloLoader, useApolloLoaderData } from "@/apollo";
import BlogArticle, { BlogArticlePostFragment } from "@/components/BlogArticle/BlogArticle";
export { QueryErrorBoundary as ErrorBoundary } from "@/components/QueryError/QueryError";
import { getFragmentData, graphql } from "@/gql";

const FindBlogPostQueryDocument = graphql(`
  query FindBlogPostQuery($id: Int!) {
    blogPost: post(id: $id) {
      ...BlogArticlePost
    }
  }
`);

// `{id:Int}` is validated by the generated route module before this runs.
export const loader = apolloLoader<LoaderFunctionArgs>()(({ params, preloadQuery }) => ({
  postRef: preloadQuery(FindBlogPostQueryDocument, { variables: { id: Number(params.id) } }),
}));

const BlogPostPage = (_props: { readonly id: number }) => {
  const { postRef } = useApolloLoaderData<typeof loader>();
  const { data } = useReadQuery(postRef);
  const post = getFragmentData(BlogArticlePostFragment, data.blogPost);

  return post ? <BlogArticle post={post} /> : <div>Empty</div>;
};

export default BlogPostPage;
