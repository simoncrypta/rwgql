import { parseRoutePath } from "./routeParams.js";

/** Cedar path → colon/splat pattern (`/posts/{id:Int}` → `/posts/:id`, `{path...}` → `*`). */
export const normalizeRedwoodPath = (path: string): string => parseRoutePath(path).path;

/** Normalize URL pathnames for stable comparisons (e.g. NavLink active state). */
export const normalizePathname = (pathname: string): string => {
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
};
