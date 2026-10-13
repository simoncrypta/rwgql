import { useReadQuery } from "@apollo/client/react";
import type { LoaderFunctionArgs } from "react-router";

import { apolloLoader, useApolloLoaderData } from "@/apollo";
import BlogArticle, { BlogArticlePostFragment } from "@/components/BlogArticle/BlogArticle";
import { getFragmentData, graphql } from "@/gql";

const FindWaterfallBlogPostQueryDocument = graphql(`
  query FindWaterfallBlogPostQuery($id: Int!) {
    waterfallBlogPost: post(id: $id) {
      ...BlogArticlePost
    }
  }
`);

// `{id:Int}` is validated by the generated route module before this runs.
export const loader = apolloLoader<LoaderFunctionArgs>()(({ params, preloadQuery }) => ({
  postRef: preloadQuery(FindWaterfallBlogPostQueryDocument, {
    variables: { id: Number(params.id) },
  }),
}));

const WaterfallPage = (_props: { readonly id: number }) => {
  const { postRef } = useApolloLoaderData<typeof loader>();
  const { data } = useReadQuery(postRef);
  const post = getFragmentData(BlogArticlePostFragment, data.waterfallBlogPost);

  return post ? <BlogArticle post={post} /> : <div>Empty</div>;
};

export default WaterfallPage;
