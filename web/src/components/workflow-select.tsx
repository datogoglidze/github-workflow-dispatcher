import { useEffect, useState, useRef, useCallback } from "react"
import type { Workflow, WorkflowList } from "@/api/types"
import { listWorkflows } from "@/api/workflows"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useFetch } from "@/hooks/use-fetch"

const PAGE_SIZE = 15

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
  const [accumulated, setAccumulated] = useState<Workflow[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  // Reset when query or open state changes
  useEffect(() => {
    setAccumulated([])
    setPage(0)
  }, [debounced, open])

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

  useEffect(() => {
    if (data?.workflows) {
      setAccumulated((prev) => {
        if (page === 0) return data.workflows
        const next = [...prev]
        for (const w of data.workflows) {
          if (!next.some((existing) => existing.id === w.id)) {
            next.push(w)
          }
        }
        return next
      })
    }
  }, [data, page])

  const observerRef = useRef<IntersectionObserver | null>(null)
  const lastItemRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (loading) return
      if (observerRef.current) observerRef.current.disconnect()

      if (node) {
        observerRef.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && accumulated.length < (data?.total ?? 0)) {
            setPage((p) => p + 1)
          }
        })
        observerRef.current.observe(node)
      }
    },
    [loading, accumulated.length, data?.total],
  )

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
      <PopoverContent align="start" className="w-96 p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search repository"
          className="h-8 text-xs mb-2"
          aria-label="Search repositories"
          autoFocus
        />
        {error ? <p className="text-xs text-destructive mb-2 px-1">{error.message}</p> : null}
        
        <div className="max-h-64 space-y-1 overflow-y-auto px-1">
          {accumulated.length === 0 && !loading && !error ? (
            <p className="text-xs text-muted-foreground py-2 text-center">No workflows found</p>
          ) : (
            accumulated.map((workflow, index) => {
              const isLast = index === accumulated.length - 1
              return (
                <button
                  key={workflow.id}
                  ref={isLast ? lastItemRef : null}
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
              )
            })
          )}
          {loading && (
            <div className="py-2 text-center">
              <span className="text-xs text-muted-foreground">Loading…</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
