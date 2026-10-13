/** Normalize URL pathnames for stable comparisons (e.g. NavLink active state). */
export const normalizePathname = (pathname: string): string => {
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
};
