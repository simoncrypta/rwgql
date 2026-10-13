import {
  NavLink as ReactRouterNavLink,
  type NavLinkProps as ReactRouterNavLinkProps,
} from "react-router";

export { Link, type LinkProps } from "react-router";

export type NavLinkProps = Omit<ReactRouterNavLinkProps, "className" | "end"> & {
  readonly className?: string;
  /** Class used instead of `className` while the link is active (Cedar). */
  readonly activeClassName?: string;
  /** Also treat sub-paths of `to` as active (Cedar). Defaults to false. */
  readonly matchSubPaths?: boolean;
};

/** Cedar's `<NavLink activeClassName matchSubPaths>` over React Router's NavLink. */
export const NavLink = ({
  activeClassName,
  className,
  matchSubPaths = false,
  ...props
}: NavLinkProps) => (
  <ReactRouterNavLink
    {...props}
    end={!matchSubPaths}
    className={({ isActive }) => (isActive ? (activeClassName ?? className) : className)}
  />
);
