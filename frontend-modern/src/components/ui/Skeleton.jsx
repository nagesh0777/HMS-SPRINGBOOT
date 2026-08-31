import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
// Also default-exported so the screens that imported the previous component keep working while
// they are migrated one at a time, rather than needing a single sweeping change.
export default Skeleton;
