import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind classes safely with clsx
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
