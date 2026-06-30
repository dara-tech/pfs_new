import { FaArchive, FaInbox } from 'react-icons/fa';
import { Button } from './ui/button';

export default function EmptyState({ 
  title = 'No data available', 
  description = 'There is no data to display at this time.',
  action,
  actionLabel,
  icon: Icon = FaArchive
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-primary/10 p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
        {description}
      </p>
      {action && actionLabel && (
        <Button onClick={action}>{actionLabel}</Button>
      )}
    </div>
  );
}











