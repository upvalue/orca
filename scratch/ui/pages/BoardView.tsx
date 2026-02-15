import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Ticket, TicketStatus, TicketType } from '../../shared/index.js';

// ---------------------------------------------------------------------------
// Constants for badge styling (reused from list view)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};

const PRIORITY_STYLES: Record<number, string> = {
  0: 'bg-red-100 text-red-800 border-red-200',
  1: 'bg-orange-100 text-orange-800 border-orange-200',
  2: 'bg-gray-100 text-gray-800 border-gray-200',
  3: 'bg-gray-100 text-gray-500 border-gray-200',
  4: 'bg-gray-50 text-gray-400 border-gray-100',
};

const TYPE_STYLES: Record<TicketType, string> = {
  epic: 'bg-purple-100 text-purple-800 border-purple-200',
  bug: 'bg-red-100 text-red-800 border-red-200',
  feature: 'bg-blue-100 text-blue-800 border-blue-200',
  task: 'bg-gray-100 text-gray-800 border-gray-200',
  chore: 'bg-amber-100 text-amber-800 border-amber-200',
};

const COLUMN_CONFIG: { status: TicketStatus; label: string; headerColor: string; borderColor: string }[] = [
  { status: 'open', label: 'Open', headerColor: 'bg-blue-500', borderColor: 'border-blue-300' },
  { status: 'in_progress', label: 'In Progress', headerColor: 'bg-yellow-500', borderColor: 'border-yellow-300' },
  { status: 'closed', label: 'Closed', headerColor: 'bg-green-500', borderColor: 'border-green-300' },
];

// ---------------------------------------------------------------------------
// BoardCard — a draggable ticket card
// ---------------------------------------------------------------------------

function BoardCardContent({
  ticket,
  onClick,
  isDragging,
}: {
  ticket: Ticket;
  onClick?: () => void;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg opacity-90 rotate-2',
      )}
      onClick={onClick}
    >
      {/* ID and priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-xs text-[var(--muted-foreground)]">{ticket.id}</span>
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0', PRIORITY_STYLES[ticket.priority])}
        >
          P{ticket.priority}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">{ticket.title}</p>

      {/* Type badge and assignee */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={cn('text-[10px] capitalize px-1.5 py-0', TYPE_STYLES[ticket.type])}
        >
          {ticket.type}
        </Badge>
        {ticket.assignee && (
          <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[80px]">
            {ticket.assignee}
          </span>
        )}
      </div>

      {/* Tags */}
      {ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {ticket.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableCard({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <BoardCardContent
        ticket={ticket}
        onClick={() => {
          if (!isDragging) {
            navigate(`/tickets/${ticket.id}`);
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardColumn — a droppable column
// ---------------------------------------------------------------------------

function BoardColumn({
  status,
  label,
  headerColor,
  tickets,
}: {
  status: TicketStatus;
  label: string;
  headerColor: string;
  borderColor: string;
  tickets: Ticket[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 min-h-[400px] min-w-0',
        isOver && 'ring-2 ring-[var(--ring)] ring-offset-2',
      )}
    >
      {/* Column header */}
      <div className={cn('rounded-t-lg px-3 py-2 text-white font-semibold text-sm flex items-center justify-between', headerColor)}>
        <span>{label}</span>
        <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-medium">
          {tickets.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No tickets</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Drag tickets here to change their status to {label}
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <DraggableCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardSkeleton — loading state
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, colIdx) => (
        <div key={colIdx} className="flex flex-col rounded-lg border border-[var(--border)]">
          <Skeleton className="h-10 rounded-t-lg rounded-b-none" />
          <div className="p-2 space-y-2">
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <Skeleton key={cardIdx} className="h-24 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardView — main exported component
// ---------------------------------------------------------------------------

export function BoardView({
  tickets,
  isLoading,
}: {
  tickets: Ticket[] | undefined;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [activeTicket, setActiveTicket] = React.useState<Ticket | null>(null);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const mutation = trpc.tickets.updateStatus.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.list.cancel();
      const prevQueries = queryClient.getQueriesData<Ticket[]>({ queryKey: [['tickets', 'list']] });
      queryClient.setQueriesData<Ticket[]>(
        { queryKey: [['tickets', 'list']] },
        (old) =>
          old?.map((t) =>
            t.id === variables.id ? { ...t, status: variables.status } : t,
          ),
      );
      return { prevQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevQueries) {
        for (const [key, data] of context.prevQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to update status');
    },
    onSuccess: (_data, variables) => {
      const label = STATUS_LABELS[variables.status];
      toast.success(`Status changed to ${label}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  // Group tickets by status
  const columns = useMemo(() => {
    const grouped: Record<TicketStatus, Ticket[]> = {
      open: [],
      in_progress: [],
      closed: [],
    };
    if (tickets) {
      for (const ticket of tickets) {
        if (grouped[ticket.status]) {
          grouped[ticket.status].push(ticket);
        }
      }
    }
    return grouped;
  }, [tickets]);

  function handleDragStart(event: DragStartEvent) {
    const ticket = event.active.data.current?.ticket as Ticket | undefined;
    setActiveTicket(ticket ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTicket(null);
    const { active, over } = event;

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatus;
    const ticket = active.data.current?.ticket as Ticket | undefined;

    // Only mutate if the status actually changed
    if (ticket && ticket.status !== newStatus) {
      mutation.mutate({ id: ticketId, status: newStatus });
    }
  }

  if (isLoading) {
    return <BoardSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-4">
        {COLUMN_CONFIG.map((col) => (
          <BoardColumn
            key={col.status}
            status={col.status}
            label={col.label}
            headerColor={col.headerColor}
            borderColor={col.borderColor}
            tickets={columns[col.status]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="w-[260px]">
            <BoardCardContent ticket={activeTicket} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
