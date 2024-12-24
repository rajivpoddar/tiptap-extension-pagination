/**
 * @file /src/utils/math.ts
 * @name Math
 * @description Utility functions for mathematical operations.
 */

/**
 * Checks if a value is within a specified range inclusive of the bounds.
 * @param value - The value to check.
 * @param min - The minimum value of the range.
 * @param max - The maximum value of the range.
 * @returns True if the value is within the range, false otherwise.
 */
export const inRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
};
