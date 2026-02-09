/** biome-ignore-all lint/performance/useTopLevelRegex: inline regex assertions are intentional in tests. */
import { and, eq, gt, isNull, not, or } from './filter-expression';
import { convexTable, integer, text } from './index';
import {
  decodeUndefinedDeep,
  deserializeFilterExpression,
  encodeUndefinedDeep,
  enforceCheckConstraints,
  evaluateCheckConstraintTriState,
  evaluateFilter,
  getMutationCollectionLimits,
  getSelectionColumnName,
  selectReturningRow,
  serializeFilterExpression,
  takeRowsWithinByteBudget,
  toConvexFilter,
} from './mutation-utils';

const users = convexTable('users', {
  name: text().notNull(),
  age: integer(),
  deletedAt: integer(),
  status: text(),
});

describe('mutation-utils', () => {
  test('encodeUndefinedDeep/decodeUndefinedDeep round-trip nested values', () => {
    const input = {
      name: 'Alice',
      optional: undefined,
      nested: {
        maybe: undefined,
        list: [1, undefined, { value: undefined }],
      },
    };

    const encoded = encodeUndefinedDeep(input);
    expect(encoded).not.toEqual(input);

    const decoded = decodeUndefinedDeep(encoded);
    expect(decoded).toEqual(input);
  });

  test('serialize/deserialize filter expressions validates malformed unary payloads', () => {
    const serialized = serializeFilterExpression(eq(users.name, 'Alice'));
    expect(serialized).toBeTruthy();
    expect(deserializeFilterExpression(serialized)).toBeTruthy();

    expect(() =>
      deserializeFilterExpression({
        type: 'unary',
        operator: 'not',
        operand: undefined as any,
      })
    ).toThrow(/missing/i);
  });

  test('serializeFilterExpression rejects binary expressions without field reference', () => {
    const invalid = {
      type: 'binary',
      operator: 'eq',
      operands: [123, 'x'],
      accept() {
        throw new Error('not used');
      },
    };

    expect(() => serializeFilterExpression(invalid as any)).toThrow(
      /FieldReference/
    );
  });

  test('selection helpers resolve column names and map returning rows', () => {
    expect(getSelectionColumnName({ columnName: 'name' })).toBe('name');
    expect(getSelectionColumnName({ config: { name: 'email' } })).toBe('email');
    expect(() => getSelectionColumnName({})).toThrow(
      /must reference a column/i
    );

    const row = { name: 'Alice', email: 'alice@example.com', age: 30 };
    const selected = selectReturningRow(row, {
      n: { columnName: 'name' },
      e: { config: { name: 'email' } },
    });
    expect(selected).toEqual({ n: 'Alice', e: 'alice@example.com' });
  });

  test('evaluateFilter supports binary/unary/logical operators', () => {
    const row = {
      name: 'Alice',
      age: 30,
      tags: ['a', 'b'],
      deletedAt: null,
    };

    expect(evaluateFilter(row, eq(users.name, 'Alice'))).toBe(true);
    expect(evaluateFilter(row, not(eq(users.name, 'Bob')))).toBe(true);
    expect(
      evaluateFilter(row, and(gt(users.age, 18), isNull(users.deletedAt))!)
    ).toBe(true);
    expect(
      evaluateFilter(row, or(eq(users.name, 'Zed'), eq(users.name, 'Alice'))!)
    ).toBe(true);
  });

  test('evaluateCheckConstraintTriState returns unknown for nullish comparisons', () => {
    const expression = gt(users.age, 18);

    expect(evaluateCheckConstraintTriState({ age: 30 }, expression)).toBe(true);
    expect(evaluateCheckConstraintTriState({ age: 10 }, expression)).toBe(
      false
    );
    expect(evaluateCheckConstraintTriState({ age: null }, expression)).toBe(
      'unknown'
    );
  });

  test('enforceCheckConstraints throws violations and allows unknown checks', () => {
    const table = {
      tableName: 'users',
      getChecks: () => [
        {
          name: 'age_positive',
          expression: gt(users.age, 0),
        },
      ],
    };

    expect(() => enforceCheckConstraints(table as any, { age: -1 })).toThrow(
      /violation/i
    );
    expect(() =>
      enforceCheckConstraints(table as any, { age: null })
    ).not.toThrow();
    expect(() =>
      enforceCheckConstraints(table as any, { age: 20 })
    ).not.toThrow();
  });

  test('toConvexFilter validates unary field-reference constraints', () => {
    const badUnary = {
      type: 'unary',
      operator: 'isNull',
      operands: [eq(users.name, 'Alice')],
      accept<R>(visitor: any): R {
        return visitor.visitUnary(this);
      },
    };

    expect(() => toConvexFilter(badUnary as any)).toThrow(
      /must operate on a field reference/i
    );
  });

  test('takeRowsWithinByteBudget enforces limits and detects truncation', () => {
    expect(() => takeRowsWithinByteBudget([], 0)).toThrow(/positive integer/i);

    const rows = [
      { id: 1, payload: 'x'.repeat(20) },
      { id: 2, payload: 'x'.repeat(20) },
      { id: 3, payload: 'x'.repeat(20) },
    ];

    const firstOnly = takeRowsWithinByteBudget(rows as any, 120);
    expect(firstOnly.rows.length).toBe(1);
    expect(firstOnly.hitLimit).toBe(true);

    const allRows = takeRowsWithinByteBudget(rows as any, 10_000);
    expect(allRows.rows.length).toBe(3);
    expect(allRows.hitLimit).toBe(false);
  });

  test('getMutationCollectionLimits validates defaults', () => {
    const defaults = getMutationCollectionLimits(undefined);
    expect(defaults.batchSize).toBeGreaterThan(0);
    expect(defaults.maxRows).toBeGreaterThan(0);

    expect(() =>
      getMutationCollectionLimits({
        defaults: {
          mutationBatchSize: 0,
        },
      } as any)
    ).toThrow(/mutationBatchSize/i);
  });
});
