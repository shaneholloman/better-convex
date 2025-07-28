import {
  type AuthFunctions,
  type PublicAuthFunctions,
  BetterAuth,
  convexAdapter,
} from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth';
import { entsTableFactory } from 'convex-ents';
import { customCtx } from 'convex-helpers/server/customFunctions';
import { zCustomQuery } from 'convex-helpers/server/zod';

import type { DataModel, Id } from './_generated/dataModel';

import { api, components, internal } from './_generated/api';
import {
  type GenericCtx,
  type MutationCtx,
  type QueryCtx,
  query,
} from './_generated/server';
import { getAuthUserId } from './functions';
import { entDefinitions } from './schema';
import { mapSessionToUser } from './user/mapSessionToUser';

const authFunctions: AuthFunctions = internal.auth;
const publicAuthFunctions: PublicAuthFunctions = api.auth;

export const betterAuthComponent = new BetterAuth(components.betterAuth, {
  authFunctions,
  publicAuthFunctions,
  verbose: false,
});

export const createAuth = (ctx: GenericCtx) => {
  const baseURL = process.env.NEXT_PUBLIC_SITE_URL!;

  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'github'],
      },
    },
    baseURL,
    database: convexAdapter(ctx, betterAuthComponent),
    plugins: [convex()],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 15, // 15 days
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        mapProfileToUser: async (profile) => {
          return {
            email: profile.email,
            image: profile.avatar_url,
            name: profile.name || profile.login,
          };
        },
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        mapProfileToUser: async (profile) => {
          return {
            email: profile.email,
            image: profile.picture,
            name: profile.name,
          };
        },
      },
    },
    user: {
      changeEmail: {
        enabled: false,
      },
      deleteUser: {
        enabled: false,
      },
    },
  });
};

export const {
  createSession,
  createUser,
  deleteUser,
  isAuthenticated,
  updateUser,
} = betterAuthComponent.createAuthFunctions<DataModel>({
  onCreateUser: async (ctx, user) => {
    // Check if user already exists by email
    const table = entsTableFactory(ctx, entDefinitions);
    const existingUserByEmail = await table('users').get('email', user.email);

    if (existingUserByEmail) {
      // User already exists, return their ID instead of creating a new one
      return existingUserByEmail._id;
    }

    // Check if user is a superadmin
    // const isSuperAdmin = getEnv().SUPERADMIN.includes(user.email);

    // Create user in application users table
    const userId = await table('users').insert({
      // bio: profileData.bio || undefined,
      email: user.email,
      emailVerified: user.emailVerified || false,
      image: user.image || undefined,
      name: user.name || undefined,
    });

    return userId;
  },
  onDeleteUser: async (ctx, userId) => {
    // Delete user from database
    const table = entsTableFactory(ctx, entDefinitions);
    await table('users')
      .getX(userId as Id<'users'>)
      .delete();
  },
  onUpdateUser: async (ctx, user) => {
    const userId = user.userId as Id<'users'>;
    const updates: any = {
      email: user.email,
    };

    // Update additional fields if provided
    if (user.name !== undefined) {
      updates.name = user.name;
    }
    if (user.image !== undefined) {
      updates.image = user.image;
    }
    if (user.emailVerified !== undefined) {
      updates.emailVerified = user.emailVerified;
    }

    const table = entsTableFactory(ctx, entDefinitions);
    await table('users').getX(userId).patch(updates);
  },
});

// Query to fetch user id for auth checks. Needs to stay in this file for cyclic dependency.
export const userIdQuery = zCustomQuery(
  query,
  customCtx(async (ctx) => {
    const authData = await getAuthUserId(ctx);

    return authData;
  })
);

// Query to fetch user data for session/auth checks
export const getSessionUser = async (ctx: QueryCtx) => {
  const userId = await betterAuthComponent.getAuthUserId(ctx);

  if (!userId) {
    return null;
  }

  const table = entsTableFactory(ctx, entDefinitions);
  const user = await table('users').get(userId as Id<'users'>);

  if (!user) {
    return null;
  }

  return mapSessionToUser(user);
};

export const getSessionUserWriter = async (ctx: MutationCtx) => {
  const userId = await betterAuthComponent.getAuthUserId(ctx);

  if (!userId) {
    return null;
  }

  const table = entsTableFactory(ctx, entDefinitions);
  const user = await table('users').get(userId as Id<'users'>);

  if (!user) {
    return null;
  }

  const sessionUser = mapSessionToUser(user);
  return {
    ...sessionUser,
    delete: user.delete,
    doc: user.doc,
    edge: user.edge,
    edgeX: user.edgeX,
    patch: user.patch,
    replace: user.replace,
  };
};
