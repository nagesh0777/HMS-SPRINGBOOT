import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, with later Tailwind utilities winning over earlier conflicting ones.
 * Plain clsx would leave "px-2 px-4" both in the class list and let CSS order decide, which is
 * why every shadcn component composes through this rather than string concatenation.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
