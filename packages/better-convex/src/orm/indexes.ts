import { type ColumnBuilderBase, entityKind } from './builders/column-builder';

export type ConvexIndexColumn = ColumnBuilderBase;

export interface ConvexIndexConfig {
  name: string;
  columns: ConvexIndexColumn[];
  unique: boolean;
  where?: unknown;
}

export class ConvexIndexBuilderOn {
  static readonly [entityKind] = 'ConvexIndexBuilderOn';
  readonly [entityKind] = 'ConvexIndexBuilderOn';

  constructor(
    private name: string,
    private unique: boolean
  ) {}

  on(
    ...columns: [ConvexIndexColumn, ...ConvexIndexColumn[]]
  ): ConvexIndexBuilder {
    return new ConvexIndexBuilder(this.name, columns, this.unique);
  }
}

export class ConvexIndexBuilder {
  static readonly [entityKind] = 'ConvexIndexBuilder';
  readonly [entityKind] = 'ConvexIndexBuilder';

  declare _: {
    brand: 'ConvexIndexBuilder';
  };

  config: ConvexIndexConfig;

  constructor(name: string, columns: ConvexIndexColumn[], unique: boolean) {
    this.config = {
      name,
      columns,
      unique,
      where: undefined,
    };
  }

  /**
   * Partial index conditions are not supported in Convex.
   * This method is kept for Drizzle API parity.
   */
  where(condition: unknown): this {
    this.config.where = condition;
    return this;
  }
}

export function index(name: string): ConvexIndexBuilderOn {
  return new ConvexIndexBuilderOn(name, false);
}

export function uniqueIndex(name: string): ConvexIndexBuilderOn {
  return new ConvexIndexBuilderOn(name, true);
}
