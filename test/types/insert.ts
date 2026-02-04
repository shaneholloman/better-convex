import {
  buildSchema,
  createDatabase,
  extractRelationsConfig,
} from 'better-convex/orm';
import type { GenericDatabaseWriter } from 'convex/server';
import type { GenericId } from 'convex/values';
import { users } from './tables-rel';
import { type Equal, Expect } from './utils';

const schemaConfig = buildSchema({ users });
const edgeMetadata = extractRelationsConfig(schemaConfig);
const mockDb = {} as GenericDatabaseWriter<any>;
const db = createDatabase(mockDb, schemaConfig, edgeMetadata);

// ============================================================================
// INSERT TYPE TESTS
// ============================================================================

// Test 1: insert without returning
{
  const result = await db.insert(users).values({
    name: 'Alice',
    email: 'alice@example.com',
    height: null,
    status: null,
    role: null,
    deletedAt: null,
    age: null,
    cityId: null,
    homeCityId: null,
  });

  Expect<Equal<undefined, typeof result>>;
}

// Test 2: insert returning all
{
  const result = await db
    .insert(users)
    .values({
      name: 'Alice',
      email: 'alice@example.com',
      height: null,
      status: null,
      role: null,
      deletedAt: null,
      age: null,
      cityId: null,
      homeCityId: null,
    })
    .returning();

  type Expected = Array<{
    _id: GenericId<'users'>;
    _creationTime: number;
    name: string;
    email: string;
    height: number | null;
    status: string | null;
    role: string | null;
    deletedAt: number | null;
    age: number | null;
    cityId: GenericId<'cities'> | null;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 3: insert returning partial
{
  const result = await db
    .insert(users)
    .values({
      name: 'Alice',
      email: 'alice@example.com',
      height: null,
      status: null,
      role: null,
      deletedAt: null,
      age: null,
      cityId: null,
      homeCityId: null,
    })
    .returning({
      name: users.name,
      city: users.cityId,
    });

  type Expected = Array<{
    name: string;
    city: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 4: onConflictDoNothing keeps returning type
{
  const result = await db
    .insert(users)
    .values({
      name: 'Alice',
      email: 'alice@example.com',
      height: null,
      status: null,
      role: null,
      deletedAt: null,
      age: null,
      cityId: null,
      homeCityId: null,
    })
    .onConflictDoNothing({ target: users.name })
    .returning();

  type Expected = Array<{
    _id: GenericId<'users'>;
    _creationTime: number;
    name: string;
    email: string;
    height: number | null;
    status: string | null;
    role: string | null;
    deletedAt: number | null;
    age: number | null;
    cityId: GenericId<'cities'> | null;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 5: onConflictDoUpdate keeps returning type
{
  const result = await db
    .insert(users)
    .values({
      name: 'Alice',
      email: 'alice@example.com',
      height: null,
      status: null,
      role: null,
      deletedAt: null,
      age: null,
      cityId: null,
      homeCityId: null,
    })
    .onConflictDoUpdate({
      target: users.name,
      set: { name: 'Updated' },
    })
    .returning({
      name: users.name,
    });

  type Expected = Array<{
    name: string;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 6: returning() cannot be called twice
{
  db.insert(users)
    .values({
      name: 'Alice',
      email: 'alice@example.com',
      height: null,
      status: null,
      role: null,
      deletedAt: null,
      age: null,
      cityId: null,
      homeCityId: null,
    })
    .returning()
    // @ts-expect-error - returning already called
    .returning();
}

export {};
