/**
 * System Fields - Convex-provided fields available on all documents
 *
 * _id: Document ID (string)
 * _creationTime: Creation timestamp (number, milliseconds since epoch)
 *
 * These are automatically added to every Convex table.
 */

import { v } from 'convex/values';
import {
  ColumnBuilder,
  type ColumnBuilderBaseConfig,
  type ColumnBuilderWithTableName,
  entityKind,
} from './column-builder';

/**
 * System ID field builder (_id)
 * Always present, always non-null
 */
export class ConvexSystemIdBuilder extends ColumnBuilder<
  ColumnBuilderBaseConfig<'string', 'ConvexSystemId'>,
  {},
  {}
> {
  static readonly [entityKind]: string = 'ConvexSystemIdBuilder';
  readonly [entityKind]: string = 'ConvexSystemIdBuilder';

  constructor() {
    super('_id', 'string', 'ConvexSystemId');
    // System fields are always non-null
    this.config.notNull = true;
  }

  build() {
    // _id is always a string in Convex
    return v.string();
  }

  /**
   * Convex validator - runtime access
   * System fields use v.string() for _id
   */
  get convexValidator() {
    return this.build();
  }
}

/**
 * System creation time field builder (_creationTime)
 * Always present, always non-null, always a number (milliseconds)
 */
export class ConvexSystemCreationTimeBuilder extends ColumnBuilder<
  ColumnBuilderBaseConfig<'number', 'ConvexSystemCreationTime'>,
  {},
  {}
> {
  static readonly [entityKind]: string = 'ConvexSystemCreationTimeBuilder';
  readonly [entityKind]: string = 'ConvexSystemCreationTimeBuilder';

  constructor() {
    super('_creationTime', 'number', 'ConvexSystemCreationTime');
    // System fields are always non-null
    this.config.notNull = true;
  }

  build() {
    // _creationTime is always a number (float64 in Convex)
    return v.number();
  }

  /**
   * Convex validator - runtime access
   * System fields use v.number() for _creationTime
   */
  get convexValidator() {
    return this.build();
  }
}

/**
 * Create system field builders for a table
 * These are automatically added to every ConvexTable
 */
export type SystemFields<TName extends string> = {
  _id: ColumnBuilderWithTableName<ConvexSystemIdBuilder, TName>;
  _creationTime: ColumnBuilderWithTableName<
    ConvexSystemCreationTimeBuilder,
    TName
  >;
};

export function createSystemFields<TName extends string>(
  tableName: TName
): SystemFields<TName> {
  const id = new ConvexSystemIdBuilder();
  const creationTime = new ConvexSystemCreationTimeBuilder();

  // Store table name for runtime introspection
  (id as any).config.tableName = tableName;
  (creationTime as any).config.tableName = tableName;

  return {
    _id: id as ColumnBuilderWithTableName<ConvexSystemIdBuilder, TName>,
    _creationTime: creationTime as ColumnBuilderWithTableName<
      ConvexSystemCreationTimeBuilder,
      TName
    >,
  };
}
