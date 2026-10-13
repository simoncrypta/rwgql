import React, { Suspense } from "react";

import type { OperationVariables } from "@apollo/client";
import { useQuery, useSuspenseQuery } from "@apollo/client/react";

import type {
  BeforeQueryOptions,
  BeforeQueryResult,
  CellMappedProps,
  CellVariableProps,
  CreateCellBaseOptions,
  CreateCellOptions,
  CreateCellOptionsWithBeforeQuery,
  CellQueryResult,
  InputVarProps,
} from "./types.js";

export function createCell<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
  TProps extends object = object,
>(
  options: CreateCellOptions<TData, TVariables, TProps>,
): React.ComponentType<React.PropsWithChildren<CellVariableProps<TVariables, TProps>>>;
export function createCell<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
  TProps extends object = InputVarProps<TVariables>,
>(
  options: CreateCellOptionsWithBeforeQuery<TData, TVariables, TProps>,
): React.ComponentType<React.PropsWithChildren<CellMappedProps<TVariables, TProps>>>;
export function createCell<
  TData extends object,
  TVariables extends OperationVariables,
  TProps extends object,
>(
  options:
    | CreateCellOptions<TData, TVariables, TProps>
    | CreateCellOptionsWithBeforeQuery<TData, TVariables, TProps>,
) {
  if (options.beforeQuery) {
    return createCellComponent<TData, TVariables, CellMappedProps<TVariables, TProps>, TProps>(
      options,
    );
  }

  return createCellComponent<
    TData,
    TVariables,
    CellVariableProps<TVariables, TProps>,
    CellVariableProps<TVariables, TProps>
  >(options);
}

function createCellComponent<
  TData extends object,
  TVariables extends OperationVariables,
  TCellProps extends { readonly variables?: TVariables },
  TBeforeQueryProps extends object,
>({
  QUERY,
  Loading = DefaultLoading,
  Failure,
  Success,
  Empty,
  isEmpty = defaultIsEmpty,
  displayName = "Cell",
  beforeQuery,
  suspense = false,
}: CreateCellBaseOptions<TData, TVariables, TCellProps> & {
  readonly beforeQuery?: (props: TBeforeQueryProps) => BeforeQueryResult<TData, TVariables>;
}): React.ComponentType<React.PropsWithChildren<TCellProps>> {
  if (suspense) {
    function SuspenseCellBody(props: React.PropsWithChildren<TCellProps>) {
      const query = typeof QUERY === "function" ? QUERY(props) : QUERY;
      const { notifyOnNetworkStatusChange: _notify, ...options } = getQueryOptions<
        TData,
        TVariables,
        TCellProps,
        TBeforeQueryProps
      >(props, beforeQuery);
      const result = useSuspenseQuery<TData, TVariables>(
        query,
        options as useSuspenseQuery.Options<TVariables>,
      );
      // Same shape where Cells use it (data, refetch, fetchMore, networkStatus).
      const queryResult = result as unknown as CellQueryResult<TData, TVariables>;
      const data = result.data as TData;
      const State = Empty && isEmpty(data) ? Empty : Success;

      return <State {...props} {...data} queryResult={queryResult} />;
    }

    function SuspenseCell(props: React.PropsWithChildren<TCellProps>) {
      const variables = getQueryOptions<TData, TVariables, TCellProps, TBeforeQueryProps>(
        props,
        beforeQuery,
      ).variables;

      return (
        <CellErrorBoundary
          key={JSON.stringify(variables ?? {})}
          renderFailure={
            Failure
              ? (error) => <Failure {...props} error={error} errorCode={getErrorCode(error)} />
              : undefined
          }
        >
          <Suspense fallback={<Loading {...props} />}>
            <SuspenseCellBody {...props} />
          </Suspense>
        </CellErrorBoundary>
      );
    }

    SuspenseCell.displayName = displayName;

    return SuspenseCell;
  }

  function Cell(props: React.PropsWithChildren<TCellProps>) {
    const query = typeof QUERY === "function" ? QUERY(props) : QUERY;
    const queryOptions = getQueryOptions<TData, TVariables, TCellProps, TBeforeQueryProps>(
      props,
      beforeQuery,
    );
    const queryResult = useQuery<TData, TVariables>(query, queryOptions);
    const { data, loading, error } = queryResult;

    if (error) {
      if (!Failure) {
        throw error;
      }

      return (
        <Failure
          {...props}
          error={error}
          errorCode={getErrorCode(error)}
          queryResult={queryResult}
        />
      );
    }

    if (data) {
      const State = Empty && isEmpty(data) ? Empty : Success;

      return <State {...props} {...data} queryResult={queryResult} />;
    }

    if (loading) {
      return <Loading {...props} queryResult={queryResult} />;
    }

    throw new CellRenderStateError();
  }

  Cell.displayName = displayName;

  return Cell;
}

class CellRenderStateError extends Error {
  constructor() {
    super(
      "Cannot render Cell: reached an unexpected state where the query succeeded but `data` is null.",
    );
    this.name = "CellRenderStateError";
  }
}

type CellErrorBoundaryProps = {
  readonly children: React.ReactNode;
  readonly renderFailure?: (error: Error) => React.ReactNode;
};

/** Renders a suspense Cell's Failure; without one, rethrows like the useQuery Cell does. */
class CellErrorBoundary extends React.Component<CellErrorBoundaryProps, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (!this.props.renderFailure) {
      throw error;
    }

    return this.props.renderFailure(error);
  }
}

function DefaultLoading() {
  return <>Loading...</>;
}

// Cedar's Cell defaults; cache-first leaves lists stale after client-side navigation.
const DEFAULT_CELL_QUERY_OPTIONS = {
  fetchPolicy: "cache-and-network",
  notifyOnNetworkStatusChange: true,
} as const satisfies Partial<useQuery.Options<object, OperationVariables>>;

function getQueryOptions<
  TData extends object,
  TVariables extends OperationVariables,
  TCellProps extends { readonly variables?: TVariables },
  TBeforeQueryProps extends object,
>(
  props: React.PropsWithChildren<TCellProps>,
  beforeQuery?: (props: TBeforeQueryProps) => BeforeQueryResult<TData, TVariables>,
): useQuery.Options<TData, TVariables> {
  const { children: _children, variables: explicitVariables, ...cellProps } = props;

  if (beforeQuery) {
    const beforeQueryResult = beforeQuery(cellProps as TBeforeQueryProps);

    if (isQueryOptions(beforeQueryResult)) {
      return {
        ...DEFAULT_CELL_QUERY_OPTIONS,
        ...beforeQueryResult,
      };
    }

    return {
      ...DEFAULT_CELL_QUERY_OPTIONS,
      variables: beforeQueryResult,
    };
  }

  if (explicitVariables) {
    return {
      ...DEFAULT_CELL_QUERY_OPTIONS,
      variables: explicitVariables,
    };
  }

  return {
    ...DEFAULT_CELL_QUERY_OPTIONS,
    variables: cellProps as TVariables,
  };
}

function isQueryOptions<TData extends object, TVariables extends OperationVariables>(
  value: BeforeQueryResult<TData, TVariables>,
): value is BeforeQueryOptions<TData, TVariables> {
  return typeof value === "object" && value !== null && "variables" in value;
}

function defaultIsEmpty<TData extends object>(data: TData) {
  const values = Object.values(data);

  if (values.length === 0) {
    return true;
  }

  return values.every((value) => {
    if (value === null || value === undefined) {
      return true;
    }

    return Array.isArray(value) && value.length === 0;
  });
}

function getErrorCode(error: Error): string | undefined {
  if (!("graphQLErrors" in error)) {
    return undefined;
  }

  const { graphQLErrors } = error;

  if (!Array.isArray(graphQLErrors)) {
    return undefined;
  }

  const [firstError] = graphQLErrors;

  if (typeof firstError !== "object" || firstError === null || !("extensions" in firstError)) {
    return undefined;
  }

  const { extensions } = firstError;

  if (typeof extensions !== "object" || extensions === null || !("code" in extensions)) {
    return undefined;
  }

  return typeof extensions.code === "string" ? extensions.code : undefined;
}
