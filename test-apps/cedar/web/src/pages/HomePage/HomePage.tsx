import { useReadQuery } from "@apollo/client/react";
import { routes } from "@rwgql/router";
import type { LoaderFunctionArgs } from "react-router";

import { apolloLoader, useApolloLoaderData } from "@/apollo";
import BlogArticle, { BlogArticlePostFragment } from "@/components/BlogArticle/BlogArticle";
export { QueryErrorBoundary as ErrorBoundary } from "@/components/QueryError/QueryError";
import { getFragmentData, graphql } from "@/gql";

const BlogPostsQueryDocument = graphql(`
  query BlogPostsQuery {
    blogPosts: posts {
      ...BlogArticlePost
    }
  }
`);

// Runs on the server for SSR and client navigations; the result streams into the page.
export const loader = apolloLoader<LoaderFunctionArgs>()(({ preloadQuery }) => ({
  blogPostsRef: preloadQuery(BlogPostsQueryDocument),
}));

const HomePage = () => {
  const { blogPostsRef } = useApolloLoaderData<typeof loader>();
  const { data } = useReadQuery(blogPostsRef);

  if (data.blogPosts.length === 0) {
    return <div>Empty</div>;
  }

  return (
    <div className="divide-grey-700 divide-y">
      {data.blogPosts.map((post) => {
        const article = getFragmentData(BlogArticlePostFragment, post);

        return (
          <BlogArticle
            key={article.id}
            post={article}
            titleHref={routes.blogPost({ id: article.id })}
          />
        );
      })}
    </div>
  );
};

export default HomePage;
