/**
 * @file /src/constants/direction.ts
 * @name Direction
 * @description Defines constants for directions
 */

export const ASCENDING = 1 as const;
export const DESCENDING = -1 as const;

export type Sign = typeof ASCENDING | typeof DESCENDING;
