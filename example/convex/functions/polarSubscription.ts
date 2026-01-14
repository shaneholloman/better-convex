import '../lib/polar-polyfills';

import { CRPCError } from 'better-convex/server';
import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';
import {
  authAction,
  authQuery,
  privateMutation,
  privateQuery,
} from '../lib/crpc';
import { getPolarClient } from '../lib/polar-client';
import { internal } from './_generated/api';

const subscriptionSchema = z.object({
  amount: z.number().nullish(),
  cancelAtPeriodEnd: z.boolean(),
  checkoutId: z.string().nullish(),
  createdAt: z.string(),
  currency: z.string().nullish(),
  currentPeriodEnd: z.string().nullish(),
  currentPeriodStart: z.string(),
  customerCancellationComment: z.string().nullish(),
  customerCancellationReason: z.string().nullish(),
  endedAt: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()),
  modifiedAt: z.string().nullish(),
  organizationId: zid('organization'),
  priceId: z.optional(z.string()),
  productId: z.string(),
  recurringInterval: z.string().nullish(),
  startedAt: z.string().nullish(),
  status: z.string(),
  subscriptionId: z.string(),
  userId: zid('user'),
});

// Create organization subscription (called from webhook)
export const createSubscription = privateMutation
  .input(z.object({ subscription: subscriptionSchema }))
  .output(z.null())
  .mutation(async ({ ctx, input: args }) => {
    // Check if subscription already exists
    const existing = await ctx
      .table('subscriptions')
      .get('subscriptionId', args.subscription.subscriptionId);

    if (existing) {
      throw new CRPCError({
        code: 'CONFLICT',
        message: `Subscription ${args.subscription.subscriptionId} already exists`,
      });
    }

    // Validate organizationId
    if (!args.subscription.organizationId) {
      throw new CRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'All subscriptions must be tied to an organization',
      });
    }

    // Check for existing active subscription
    const existingOrgSubscription = await ctx
      .table('subscriptions', 'organizationId_status', (q) =>
        q
          .eq('organizationId', args.subscription.organizationId)
          .eq('status', 'active')
      )
      .first();

    if (existingOrgSubscription) {
      throw new CRPCError({
        code: 'CONFLICT',
        message: 'Organization already has an active subscription',
      });
    }

    await ctx.table('subscriptions').insert(args.subscription);
    return null;
  });

// Update subscription (called from webhook)
export const updateSubscription = privateMutation
  .input(z.object({ subscription: subscriptionSchema }))
  .output(
    z.object({
      periodChanged: z.boolean(),
      subscriptionEnded: z.boolean(),
      updated: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input: args }) => {
    const existing = await ctx
      .table('subscriptions')
      .get('subscriptionId', args.subscription.subscriptionId);

    if (!existing) {
      return { periodChanged: false, subscriptionEnded: false, updated: false };
    }

    const periodChanged =
      existing.currentPeriodEnd !== args.subscription.currentPeriodEnd;
    const subscriptionEnded = !!args.subscription.endedAt && !existing.endedAt;

    await existing.patch(args.subscription);

    return { periodChanged, subscriptionEnded, updated: true };
  });

// Get active subscription for user
export const getActiveSubscription = privateQuery
  .input(z.object({ userId: zid('user') }))
  .output(
    z
      .object({
        cancelAtPeriodEnd: z.boolean(),
        currentPeriodEnd: z.string().nullish(),
        subscriptionId: z.string(),
      })
      .nullable()
  )
  .query(async ({ ctx, input: args }) => {
    const subscription = await ctx
      .table('subscriptions')
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();

    if (!subscription) return null;

    return {
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      subscriptionId: subscription.subscriptionId,
    };
  });

// Get organization subscription (for UI)
export const getOrganizationSubscription = authQuery
  .input(z.object({ organizationId: zid('organization') }))
  .output(
    z
      .object({
        cancelAtPeriodEnd: z.boolean(),
        currentPeriodEnd: z.string().nullish(),
        status: z.string(),
        subscriptionId: z.string(),
      })
      .nullable()
  )
  .query(async ({ ctx, input: args }) => {
    const subscription = await ctx
      .table('subscriptions', 'organizationId_status', (q) =>
        q.eq('organizationId', args.organizationId).eq('status', 'active')
      )
      .first();

    if (!subscription) return null;

    return {
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      status: subscription.status,
      subscriptionId: subscription.subscriptionId,
    };
  });

// Cancel subscription (user action)
export const cancelSubscription = authAction
  .output(z.object({ message: z.string(), success: z.boolean() }))
  .action(async ({ ctx }) => {
    const polar = getPolarClient();

    const subscription = await ctx.runQuery(
      internal.polarSubscription.getActiveSubscription,
      { userId: ctx.userId! }
    );

    if (!subscription) {
      throw new CRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No active subscription found',
      });
    }

    await polar.subscriptions.update({
      id: subscription.subscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });

    return { message: 'Subscription cancelled successfully', success: true };
  });

// Resume subscription (user action)
export const resumeSubscription = authAction
  .output(z.object({ message: z.string(), success: z.boolean() }))
  .action(async ({ ctx }) => {
    const polar = getPolarClient();

    const subscription = await ctx.runQuery(
      internal.polarSubscription.getActiveSubscription,
      { userId: ctx.userId! }
    );

    if (!subscription) {
      throw new CRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No active subscription found',
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new CRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Subscription is not set to cancel',
      });
    }

    await polar.subscriptions.update({
      id: subscription.subscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: false },
    });

    return { message: 'Subscription resumed successfully', success: true };
  });
