/**
 * Utility function for combining Tailwind CSS classes
 * Similar to clsx/classnames but optimized for our use case
 */

export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

export default cn;
