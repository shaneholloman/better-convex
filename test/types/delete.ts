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
// DELETE TYPE TESTS
// ============================================================================

// Test 1: delete without returning
{
  const result = await db.delete(users);

  Expect<Equal<undefined, typeof result>>;
}

// Test 2: delete with where clause
{
  const result = await db.delete(users).where(eq(users.name, 'Alice'));

  Expect<Equal<undefined, typeof result>>;
}

// Test 3: delete returning all
{
  const result = await db.delete(users).returning();

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

// Test 4: delete returning partial
{
  const result = await db.delete(users).returning({
    name: users.name,
  });

  type Expected = Array<{
    name: string;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 5: returning() cannot be called twice
{
  db.delete(users)
    .returning()
    // @ts-expect-error - returning already called
    .returning();
}

export {};
