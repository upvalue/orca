import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown, Play, CheckCircle2, RotateCcw, Plus, List, LayoutGrid, Search, Loader2 } from 'lucide-react';
import type { Ticket, TicketStatus, TicketType, TicketSortField, SortOrder } from '../../shared/index.js';
import { BoardView } from '@/pages/BoardView';

// ---------------------------------------------------------------------------
// Constants for badge styling
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  closed: 'bg-green-100 text-green-800 border-green-200',
};

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

// ---------------------------------------------------------------------------
// Filter sentinel value (Radix Select doesn't support empty string values)
// ---------------------------------------------------------------------------

const ALL = '__all__';

// ---------------------------------------------------------------------------
// Sortable column header component
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  field: TicketSortField;
  currentSort: TicketSortField;
  currentOrder: SortOrder;
  onSort: (field: TicketSortField) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button
      className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        currentOrder === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page title hook
// ---------------------------------------------------------------------------

function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search bar skeleton */}
      <Skeleton className="h-9 w-full" />
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36" />
        ))}
      </div>
      {/* Desktop table skeleton */}
      <div className="hidden md:block rounded-lg border border-[var(--border)]">
        <div className="border-b border-[var(--border)] p-2">
          <Skeleton className="h-6 w-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[var(--border)] p-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-48 flex-1" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      {/* Mobile card skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row-level quick status actions
// ---------------------------------------------------------------------------

function StatusQuickActions({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const mutation = trpc.tickets.updateStatus.useMutation({
    onMutate: async (variables) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.tickets.list.cancel();
      // Snapshot previous list queries for rollback
      const prevQueries = queryClient.getQueriesData<Ticket[]>({ queryKey: [['tickets', 'list']] });
      // Optimistically update all list caches
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
      // Roll back all list caches
      if (context?.prevQueries) {
        for (const [key, data] of context.prevQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to update status');
    },
    onSuccess: (_data, variables) => {
      const label = variables.status.replace('_', ' ');
      toast.success(`Status changed to ${label}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  const buttons: { label: string; status: TicketStatus; icon: React.ReactNode; title: string }[] = [];

  if (ticket.status === 'open') {
    buttons.push(
      { label: 'Start', status: 'in_progress', icon: <Play className="h-3.5 w-3.5" />, title: 'Start work' },
      { label: 'Close', status: 'closed', icon: <CheckCircle2 className="h-3.5 w-3.5" />, title: 'Close ticket' },
    );
  } else if (ticket.status === 'in_progress') {
    buttons.push(
      { label: 'Close', status: 'closed', icon: <CheckCircle2 className="h-3.5 w-3.5" />, title: 'Close ticket' },
    );
  } else if (ticket.status === 'closed') {
    buttons.push(
      { label: 'Reopen', status: 'open', icon: <RotateCcw className="h-3.5 w-3.5" />, title: 'Reopen ticket' },
    );
  }

  return (
    <div className="flex items-center gap-1">
      {buttons.map((btn) => (
        <Button
          key={btn.status}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={btn.title}
          disabled={mutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            mutation.mutate({ id: ticket.id, status: btn.status });
          }}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            btn.icon
          )}
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile card component for a single ticket
// ---------------------------------------------------------------------------

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: Ticket;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg border border-[var(--border)] p-4 hover:bg-[var(--accent)]/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-[var(--muted-foreground)]">{ticket.id}</span>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn('text-xs', STATUS_STYLES[ticket.status])}
          >
            {STATUS_LABELS[ticket.status]}
          </Badge>
          <div onClick={(e) => e.stopPropagation()}>
            <StatusQuickActions ticket={ticket} />
          </div>
        </div>
      </div>
      <p className="font-medium text-sm mb-2 line-clamp-2">{ticket.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn('text-[10px]', TYPE_STYLES[ticket.type])}>
          <span className="capitalize">{ticket.type}</span>
        </Badge>
        <Badge variant="outline" className={cn('text-[10px]', PRIORITY_STYLES[ticket.priority])}>
          P{ticket.priority}
        </Badge>
        {ticket.assignee && (
          <span className="text-[10px] text-[var(--muted-foreground)]">{ticket.assignee}</span>
        )}
        {ticket.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ViewMode = 'list' | 'board';

export function TicketListPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  usePageTitle('Tickets — Scratch');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [tagFilter, setTagFilter] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state — default: priority ascending (P0 first)
  const [sortBy, setSortBy] = useState<TicketSortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Keyboard shortcut: / to focus search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      searchRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Build tRPC input from filter/sort state
  // In board view, skip the status filter since columns represent statuses
  const queryInput = useMemo(() => {
    const input: Record<string, unknown> = {};
    if (viewMode === 'list' && statusFilter !== ALL) input.status = statusFilter;
    if (typeFilter !== ALL) input.type = typeFilter;
    if (assigneeFilter !== ALL) input.assignee = assigneeFilter;
    if (tagFilter !== ALL) input.tag = tagFilter;
    input.sortBy = sortBy;
    input.sortOrder = sortOrder;
    return input;
  }, [viewMode, statusFilter, typeFilter, assigneeFilter, tagFilter, sortBy, sortOrder]);

  // Fetch tickets with filters — polling is handled by the global QueryClient config
  const { data: tickets, isLoading, error } = trpc.tickets.list.useQuery(queryInput);

  // Fetch unfiltered tickets once to extract unique assignees and tags for filter options
  const { data: allTickets } = trpc.tickets.list.useQuery(undefined);

  const assignees = useMemo(() => {
    if (!allTickets) return [];
    const set = new Set<string>();
    for (const t of allTickets) {
      if (t.assignee) set.add(t.assignee);
    }
    return Array.from(set).sort();
  }, [allTickets]);

  const allTags = useMemo(() => {
    if (!allTickets) return [];
    const set = new Set<string>();
    for (const t of allTickets) {
      for (const tag of t.tags) set.add(tag);
    }
    return Array.from(set).sort();
  }, [allTickets]);

  // Client-side search filter (title and ID)
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
    );
  }, [tickets, searchQuery]);

  // Sort toggle handler
  function handleSort(field: TicketSortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tickets</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-[var(--border)]">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none h-8 px-2.5"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none h-8 px-2.5"
                onClick={() => setViewMode('board')}
                title="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button asChild>
              <Link to="/tickets/new">
                <Plus className="h-4 w-4" />
                New Ticket
              </Link>
            </Button>
          </div>
        </div>
        {viewMode === 'board' ? (
          <BoardView tickets={undefined} isLoading={true} />
        ) : (
          <TableSkeleton />
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--destructive)]">Error loading tickets: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <div className="flex items-center gap-2">
          {/* List / Board toggle */}
          <div className="flex items-center rounded-md border border-[var(--border)]">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none h-8 px-2.5"
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none h-8 px-2.5"
              onClick={() => setViewMode('board')}
              title="Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link to="/tickets/new">
              <Plus className="h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          ref={searchRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search tickets... (press "/" to focus)'
          className="pl-9"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Status filter — hidden in board view since columns represent statuses */}
        {viewMode === 'list' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40">
            <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="chore">Chore</SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee filter */}
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Assignees</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tag filter */}
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Board view or List view */}
      {viewMode === 'board' ? (
        <BoardView tickets={tickets} isLoading={false} />
      ) : (
        <>
          {/* Empty state */}
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16">
              <p className="text-lg font-medium text-[var(--muted-foreground)]">No tickets found</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Try adjusting your filters to find what you&apos;re looking for.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table — hidden on mobile */}
              <div className="hidden md:block rounded-lg border border-[var(--border)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">
                        <SortableHeader
                          label="ID"
                          field="created"
                          currentSort={sortBy}
                          currentOrder={sortOrder}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-28">
                        <SortableHeader
                          label="Status"
                          field="status"
                          currentSort={sortBy}
                          currentOrder={sortOrder}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="w-24">
                        <SortableHeader
                          label="Type"
                          field="type"
                          currentSort={sortBy}
                          currentOrder={sortOrder}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="w-20">
                        <SortableHeader
                          label="Priority"
                          field="priority"
                          currentSort={sortBy}
                          currentOrder={sortOrder}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="w-28">Assignee</TableHead>
                      <TableHead className="w-40">Tags</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <TableCell className="font-mono text-sm text-[var(--muted-foreground)]">
                          {ticket.id}
                        </TableCell>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', STATUS_STYLES[ticket.status])}
                          >
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs capitalize', TYPE_STYLES[ticket.type])}>
                            {ticket.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', PRIORITY_STYLES[ticket.priority])}
                          >
                            P{ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">
                          {ticket.assignee ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ticket.tags.length > 0
                              ? ticket.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusQuickActions ticket={ticket} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards — hidden on desktop */}
              <div className="md:hidden space-y-3">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
