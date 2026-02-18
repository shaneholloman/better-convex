/** biome-ignore-all lint/suspicious/noExplicitAny: dev */
import { eq } from 'better-convex/orm';
import { CRPCError } from 'better-convex/server';
import { z } from 'zod';
import { privateAction, privateMutation, privateQuery } from '../lib/crpc';
import { getEnv } from '../lib/get-env';
import { deletePolarCustomers } from '../lib/polar-helpers';
import { internal } from './_generated/api';
import type { TableNames } from './_generated/dataModel';
import schema, { tables } from './schema';

const DELETE_BATCH_SIZE = 64;

// Clear all of the tables except...
const excludedTables = new Set<TableNames>();

/** Dev-only check helper */
const assertDevOnly = () => {
  if (getEnv().DEPLOY_ENV === 'production') {
    throw new CRPCError({
      code: 'FORBIDDEN',
      message: 'This function is only available in development',
    });
  }
};

export const reset = privateAction.output(z.null()).action(async ({ ctx }) => {
  assertDevOnly();
  // Delete all Polar customers first (comprehensive cleanup)
  await deletePolarCustomers();

  for (const tableName of Object.keys(schema.tables)) {
    if (excludedTables.has(tableName as TableNames)) {
      continue;
    }

    await ctx.scheduler.runAfter(0, internal.reset.deletePage, {
      cursor: null,
      tableName,
    });
  }

  return null;
});

export const deletePage = privateMutation
  .input(
    z.object({
      cursor: z.union([z.string(), z.null()]),
      tableName: z.string(),
    })
  )
  .output(z.null())
  .mutation(async ({ ctx, input }) => {
    assertDevOnly();
    const table = (tables as Record<string, any>)[input.tableName];
    if (!table) {
      throw new CRPCError({
        code: 'BAD_REQUEST',
        message: `Unknown table: ${input.tableName}`,
      });
    }

    const query = (ctx.orm.query as Record<string, any>)[input.tableName];
    if (!query || typeof query.findMany !== 'function') {
      throw new CRPCError({
        code: 'BAD_REQUEST',
        message: `Unknown query table: ${input.tableName}`,
      });
    }

    const results = await query.findMany({
      cursor: input.cursor,
      limit: DELETE_BATCH_SIZE,
    });

    for (const row of results.page) {
      try {
        await ctx.orm.delete(table).where(eq(table.id, (row as any).id));
      } catch {
        // Document might have been deleted by a trigger or concurrent process
      }
    }

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.reset.deletePage, {
        cursor: results.continueCursor,
        tableName: input.tableName,
      });
    }

    return null;
  });

export const getAdminUsers = privateQuery
  .output(
    z.array(
      z.object({
        customerId: z.string().optional().nullable(),
      })
    )
  )
  .query(async ({ ctx }) => {
    assertDevOnly();
    const adminEmails = getEnv().ADMIN;
    if (!adminEmails.length) return [];

    const admins = await ctx.orm.query.user.findMany({
      where: { email: { in: adminEmails } },
      limit: adminEmails.length,
      columns: { customerId: true },
    });

    return admins
      .filter((u): u is typeof u & { customerId: string } => !!u.customerId)
      .map((u) => ({ customerId: u.customerId }));
  });
