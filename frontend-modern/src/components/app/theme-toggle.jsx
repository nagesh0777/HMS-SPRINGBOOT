import { Clock, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', desc: 'Always day', Icon: Sun },
  { value: 'dark', label: 'Dark', desc: 'Always night', Icon: Moon },
  { value: 'auto', label: 'Auto', desc: 'Day & evening time', Icon: Clock },
];

export function ThemeToggle({ className }) {
  const { theme, resolved, setTheme } = useTheme();

  const isAuto = theme === 'auto' || theme === 'system';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-muted-foreground hover:text-foreground relative', className)}
          title={
            isAuto
              ? `Auto: ${resolved === 'dark' ? 'Evening (Dark)' : 'Day (Light)'} — Click to switch`
              : `${resolved === 'dark' ? 'Dark theme' : 'Light theme'} — Click to switch`
          }
        >
          {resolved === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {OPTIONS.map(({ value, label, desc, Icon }) => {
          const active = isAuto ? value === 'auto' : theme === value;
          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => setTheme(value)}
              className={cn('flex items-center justify-between gap-2 py-2 cursor-pointer', active && 'bg-accent font-medium')}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {value === 'auto' && isAuto
                  ? resolved === 'dark' ? 'Evening' : 'Day'
                  : desc}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
