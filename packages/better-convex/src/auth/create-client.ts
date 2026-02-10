import type { GenericCtx } from '@convex-dev/better-auth';
import type { BetterAuthOptions } from 'better-auth';

import {
  type DocumentByName,
  type FunctionReference,
  type GenericDataModel,
  type GenericMutationCtx,
  type GenericSchema,
  internalMutationGeneric,
  type SchemaDefinition,
  type TableNamesInDataModel,
} from 'convex/server';
import { v } from 'convex/values';

import { dbAdapter, httpAdapter } from './adapter';

export type AuthFunctions = {
  create: FunctionReference<'mutation', 'internal', Record<string, any>>;
  deleteMany: FunctionReference<'mutation', 'internal', Record<string, any>>;
  deleteOne: FunctionReference<'mutation', 'internal', Record<string, any>>;
  findMany: FunctionReference<'query', 'internal', Record<string, any>>;
  findOne: FunctionReference<'query', 'internal', Record<string, any>>;
  updateMany: FunctionReference<'mutation', 'internal', Record<string, any>>;
  updateOne: FunctionReference<'mutation', 'internal', Record<string, any>>;
  onCreate: FunctionReference<'mutation', 'internal', Record<string, any>>;
  onDelete: FunctionReference<'mutation', 'internal', Record<string, any>>;
  onUpdate: FunctionReference<'mutation', 'internal', Record<string, any>>;
  beforeCreate?: FunctionReference<'mutation', 'internal', Record<string, any>>;
  beforeDelete?: FunctionReference<'mutation', 'internal', Record<string, any>>;
  beforeUpdate?: FunctionReference<'mutation', 'internal', Record<string, any>>;
};

export type Triggers<
  DataModel extends GenericDataModel,
  Schema extends SchemaDefinition<any, any>,
> = {
  [K in Extract<
    keyof Schema['tables'] & string,
    TableNamesInDataModel<DataModel>
  >]?: {
    beforeCreate?: (
      ctx: GenericMutationCtx<DataModel>,
      data: Omit<DocumentByName<DataModel, K>, '_id' | '_creationTime'>
    ) => Promise<
      Omit<DocumentByName<DataModel, K>, '_id' | '_creationTime'> | undefined
    >;
    beforeDelete?: (
      ctx: GenericMutationCtx<DataModel>,
      doc: DocumentByName<DataModel, K>
    ) => Promise<DocumentByName<DataModel, K> | undefined>;
    beforeUpdate?: (
      ctx: GenericMutationCtx<DataModel>,
      doc: DocumentByName<DataModel, K>,
      update: Partial<
        Omit<DocumentByName<DataModel, K>, '_id' | '_creationTime'>
      >
    ) => Promise<
      | Partial<Omit<DocumentByName<DataModel, K>, '_id' | '_creationTime'>>
      | undefined
    >;
    onCreate?: (
      ctx: GenericMutationCtx<DataModel>,
      doc: DocumentByName<DataModel, K>
    ) => Promise<void>;
    onDelete?: (
      ctx: GenericMutationCtx<DataModel>,
      doc: DocumentByName<DataModel, K>
    ) => Promise<void>;
    onUpdate?: (
      ctx: GenericMutationCtx<DataModel>,
      newDoc: DocumentByName<DataModel, K>,
      oldDoc: DocumentByName<DataModel, K>
    ) => Promise<void>;
  };
};

export const createClient = <
  DataModel extends GenericDataModel,
  Schema extends SchemaDefinition<GenericSchema, true>,
>(config: {
  authFunctions: AuthFunctions;
  schema: Schema;
  internalMutation?: typeof internalMutationGeneric;
  triggers?: Triggers<DataModel, Schema>;
}) => ({
  authFunctions: config.authFunctions,
  triggers: config.triggers,
  adapter: (
    ctx: GenericCtx<DataModel>,
    createAuthOptions: (ctx: any) => BetterAuthOptions
  ) => dbAdapter(ctx, createAuthOptions, config),
  httpAdapter: (ctx: GenericCtx<DataModel>) => httpAdapter(ctx, config),
  triggersApi: () => {
    const mutationBuilder = config.internalMutation ?? internalMutationGeneric;
    const getTriggers = (model: string) =>
      config.triggers?.[model as keyof Triggers<DataModel, Schema>];

    return {
      beforeCreate: mutationBuilder({
        args: {
          data: v.any(),
          model: v.string(),
        },
        handler: async (ctx, args) =>
          (await getTriggers(args.model)?.beforeCreate?.(ctx, args.data)) ??
          args.data,
      }),
      beforeDelete: mutationBuilder({
        args: {
          doc: v.any(),
          model: v.string(),
        },
        handler: async (ctx, args) =>
          (await getTriggers(args.model)?.beforeDelete?.(ctx, args.doc)) ??
          args.doc,
      }),
      beforeUpdate: mutationBuilder({
        args: {
          doc: v.any(),
          model: v.string(),
          update: v.any(),
        },
        handler: async (ctx, args) =>
          (await getTriggers(args.model)?.beforeUpdate?.(
            ctx,
            args.doc,
            args.update
          )) ?? args.update,
      }),
      onCreate: mutationBuilder({
        args: {
          doc: v.any(),
          model: v.string(),
        },
        handler: async (ctx, args) => {
          await getTriggers(args.model)?.onCreate?.(ctx, args.doc);
        },
      }),
      onDelete: mutationBuilder({
        args: {
          doc: v.any(),
          model: v.string(),
        },
        handler: async (ctx, args) => {
          await getTriggers(args.model)?.onDelete?.(ctx, args.doc);
        },
      }),
      onUpdate: mutationBuilder({
        args: {
          model: v.string(),
          newDoc: v.any(),
          oldDoc: v.any(),
        },
        handler: async (ctx, args) => {
          await getTriggers(args.model)?.onUpdate?.(
            ctx,
            args.newDoc,
            args.oldDoc
          );
        },
      }),
    };
  },
});
