/**
 * Test InferModelFromColumns with actual table columns
 */

// Import actual InferModelFromColumns from types
import type { InferModelFromColumns } from 'better-convex/orm';
import { convexTable, id, integer, text } from 'better-convex/orm';
import type { GenericId } from 'convex/values';
import { type Equal, Expect } from './utils';

// Test with actual columns from tables-rel.ts
{
  const columns = {
    name: text().notNull(),
    email: text().notNull(),
    age: integer(),
    cityId: id('cities').notNull(),
    homeCityId: id('cities'),
  };

  type Result = InferModelFromColumns<typeof columns>;

  type Expected = {
    _id: string;
    _creationTime: number;
    name: string; // Should be string (notNull)
    email: string; // Should be string (notNull)
    age: number | null; // Should be number | null (nullable)
    cityId: GenericId<'cities'>; // Should be GenericId<'cities'> (notNull ID)
    homeCityId: GenericId<'cities'> | null; // Should be GenericId<'cities'> | null (nullable ID)
  };

  Expect<Equal<Result, Expected>>;
}

// Test with convexTable
{
  const users = convexTable('users', {
    name: text().notNull(),
    email: text().notNull(),
  });

  type Columns = (typeof users)['_']['columns'];
  type Result = InferModelFromColumns<Columns>;

  type Expected = {
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
  };

  Expect<Equal<Result, Expected>>;
}

export {};
