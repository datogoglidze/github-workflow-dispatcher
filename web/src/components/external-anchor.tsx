import { ExternalLink } from "lucide-react"
import type { ReactNode } from "react"

export function ExternalAnchor({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 hover:underline"
    >
      {children}
      <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
    </a>
  )
}
