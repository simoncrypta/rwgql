import type { ReactNode } from "react";

import { AuthProvider } from "@/auth";

/** App-wide providers (Cedar's web/src/App.tsx). Apollo is provided by the entry files. */
const App = ({ children }: { readonly children?: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

export default App;
