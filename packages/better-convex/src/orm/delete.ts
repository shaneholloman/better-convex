import type { GenericDatabaseWriter } from 'convex/server';
import type { FilterExpression } from './filter-expression';
import {
  evaluateFilter,
  getTableName,
  selectReturningRow,
  toConvexFilter,
} from './mutation-utils';
import { QueryPromise } from './query-promise';
import type { ConvexTable } from './table';
import type {
  MutationResult,
  MutationReturning,
  ReturningSelection,
} from './types';

export type ConvexDeleteWithout<
  T extends ConvexDeleteBuilder<any, any>,
  K extends string,
> = Omit<T, K>;

export class ConvexDeleteBuilder<
  TTable extends ConvexTable<any>,
  TReturning extends MutationReturning = undefined,
> extends QueryPromise<MutationResult<TTable, TReturning>> {
  declare readonly _: {
    readonly table: TTable;
    readonly returning: TReturning;
    readonly result: MutationResult<TTable, TReturning>;
  };

  private whereExpression?: FilterExpression<boolean>;
  private returningFields?: TReturning;

  constructor(
    private db: GenericDatabaseWriter<any>,
    private table: TTable
  ) {
    super();
  }

  where(expression: FilterExpression<boolean>): this {
    this.whereExpression = expression;
    return this;
  }

  returning(): ConvexDeleteWithout<
    ConvexDeleteBuilder<TTable, true>,
    'returning'
  >;
  returning<TSelection extends ReturningSelection<TTable>>(
    fields: TSelection
  ): ConvexDeleteWithout<ConvexDeleteBuilder<TTable, TSelection>, 'returning'>;
  returning(
    fields?: ReturningSelection<TTable>
  ): ConvexDeleteWithout<
    ConvexDeleteBuilder<TTable, MutationReturning>,
    'returning'
  > {
    this.returningFields = (fields ?? true) as TReturning;
    return this as any;
  }

  async execute(): Promise<MutationResult<TTable, TReturning>> {
    const tableName = getTableName(this.table);
    let query = this.db.query(tableName);

    if (this.whereExpression) {
      const filterFn = toConvexFilter(this.whereExpression);
      query = query.filter((q: any) => filterFn(q));
    }

    let rows = await query.collect();

    if (this.whereExpression) {
      rows = rows.filter((row) =>
        evaluateFilter(row as any, this.whereExpression as any)
      );
    }

    const results: Record<string, unknown>[] = [];

    for (const row of rows) {
      if (this.returningFields) {
        if (this.returningFields === true) {
          results.push(row as any);
        } else {
          results.push(
            selectReturningRow(row as any, this.returningFields as any)
          );
        }
      }
      await this.db.delete((row as any)._id);
    }

    if (!this.returningFields) {
      return undefined as MutationResult<TTable, TReturning>;
    }

    return results as MutationResult<TTable, TReturning>;
  }
}
