import { ApolloHydrationHelper } from "@apollo/client-integration-react-router";
import { createContext, useContext, type ReactNode } from "react";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";

import appStylesHref from "./index.css?url";
import scaffoldStylesHref from "./scaffold.css?url";

/** CSP nonce for inline scripts; provided by entry.server.tsx, absent in the browser. */
export const NonceContext = createContext<string | undefined>(undefined);

/** The HTML document (Cedar's web/index.html). Rendered as React Router's root Layout. */
export const Document = ({ children }: { readonly children: ReactNode }) => {
  const nonce = useContext(NonceContext);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cedar test project on React Router</title>
        <link rel="stylesheet" href={appStylesHref} />
        <link rel="stylesheet" href={scaffoldStylesHref} />
        <Meta />
        {/* Empty nonce: browsers blank nonce attributes, so a nonce'd <link> can't hydrate. */}
        <Links nonce="" />
      </head>
      <body>
        <ApolloHydrationHelper>{children}</ApolloHydrationHelper>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
};
