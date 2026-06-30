import { FaEdit, FaTrash } from 'react-icons/fa';
import { Button } from './ui/button';

/** Compact icon actions for admin list tables */
export default function TableRowActions({
  onEdit,
  onDelete,
  editTitle = 'Edit',
  deleteTitle = 'Delete',
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onEdit}
        title={editTitle}
      >
        <FaEdit className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
        title={deleteTitle}
      >
        <FaTrash className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
