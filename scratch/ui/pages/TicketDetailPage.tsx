import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  RotateCcw,
  X,
  Plus,
  Pencil,
  Loader2,
  ChevronRight,
  ChevronDown,
  GitBranch,
  AlertCircle,
  Search,
  Link2,
} from 'lucide-react';
import type { TicketStatus, TicketType, TicketPriority, TicketRef, DepTreeNode } from '../../shared/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
};

const TYPE_COLORS: Record<TicketType, string> = {
  bug: 'bg-red-100 text-red-800',
  feature: 'bg-purple-100 text-purple-800',
  task: 'bg-gray-100 text-gray-800',
  epic: 'bg-indigo-100 text-indigo-800',
  chore: 'bg-orange-100 text-orange-800',
};

const PRIORITY_LABELS: Record<TicketPriority, { label: string; className: string }> = {
  0: { label: 'P0 — Critical', className: 'text-red-600 font-bold' },
  1: { label: 'P1 — High', className: 'text-orange-600 font-semibold' },
  2: { label: 'P2 — Medium', className: 'text-yellow-600 font-medium' },
  3: { label: 'P3 — Low', className: 'text-blue-600' },
  4: { label: 'P4 — Minimal', className: 'text-gray-500' },
};

const ALL_PRIORITIES: TicketPriority[] = [0, 1, 2, 3, 4];
const ALL_TYPES: TicketType[] = ['task', 'bug', 'feature', 'epic', 'chore'];

function formatStatus(status: TicketStatus): string {
  return status.replace('_', ' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status]}>
      <span className="capitalize">{formatStatus(status)}</span>
    </Badge>
  );
}

function TypeBadge({ type }: { type: TicketType }) {
  return (
    <Badge variant="outline" className={TYPE_COLORS[type]}>
      <span className="capitalize">{type}</span>
    </Badge>
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
// Relationship section
// ---------------------------------------------------------------------------

function RelationshipCard({
  title,
  items,
}: {
  title: string;
  items: TicketRef[];
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((ref) => (
            <li key={ref.id}>
              <Link
                to={`/tickets/${ref.id}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <span className="font-mono text-[var(--muted-foreground)]">{ref.id}</span>
                <StatusBadge status={ref.status} />
                <span className="truncate">{ref.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — improved with more detail
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-20" />

      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Metadata card */}
      <div className="rounded-xl border border-[var(--border)] p-6 space-y-4">
        <Skeleton className="h-4 w-16" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="rounded-xl border border-[var(--border)] p-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Relationships */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline editable assignee
// ---------------------------------------------------------------------------

function EditableAssignee({
  ticketId,
  value,
}: {
  ticketId: string;
  value: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const mutation = trpc.tickets.update.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          assignee: variables.assignee ?? prev.assignee,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to update assignee');
    },
    onSuccess: () => {
      toast.success('Assignee updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  function save() {
    const trimmed = draft.trim();
    const newVal = trimmed === '' ? null : trimmed;
    if (newVal !== value) {
      mutation.mutate({ id: ticketId, assignee: newVal });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            setDraft(value ?? '');
            setEditing(false);
          }
        }}
        className="h-7 w-40 text-sm"
        placeholder="Unassigned"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value ?? '');
        setEditing(true);
      }}
      className="group flex items-center gap-1 text-sm hover:text-[var(--primary)] transition-colors cursor-pointer"
      title="Click to edit assignee"
    >
      <span>{value ?? 'Unassigned'}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inline editable tags
// ---------------------------------------------------------------------------

function EditableTags({
  ticketId,
  tags,
}: {
  ticketId: string;
  tags: string[];
}) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  const addMutation = trpc.tickets.addTag.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          tags: [...prev.tags, variables.tag],
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to add tag');
    },
    onSuccess: () => {
      toast.success('Tag added');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  const removeMutation = trpc.tickets.removeTag.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          tags: prev.tags.filter((t) => t !== variables.tag),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to remove tag');
    },
    onSuccess: () => {
      toast.success('Tag removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  function submitTag() {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      addMutation.mutate({ id: ticketId, tag: trimmed });
    }
    setNewTag('');
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            onClick={() => removeMutation.mutate({ id: ticketId, tag })}
            disabled={removeMutation.isPending}
            className="ml-0.5 rounded-full hover:bg-[var(--muted-foreground)]/20 p-0.5 transition-colors cursor-pointer disabled:opacity-50"
            title={`Remove tag "${tag}"`}
          >
            {removeMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </button>
        </Badge>
      ))}
      {adding ? (
        <Input
          ref={inputRef}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onBlur={submitTag}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitTag();
            if (e.key === 'Escape') {
              setNewTag('');
              setAdding(false);
            }
          }}
          className="h-6 w-24 text-xs"
          placeholder="new tag"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          disabled={addMutation.isPending}
          className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-[var(--border)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-50"
          title="Add tag"
        >
          {addMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Add
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Searchable ticket selector (dropdown/autocomplete)
// ---------------------------------------------------------------------------

function TicketSelector({
  onSelect,
  excludeIds,
  placeholder,
}: {
  onSelect: (ticketId: string) => void;
  excludeIds: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: allTickets } = trpc.tickets.list.useQuery(undefined, {
    enabled: open,
  });

  const filtered = (allTickets ?? []).filter((t) => {
    if (excludeIds.includes(t.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Plus className="h-3 w-3" />
        {placeholder}
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1">
        <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setSearch('');
            }
            if (e.key === 'Enter' && filtered.length === 1) {
              onSelect(filtered[0].id);
              setOpen(false);
              setSearch('');
            }
          }}
          placeholder="Search tickets..."
          className="h-6 w-48 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <button
          onClick={() => {
            setOpen(false);
            setSearch('');
          }}
          className="rounded p-0.5 hover:bg-[var(--muted)] cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-72 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg">
        {filtered.length === 0 ? (
          <p className="p-3 text-center text-xs text-[var(--muted-foreground)]">
            No tickets found
          </p>
        ) : (
          filtered.slice(0, 20).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onSelect(t.id);
                setOpen(false);
                setSearch('');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)] transition-colors cursor-pointer"
            >
              <span className="font-mono text-xs text-[var(--muted-foreground)] shrink-0">{t.id}</span>
              <Badge variant="outline" className={`${STATUS_COLORS[t.status]} text-[10px] px-1 py-0 shrink-0`}>
                {formatStatus(t.status)}
              </Badge>
              <span className="truncate">{t.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Managed relationship section (deps / links with add/remove)
// ---------------------------------------------------------------------------

function ManagedDepsSection({
  ticketId,
  deps,
  blockers,
}: {
  ticketId: string;
  deps: string[];
  blockers: TicketRef[];
}) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  // Fetch all tickets to resolve dep IDs to refs
  const { data: allTickets } = trpc.tickets.list.useQuery();
  const depRefs: (TicketRef & { isBlocker: boolean })[] = [];
  if (allTickets) {
    const byId = new Map(allTickets.map((t) => [t.id, t]));
    for (const depId of deps) {
      const t = byId.get(depId);
      if (t) {
        const isBlocker = t.status !== 'closed';
        depRefs.push({ id: t.id, status: t.status, title: t.title, isBlocker });
      }
    }
  }

  const addDepMutation = trpc.tickets.addDep.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          deps: [...prev.deps, variables.depId],
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to add dependency');
    },
    onSuccess: () => {
      toast.success('Dependency added');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  const removeDepMutation = trpc.tickets.removeDep.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          deps: prev.deps.filter((d) => d !== variables.depId),
          blockers: prev.blockers.filter((b) => b.id !== variables.depId),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to remove dependency');
    },
    onSuccess: () => {
      toast.success('Dependency removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            Dependencies
            {blockers.length > 0 && (
              <Badge variant="outline" className="bg-red-100 text-red-800 gap-1">
                <AlertCircle className="h-3 w-3" />
                Blocked
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {depRefs.length > 0 && (
          <ul className="space-y-2 mb-3">
            {depRefs.map((ref) => (
              <li key={ref.id} className="flex items-center gap-2 group">
                <Link
                  to={`/tickets/${ref.id}`}
                  className="flex items-center gap-2 text-sm hover:underline flex-1 min-w-0"
                >
                  <span className="font-mono text-[var(--muted-foreground)] shrink-0">{ref.id}</span>
                  <StatusBadge status={ref.status} />
                  {ref.isBlocker && (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="truncate">{ref.title}</span>
                </Link>
                <button
                  onClick={() => removeDepMutation.mutate({ id: ticketId, depId: ref.id })}
                  disabled={removeDepMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 rounded-full p-0.5 hover:bg-[var(--muted)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  title={`Remove dependency on ${ref.id}`}
                >
                  {removeDepMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <TicketSelector
          placeholder="Add Dependency"
          excludeIds={[ticketId, ...deps]}
          onSelect={(depId) => addDepMutation.mutate({ id: ticketId, depId })}
        />
      </CardContent>
    </Card>
  );
}

function ManagedLinksSection({
  ticketId,
  linked,
}: {
  ticketId: string;
  linked: TicketRef[];
}) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const addLinkMutation = trpc.tickets.addLink.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          links: [...prev.links, variables.targetId],
          linked: [...prev.linked, { id: variables.targetId, status: 'open', title: '...' }],
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to add link');
    },
    onSuccess: () => {
      toast.success('Link added');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  const removeLinkMutation = trpc.tickets.removeLink.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: ticketId });
      const prev = utils.tickets.getById.getData({ id: ticketId });
      if (prev) {
        utils.tickets.getById.setData({ id: ticketId }, {
          ...prev,
          links: prev.links.filter((l) => l !== variables.targetId),
          linked: prev.linked.filter((l) => l.id !== variables.targetId),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: ticketId }, context.prev);
      }
      toast.error('Failed to remove link');
    },
    onSuccess: () => {
      toast.success('Link removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Linked Tickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {linked.length > 0 && (
          <ul className="space-y-2 mb-3">
            {linked.map((ref) => (
              <li key={ref.id} className="flex items-center gap-2 group">
                <Link
                  to={`/tickets/${ref.id}`}
                  className="flex items-center gap-2 text-sm hover:underline flex-1 min-w-0"
                >
                  <span className="font-mono text-[var(--muted-foreground)] shrink-0">{ref.id}</span>
                  <StatusBadge status={ref.status} />
                  <span className="truncate">{ref.title}</span>
                </Link>
                <button
                  onClick={() => removeLinkMutation.mutate({ id: ticketId, targetId: ref.id })}
                  disabled={removeLinkMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 rounded-full p-0.5 hover:bg-[var(--muted)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  title={`Remove link to ${ref.id}`}
                >
                  {removeLinkMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <TicketSelector
          placeholder="Add Link"
          excludeIds={[ticketId, ...linked.map((l) => l.id)]}
          onSelect={(targetId) => addLinkMutation.mutate({ id: ticketId, targetId })}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dependency tree view
// ---------------------------------------------------------------------------

function DepTreeNodeView({ node, depth = 0 }: { node: DepTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2); // auto-expand first 2 levels
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 hover:bg-[var(--muted)]/50 rounded px-1 -mx-1"
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-0.5 hover:bg-[var(--muted)] cursor-pointer shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            )}
          </button>
        ) : (
          <span className="w-[22px] shrink-0" />
        )}
        <Link
          to={`/tickets/${node.id}`}
          className="flex items-center gap-2 text-sm hover:underline min-w-0"
        >
          <span className="font-mono text-[var(--muted-foreground)] shrink-0">{node.id}</span>
          <StatusBadge status={node.status} />
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <DepTreeNodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function DepTreeView({ ticketId }: { ticketId: string }) {
  const { data: tree, isLoading } = trpc.tickets.getDepTree.useQuery(
    { id: ticketId },
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Dependency Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-40 ml-5" />
            <Skeleton className="h-5 w-36 ml-10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tree || tree.children.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Dependency Tree
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DepTreeNodeView node={tree} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const { data: ticket, isLoading, error } = trpc.tickets.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  // Page title: show ticket ID and title
  usePageTitle(ticket ? `${ticket.id} — ${ticket.title}` : id ? `${id} — Scratch` : 'Scratch');

  // Keyboard shortcut: Escape to go back to list
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    },
    [navigate],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // --- Status mutation with optimistic update ---
  const statusMutation = trpc.tickets.updateStatus.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: id! });
      const prev = utils.tickets.getById.getData({ id: id! });
      if (prev) {
        utils.tickets.getById.setData({ id: id! }, {
          ...prev,
          status: variables.status,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: id! }, context.prev);
      }
      toast.error('Failed to update status');
    },
    onSuccess: (_data, variables) => {
      toast.success(`Status changed to ${formatStatus(variables.status)}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  // --- Priority mutation with optimistic update ---
  const priorityMutation = trpc.tickets.update.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: id! });
      const prev = utils.tickets.getById.getData({ id: id! });
      if (prev && variables.priority !== undefined) {
        utils.tickets.getById.setData({ id: id! }, {
          ...prev,
          priority: variables.priority,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: id! }, context.prev);
      }
      toast.error('Failed to update priority');
    },
    onSuccess: () => {
      toast.success('Priority updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  // --- Type mutation with optimistic update ---
  const typeMutation = trpc.tickets.update.useMutation({
    onMutate: async (variables) => {
      await utils.tickets.getById.cancel({ id: id! });
      const prev = utils.tickets.getById.getData({ id: id! });
      if (prev && variables.type !== undefined) {
        utils.tickets.getById.setData({ id: id! }, {
          ...prev,
          type: variables.type,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.tickets.getById.setData({ id: id! }, context.prev);
      }
      toast.error('Failed to update type');
    },
    onSuccess: () => {
      toast.success('Type updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [['tickets']] });
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-[var(--destructive)]">Error: {error.message}</p>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-4 py-16 text-center">
        <h2 className="text-2xl font-bold">404</h2>
        <p className="text-[var(--muted-foreground)]">Ticket not found.</p>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>
    );
  }

  const priorityInfo = PRIORITY_LABELS[ticket.priority];
  const isBlocked = ticket.blockers.length > 0;

  // Determine which status actions are available
  const statusActions: { label: string; status: TicketStatus; icon: React.ReactNode; variant: 'default' | 'outline' | 'secondary' }[] = [];
  if (ticket.status === 'open') {
    statusActions.push(
      { label: 'Start', status: 'in_progress', icon: <Play className="h-4 w-4" />, variant: 'default' },
      { label: 'Close', status: 'closed', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'outline' },
    );
  } else if (ticket.status === 'in_progress') {
    statusActions.push(
      { label: 'Close', status: 'closed', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'default' },
    );
  } else if (ticket.status === 'closed') {
    statusActions.push(
      { label: 'Reopen', status: 'open', icon: <RotateCcw className="h-4 w-4" />, variant: 'outline' },
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Link>
      </Button>

      {/* Header — responsive text sizing */}
      <div className="space-y-2">
        <p className="font-mono text-sm text-[var(--muted-foreground)]">{ticket.id}</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{ticket.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <TypeBadge type={ticket.type} />
          <span className={priorityInfo.className}>{priorityInfo.label}</span>
          {isBlocked && (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 gap-1">
              <AlertCircle className="h-3 w-3" />
              Blocked
            </Badge>
          )}
        </div>
      </div>

      {/* Status quick actions with loading indicators */}
      {statusActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusActions.map((action) => (
            <Button
              key={action.status}
              variant={action.variant}
              size="sm"
              onClick={() => statusMutation.mutate({ id: ticket.id, status: action.status })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                action.icon
              )}
              <span className="ml-1">{action.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Metadata card — responsive: single column on mobile, up to 4 on desktop */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Status — read-only badge (changed via buttons above) */}
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge status={ticket.status} />
              </dd>
            </div>

            {/* Type — inline dropdown */}
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">Type</dt>
              <dd className="mt-0.5">
                <Select
                  value={ticket.type}
                  onValueChange={(val) => {
                    typeMutation.mutate({ id: ticket.id, type: val as TicketType });
                  }}
                  disabled={typeMutation.isPending}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </dd>
            </div>

            {/* Priority — inline dropdown */}
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">Priority</dt>
              <dd className="mt-0.5">
                <Select
                  value={String(ticket.priority)}
                  onValueChange={(val) => {
                    priorityMutation.mutate({ id: ticket.id, priority: Number(val) as TicketPriority });
                  }}
                  disabled={priorityMutation.isPending}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {PRIORITY_LABELS[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </dd>
            </div>

            {/* Assignee — inline editable text */}
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">Assignee</dt>
              <dd className="mt-0.5">
                <EditableAssignee ticketId={ticket.id} value={ticket.assignee} />
              </dd>
            </div>

            {/* Created — read-only */}
            <div>
              <dt className="text-sm text-[var(--muted-foreground)]">Created</dt>
              <dd className="mt-0.5 text-sm">{formatDate(ticket.created)}</dd>
            </div>

            {ticket.parent && (
              <div>
                <dt className="text-sm text-[var(--muted-foreground)]">Parent</dt>
                <dd className="mt-0.5">
                  <Link
                    to={`/tickets/${ticket.parent}`}
                    className="font-mono text-sm text-[var(--primary)] hover:underline"
                  >
                    {ticket.parent}
                  </Link>
                </dd>
              </div>
            )}

            {ticket.externalRef && (
              <div>
                <dt className="text-sm text-[var(--muted-foreground)]">External Ref</dt>
                <dd className="mt-0.5 text-sm">{ticket.externalRef}</dd>
              </div>
            )}

            {/* Tags — inline editable with add/remove */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4">
              <dt className="text-sm text-[var(--muted-foreground)]">Tags</dt>
              <dd className="mt-1">
                <EditableTags ticketId={ticket.id} tags={ticket.tags} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Body — rendered markdown */}
      {ticket.body && (
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[var(--primary)] prose-a:underline prose-code:rounded prose-code:bg-[var(--muted)] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[var(--muted)] prose-pre:rounded-lg">
              <ReactMarkdown>{ticket.body}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationships — managed deps, links, and read-only sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Relationships</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <ManagedDepsSection
            ticketId={ticket.id}
            deps={ticket.deps}
            blockers={ticket.blockers}
          />
          <ManagedLinksSection
            ticketId={ticket.id}
            linked={ticket.linked}
          />
          <RelationshipCard title="Blocking" items={ticket.blocking} />
          <RelationshipCard title="Children" items={ticket.children} />
        </div>
      </div>

      {/* Dependency tree */}
      {ticket.deps.length > 0 && (
        <DepTreeView ticketId={ticket.id} />
      )}
    </div>
  );
}
