import { useRouteError } from "react-router";

/**
 * Route ErrorBoundary for loader pages: shows a failed query inside the page's layout, like a
 * Cell's Failure, instead of the app-wide FatalErrorPage.
 */
export const QueryErrorBoundary = () => {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something went wrong";

  return <div style={{ color: "red" }}>Error: {message}</div>;
};
