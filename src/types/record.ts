/**
 * @file /src/types/record.ts
 * @name Record
 * @description This file contains utility types for working with records.
 */

/**
 * A type definition for a nullable record. Allows records to be either T or null.
 * @param T - The type of the record.
 * @returns The record or null.
 */
export type Nullable<T> = T | null;
