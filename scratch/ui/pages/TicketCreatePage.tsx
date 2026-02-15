import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import type { TicketType, TicketPriority } from '../../shared/index.js';

// ---------------------------------------------------------------------------
// Zod schema for client-side validation (mirrors server createTicketInput)
// ---------------------------------------------------------------------------

const ticketFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['task', 'bug', 'feature', 'epic', 'chore']),
  priority: z.coerce.number().pipe(
    z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  ),
  assignee: z.string().optional(),
  parent: z.string().optional(),
  tags: z.string().optional(),
  design: z.string().optional(),
  acceptance: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'epic', label: 'Epic' },
  { value: 'chore', label: 'Chore' },
];

const TICKET_PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 0, label: 'P0 — Critical' },
  { value: 1, label: 'P1 — High' },
  { value: 2, label: 'P2 — Medium' },
  { value: 3, label: 'P3 — Low' },
  { value: 4, label: 'P4 — Minimal' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TicketCreatePage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [designOpen, setDesignOpen] = useState(false);
  const [acceptanceOpen, setAcceptanceOpen] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'task',
      priority: 2,
      assignee: '',
      parent: '',
      tags: '',
      design: '',
      acceptance: '',
    },
  });

  const createMutation = trpc.tickets.create.useMutation({
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.id} created`);
      utils.tickets.list.invalidate();
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  function onSubmit(values: TicketFormValues) {
    // Parse tags from comma-separated string
    const tags = values.tags
      ? values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    createMutation.mutate({
      title: values.title,
      description: values.description || undefined,
      type: values.type as TicketType,
      priority: values.priority as TicketPriority,
      assignee: values.assignee || undefined,
      parent: values.parent || undefined,
      tags,
      design: values.design || undefined,
      acceptance: values.acceptance || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Ticket</h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create a new ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-[var(--destructive)]">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ticket title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the ticket (optional)"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type & Priority row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TICKET_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TICKET_PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={String(p.value)}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Assignee & Parent row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Assignee */}
                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <FormControl>
                        <Input placeholder="Assignee (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Parent */}
                <FormField
                  control={form.control}
                  name="parent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Ticket</FormLabel>
                      <FormControl>
                        <Input placeholder="Parent ticket ID (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="Comma-separated tags (e.g. frontend, urgent)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Design — collapsible */}
              <Collapsible open={designOpen} onOpenChange={setDesignOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" type="button" className="flex items-center gap-2 px-0">
                    {designOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Design
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <FormField
                    control={form.control}
                    name="design"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Design notes (optional)"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Acceptance Criteria — collapsible */}
              <Collapsible open={acceptanceOpen} onOpenChange={setAcceptanceOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" type="button" className="flex items-center gap-2 px-0">
                    {acceptanceOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Acceptance Criteria
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <FormField
                    control={form.control}
                    name="acceptance"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Acceptance criteria (optional)"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
