import { useState, type ReactNode } from "react";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { AuthProvider } from "./auth.js";
const App = ({ children }: { children?: ReactNode }) => {
  const [client] = useState(
    () =>
      new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({
          uri: `${import.meta.env.VITE_API_URL ?? ""}/graphql`,
          credentials: "include",
        }),
        ssrMode: typeof window === "undefined",
      }),
  );
  return (
    <AuthProvider>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </AuthProvider>
  );
};
export default App;
