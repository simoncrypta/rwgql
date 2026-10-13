import type * as matchers from "@testing-library/jest-dom/matchers";
import "vite-plus/test";
declare module "vite-plus/test" {
  interface Assertion<T = unknown> extends matchers.TestingLibraryMatchers<void, T> {}
}
