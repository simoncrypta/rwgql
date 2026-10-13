import { useEffect } from "react";
import { Navigate, useNavigate, type NavigateFunction } from "react-router";

let navigator: NavigateFunction | undefined;

/**
 * Captures React Router's navigate function so Cedar's module-level `navigate()` works outside
 * components. Rendered by the generated root route.
 */
export const NavigationBridge = () => {
  const navigateFn = useNavigate();

  useEffect(() => {
    navigator = navigateFn;
    return () => {
      if (navigator === navigateFn) {
        navigator = undefined;
      }
    };
  }, [navigateFn]);

  return null;
};

export type NavigateOptions = {
  readonly replace?: boolean;
};

/** Cedar's `navigate(to, { replace })`. Falls back to a full page load before hydration. */
export const navigate = (to: string, options: NavigateOptions = {}) => {
  if (navigator) {
    void navigator(to, { replace: options.replace });
    return;
  }

  if (typeof window === "undefined") {
    throw new Error("@rwgql/router: navigate() cannot be called during server rendering");
  }

  if (options.replace) {
    window.location.replace(to);
  } else {
    window.location.assign(to);
  }
};

/** Cedar's `back()`. */
export const back = () => {
  if (navigator) {
    void navigator(-1);
  } else if (typeof window !== "undefined") {
    window.history.back();
  }
};

export type RedirectProps = {
  readonly to: string;
  readonly options?: NavigateOptions;
};

/** Cedar's `<Redirect to>`. */
export const Redirect = ({ to, options }: RedirectProps) => (
  <Navigate to={to} replace={options?.replace} />
);
