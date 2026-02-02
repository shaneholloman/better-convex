import type { GetColumnData } from 'better-convex/orm';

import { bigint, boolean, id, integer, text } from 'better-convex/orm';
import type { GenericId } from 'convex/values';

import { type Equal, Expect } from './utils';

// ============================================================================
// Helper type to test GetColumnData with 'raw' mode
// (FilterOperators use 'raw' mode for value parameters)
// ============================================================================

// Test 1: GetColumnData in raw mode with notNull text
{
  const name = text().notNull();
  type ValueType = GetColumnData<typeof name, 'raw'>;

  Expect<Equal<ValueType, string>>;
}

// Test 2: GetColumnData in raw mode with nullable text (strips null)
{
  const bio = text(); // nullable
  type ValueType = GetColumnData<typeof bio, 'raw'>;

  // raw mode strips null union
  Expect<Equal<ValueType, string>>;
}

// Test 3: GetColumnData in raw mode with notNull integer
{
  const age = integer().notNull();
  type ValueType = GetColumnData<typeof age, 'raw'>;

  Expect<Equal<ValueType, number>>;
}

// Test 4: GetColumnData in raw mode with nullable integer (strips null)
{
  const score = integer(); // nullable
  type ValueType = GetColumnData<typeof score, 'raw'>;

  Expect<Equal<ValueType, number>>;
}

// Test 5: GetColumnData in raw mode with notNull boolean
{
  const isActive = boolean().notNull();
  type ValueType = GetColumnData<typeof isActive, 'raw'>;

  Expect<Equal<ValueType, boolean>>;
}

// Test 6: GetColumnData in raw mode with nullable boolean (strips null)
{
  const isVerified = boolean(); // nullable
  type ValueType = GetColumnData<typeof isVerified, 'raw'>;

  Expect<Equal<ValueType, boolean>>;
}

// Test 7: GetColumnData in raw mode with notNull bigint
{
  const timestamp = bigint().notNull();
  type ValueType = GetColumnData<typeof timestamp, 'raw'>;

  Expect<Equal<ValueType, bigint>>;
}

// Test 8: GetColumnData in raw mode with nullable bigint (strips null)
{
  const balance = bigint(); // nullable
  type ValueType = GetColumnData<typeof balance, 'raw'>;

  Expect<Equal<ValueType, bigint>>;
}

// Test 9: GetColumnData in raw mode with notNull id
{
  const userId = id('users').notNull();
  type ValueType = GetColumnData<typeof userId, 'raw'>;

  Expect<Equal<ValueType, GenericId<'users'>>>;
}

// Test 10: GetColumnData in raw mode with nullable id (strips null)
{
  const parentId = id('posts'); // nullable
  type ValueType = GetColumnData<typeof parentId, 'raw'>;

  Expect<Equal<ValueType, GenericId<'posts'>>>;
}

// ============================================================================
// Array types for inArray operator
// ============================================================================

// Test 11: inArray with notNull text produces readonly string[]
{
  const name = text().notNull();
  type ArrayType = readonly GetColumnData<typeof name, 'raw'>[];

  Expect<Equal<ArrayType, readonly string[]>>;
}

// Test 12: inArray with nullable text produces readonly string[] (raw mode)
{
  const bio = text(); // nullable
  type ArrayType = readonly GetColumnData<typeof bio, 'raw'>[];

  Expect<Equal<ArrayType, readonly string[]>>;
}

// Test 13: inArray with notNull integer produces readonly number[]
{
  const age = integer().notNull();
  type ArrayType = readonly GetColumnData<typeof age, 'raw'>[];

  Expect<Equal<ArrayType, readonly number[]>>;
}

// Test 14: inArray with nullable id produces readonly GenericId[] (raw mode)
{
  const parentId = id('posts'); // nullable
  type ArrayType = readonly GetColumnData<typeof parentId, 'raw'>[];

  Expect<Equal<ArrayType, readonly GenericId<'posts'>[]>>;
}

// ============================================================================
// Verify FilterOperators are properly typed (interface check)
// ============================================================================

// Test 15: Verify FilterOperators methods use GetColumnData<TBuilder, 'raw'>
// This is a structural test - if the types compile correctly in the actual
// usage (like in select.ts where clause), then the FilterOperators interface
// is correctly using GetColumnData with 'raw' mode.
//
// The above tests verify that GetColumnData<T, 'raw'> produces the correct
// types for each column builder type, which is what FilterOperators rely on.

export {};
