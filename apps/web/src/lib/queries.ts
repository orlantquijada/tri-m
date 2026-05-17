import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  QueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import { parseApiError } from "./api";

type Id = number | string;

type ApiResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type RespOf<F> = F extends (...args: never[]) => Promise<infer R>
  ? R extends { json: () => Promise<infer J> }
    ? J
    : never
  : never;

type ListFn = () => Promise<ApiResponse>;
type DetailFn<TId extends Id> = (id: TId) => Promise<ApiResponse>;
type CreateFn<TData> = (data: TData) => Promise<ApiResponse>;
type UpdateFn<TId extends Id, TData> = (
  id: TId,
  data: TData
) => Promise<ApiResponse>;

type QueryOpObject<F extends (...args: never[]) => Promise<ApiResponse>> = {
  errorMessage?: string;
  fn: F;
};

type QueryOpInput<F extends (...args: never[]) => Promise<ApiResponse>> =
  | F
  | QueryOpObject<F>;

// oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
type CreateOpObject<F extends CreateFn<any>> = {
  errorMessage?: string;
  fn: F;
  onSuccess?: (ctx: {
    queryClient: QueryClient;
    result: RespOf<F>;
    vars: Parameters<F>[0];
  }) => void;
};

// oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
type CreateOpInput<F extends CreateFn<any>> = CreateOpObject<F> | F;

// oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
type UpdateOpObject<TId extends Id, F extends UpdateFn<TId, any>> = {
  errorMessage?: string;
  fn: F;
  onSuccess?: (ctx: {
    queryClient: QueryClient;
    result: RespOf<F>;
    vars: { data: Parameters<F>[1]; id: TId };
  }) => void;
};

type UpdateOpInput<
  TId extends Id,
  // oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
  F extends UpdateFn<TId, any>,
> = F | UpdateOpObject<TId, F>;

type ResourceKeys<TId extends Id> = {
  all: readonly [string];
  detail: (id: TId) => readonly [string, "detail", TId];
  details: () => readonly [string, "detail"];
  lists: () => readonly [string, "list"];
};

function keyTree<TId extends Id>(name: string): ResourceKeys<TId> {
  return {
    all: [name] as const,
    detail: (id: TId) => [name, "detail", id] as const,
    details: () => [name, "detail"] as const,
    lists: () => [name, "list"] as const,
  };
}

type ResourceConfig<
  TId extends Id = number,
  TList extends ListFn = ListFn,
  // oxlint-disable-next-line typescript/no-explicit-any factory infers id/data shape from caller's fn signatures
  TDetail extends DetailFn<any> = DetailFn<TId>,
  // oxlint-disable-next-line typescript/no-explicit-any factory infers id/data shape from caller's fn signatures
  TCreate extends CreateFn<any> = CreateFn<any>,
  // oxlint-disable-next-line typescript/no-explicit-any factory infers id/data shape from caller's fn signatures
  TUpdate extends UpdateFn<any, any> = UpdateFn<TId, any>,
> = {
  create?: CreateOpInput<TCreate>;
  detail?: QueryOpInput<TDetail>;
  idType?: TId extends string ? "string" : "number";
  list?: QueryOpInput<TList>;
  name: string;
  update?: UpdateOpInput<TId, TUpdate>;
};

type ListOpFn<C> = C extends { list: infer L }
  ? L extends QueryOpObject<infer F>
    ? F
    : L
  : never;

type DetailOpFn<C> = C extends { detail: infer D }
  ? D extends QueryOpObject<infer F>
    ? F
    : D
  : never;

type CreateOpFn<C> = C extends { create: infer K }
  ? K extends CreateOpObject<infer F>
    ? F
    : K
  : never;

type UpdateOpFn<C> = C extends { update: infer U }
  ? U extends UpdateOpObject<Id, infer F>
    ? F
    : U
  : never;

type IdOf<C> = C extends { idType: "string" } ? string : number;

type WithList<C> =
  ListOpFn<C> extends ListFn
    ? { useList: () => UseQueryResult<RespOf<ListOpFn<C>>, Error> }
    : object;

type WithDetail<C, TId extends Id> =
  DetailOpFn<C> extends DetailFn<TId>
    ? { useDetail: (id: TId) => UseQueryResult<RespOf<DetailOpFn<C>>, Error> }
    : object;

type WithCreate<C> =
  // oxlint-disable-next-line typescript/no-explicit-any factory infers id/data shape from caller's fn signatures
  CreateOpFn<C> extends CreateFn<any>
    ? {
        useCreate: () => UseMutationResult<
          RespOf<CreateOpFn<C>>,
          Error,
          Parameters<CreateOpFn<C>>[0]
        >;
      }
    : object;

type WithUpdate<C, TId extends Id> =
  // oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
  UpdateOpFn<C> extends UpdateFn<TId, any>
    ? {
        useUpdate: () => UseMutationResult<
          RespOf<UpdateOpFn<C>>,
          Error,
          { data: Parameters<UpdateOpFn<C>>[1]; id: TId }
        >;
      }
    : object;

type ResourceQueries<C> = {
  keys: ResourceKeys<IdOf<C>>;
} & WithList<C> &
  WithDetail<C, IdOf<C>> &
  WithCreate<C> &
  WithUpdate<C, IdOf<C>>;

function unwrapQuery<F extends (...args: never[]) => Promise<ApiResponse>>(
  op: QueryOpInput<F>,
  defaultMessage: string
): { fn: F; errorMessage: string } {
  if (typeof op === "function") {
    return { errorMessage: defaultMessage, fn: op };
  }
  return { errorMessage: op.errorMessage ?? defaultMessage, fn: op.fn };
}

// oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
function unwrapCreate<F extends CreateFn<any>>(
  op: CreateOpInput<F>,
  defaultMessage: string
): {
  errorMessage: string;
  fn: F;
  onSuccess?: CreateOpObject<F>["onSuccess"];
} {
  if (typeof op === "function") {
    return { errorMessage: defaultMessage, fn: op };
  }
  return {
    errorMessage: op.errorMessage ?? defaultMessage,
    fn: op.fn,
    onSuccess: op.onSuccess,
  };
}

function unwrapUpdate<
  TId extends Id,
  // oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
  F extends UpdateFn<TId, any>,
>(
  op: UpdateOpInput<TId, F>,
  defaultMessage: string
): {
  errorMessage: string;
  fn: F;
  onSuccess?: UpdateOpObject<TId, F>["onSuccess"];
} {
  if (typeof op === "function") {
    return { errorMessage: defaultMessage, fn: op };
  }
  return {
    errorMessage: op.errorMessage ?? defaultMessage,
    fn: op.fn,
    onSuccess: op.onSuccess,
  };
}

async function runFetch<T>(
  call: () => Promise<ApiResponse>,
  errorMessage: string
): Promise<T> {
  const res = await call();
  if (!res.ok) {
    throw await parseApiError(res as unknown as Response, errorMessage);
  }
  return (await res.json()) as T;
}

export function createResourceQueries<
  C extends ResourceConfig<
    Id,
    ListFn,
    // oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
    DetailFn<any>,
    // oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
    CreateFn<any>,
    // oxlint-disable-next-line typescript/no-explicit-any factory infers data shape from caller's fn signature
    UpdateFn<any, any>
  >,
>(config: C): ResourceQueries<C> {
  const { name } = config;
  const keys = keyTree<IdOf<C>>(name);
  const result: Record<string, unknown> = { keys };

  if (config.list) {
    const { fn, errorMessage } = unwrapQuery(
      config.list,
      `Failed to fetch ${name}`
    );
    result.useList = function useList() {
      return useQuery({
        queryFn: () => runFetch<RespOf<typeof fn>>(fn, errorMessage),
        queryKey: keys.lists(),
      });
    };
  }

  if (config.detail) {
    const { fn, errorMessage } = unwrapQuery(
      config.detail,
      `Failed to fetch ${name}`
    );
    result.useDetail = function useDetail(id: IdOf<C>) {
      return useQuery({
        queryFn: () =>
          runFetch<RespOf<typeof fn>>(() => fn(id as never), errorMessage),
        queryKey: keys.detail(id),
      });
    };
  }

  if (config.create) {
    const { fn, errorMessage, onSuccess } = unwrapCreate(
      config.create,
      `Failed to create ${name}`
    );
    result.useCreate = function useCreate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (vars: Parameters<typeof fn>[0]) =>
          runFetch<RespOf<typeof fn>>(() => fn(vars), errorMessage),
        onSuccess: (data, vars) => {
          void queryClient.invalidateQueries({ queryKey: keys.lists() });
          onSuccess?.({
            queryClient,
            result: data as RespOf<typeof fn>,
            vars,
          });
        },
      });
    };
  }

  if (config.update) {
    const { fn, errorMessage, onSuccess } = unwrapUpdate(
      config.update,
      `Failed to update ${name}`
    );
    result.useUpdate = function useUpdate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (vars: { data: Parameters<typeof fn>[1]; id: IdOf<C> }) =>
          runFetch<RespOf<typeof fn>>(
            () => fn(vars.id as never, vars.data),
            errorMessage
          ),
        onSuccess: (data, vars) => {
          void queryClient.invalidateQueries({ queryKey: keys.lists() });
          void queryClient.invalidateQueries({
            queryKey: keys.detail(vars.id),
          });
          onSuccess?.({
            queryClient,
            result: data as RespOf<typeof fn>,
            vars,
          });
        },
      });
    };
  }

  return result as ResourceQueries<C>;
}
