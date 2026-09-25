import { Badge } from "@/components/ui/badge"

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

export function WorkflowStateBadge({ state }: { state: string }) {
  const variant = state === "active" ? "default" : "secondary"
  return <Badge variant={variant}>{state}</Badge>
}

export function StatusCodeBadge({ code }: { code: number | null }) {
  if (code == null) return <Badge variant="secondary">Pending</Badge>
  if (code === 200 || code === 204) {
    return (
      <Badge className="border-transparent bg-emerald-600 text-white dark:bg-emerald-500">
        {code}
      </Badge>
    )
  }
  if (code >= 400 && code < 500) {
    return (
      <Badge className="border-transparent bg-amber-500 text-black">{code}</Badge>
    )
  }
  return <Badge variant="destructive">{code}</Badge>
}
