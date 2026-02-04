import {
  buildSchema,
  createDatabase,
  eq,
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
// UPDATE TYPE TESTS
// ============================================================================

// Test 1: update without returning
{
  const result = await db.update(users).set({ name: 'Alice' });

  Expect<Equal<undefined, typeof result>>;
}

// Test 2: update with where clause
{
  const result = await db
    .update(users)
    .set({ name: 'Alice' })
    .where(eq(users.name, 'Alice'));

  Expect<Equal<undefined, typeof result>>;
}

// Test 3: update returning all
{
  const result = await db.update(users).set({ name: 'Alice' }).returning();

  type Expected = Array<{
    _id: GenericId<'users'>;
    _creationTime: number;
    name: string;
    email: string;
    height: number | null;
    age: number | null;
    status: string | null;
    role: string | null;
    deletedAt: number | null;
    cityId: GenericId<'cities'> | null;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 4: update returning partial
{
  const result = await db.update(users).set({ name: 'Alice' }).returning({
    name: users.name,
  });

  type Expected = Array<{
    name: string;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 5: returning() cannot be called twice
{
  db.update(users)
    .set({ name: 'Alice' })
    .returning()
    // @ts-expect-error - returning already called
    .returning();
}

export {};
