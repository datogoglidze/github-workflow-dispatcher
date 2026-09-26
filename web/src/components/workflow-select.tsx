import { useEffect, useState } from "react"
import type { Workflow, WorkflowList } from "@/api/types"
import { listWorkflows } from "@/api/workflows"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useFetch } from "@/hooks/use-fetch"

const PAGE_SIZE = 10

export function WorkflowSelect({
  value,
  onChange,
  disabled,
}: {
  value: Workflow | null
  onChange: (workflow: Workflow) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const [seenQuery, setSeenQuery] = useState(debounced)
  if (seenQuery !== debounced) {
    setSeenQuery(debounced)
    if (page !== 0) setPage(0)
  }

  const { data, error, loading } = useFetch(
    () => {
      if (!open) return Promise.resolve(null as WorkflowList | null)
      return listWorkflows({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        "is_dispatchable[eq]": true,
        ...(debounced ? { "repository.full_name[ilike]": `%${debounced}%` } : {}),
      })
    },
    [open, debounced, page],
  )

  const workflows = data?.workflows ?? []
  const total = data?.total ?? 0
  const offset = page * PAGE_SIZE

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start font-normal"
          disabled={disabled}
          aria-expanded={open}
        >
          {value ? (
            <span className="truncate">
              {value.repository.full_name}
              <span className="text-muted-foreground"> / {value.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a workflow</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search repository"
          className="h-7 text-xs"
          aria-label="Search repositories"
          autoFocus
        />
        {error ? <p className="text-xs text-destructive">{error.message}</p> : null}
        <div className="max-h-64 space-y-1 overflow-auto">
          {loading && !data ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
          {!loading && workflows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No workflows</p>
          ) : (
            workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => {
                  onChange(workflow)
                  setOpen(false)
                }}
              >
                <span className="text-xs text-muted-foreground">{workflow.repository.full_name}</span>
                <span className="text-sm">{workflow.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{workflow.path}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {total === 0 ? "0" : `${offset + 1}–${Math.min(offset + workflows.length, total)}`} of {total}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPage((current) => current + 1)}
              disabled={offset + PAGE_SIZE >= total}
            >
              Next
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
