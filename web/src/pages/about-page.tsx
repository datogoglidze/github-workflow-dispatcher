import {
  Activity,
  CalendarClock,
  Clock,
  FolderGit2,
  Info,
  Layers,
  ScrollText,
  ShieldCheck,
  Sliders,
  Workflow,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ContactItem {
  label: string
  href: string
  badgeUrl: string
}

const CONTACT_LINKS: ContactItem[] = [
  {
    label: "Page",
    href: "https://datogoglidze.github.io/",
    badgeUrl:
      "https://img.shields.io/badge/-datogoglidze-181717?style=flat-square&logo=startpage&logoColor=white",
  },
  {
    label: "X",
    href: "https://x.com/schwifterpickle",
    badgeUrl:
      "https://img.shields.io/badge/-schwifterpickle-000000?style=flat-square&logo=x&logoColor=white",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/d-goglidze/",
    badgeUrl:
      "https://img.shields.io/badge/-in_d--goglidze-0077B5?style=flat-square",
  },
  {
    label: "Steam",
    href: "https://steamcommunity.com/id/pickle_22/",
    badgeUrl:
      "https://img.shields.io/badge/-pickle__22-182636?style=flat-square&logo=steam&logoColor=white",
  },
  {
    label: "Discord",
    href: "https://discord.gg/txMH8n8E",
    badgeUrl:
      "https://img.shields.io/badge/-Discord-5865F2?style=flat-square&logo=discord&logoColor=white",
  },
  {
    label: "GitHub",
    href: "https://github.com/datogoglidze",
    badgeUrl:
      "https://img.shields.io/badge/-datogoglidze-181717?style=flat-square&logo=github&logoColor=white",
  },
]

export function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Info className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">About GitHub Workflow Dispatcher</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What the Application Does</CardTitle>
          <CardDescription>
            System purpose, architecture, and orchestration capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">GitHub Workflow Dispatcher</strong> is a
            centralized scheduling and on-demand execution platform for GitHub Actions
            workflows across an entire GitHub organization.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <FolderGit2 className="size-4 text-primary" />
                Organization Sync
              </div>
              <p className="text-xs">
                Discovers repositories and workflow YAML files from the target GitHub
                organization, keeping local workflow inventory up to date.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <CalendarClock className="size-4 text-primary" />
                Scheduled Orchestration
              </div>
              <p className="text-xs">
                Executes workflows automatically using 5-field cron expressions evaluated
                in UTC via APScheduler, independent of repository-level cron limitations.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Workflow className="size-4 text-primary" />
                On-Demand Dispatch
              </div>
              <p className="text-xs">
                Triggers any dispatchable workflow on demand with configurable git branch
                or tag refs and custom JSON input parameters.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Sliders className="size-4 text-primary" />
                Execution Jitter
              </div>
              <p className="text-xs">
                Applies randomized execution jitter within configurable bounds to spread out
                triggers and prevent GitHub API burst rate-limit throttling.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <ScrollText className="size-4 text-primary" />
                Audit Trail & Deep Links
              </div>
              <p className="text-xs">
                Records every dispatch attempt with HTTP status codes, resolved refs, inputs,
                and direct links to the resulting GitHub Actions workflow run.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                GitHub App Security
              </div>
              <p className="text-xs">
                Authenticates using GitHub App private key credentials and short-lived
                installation tokens with scoped permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Means What (Terminology & Concepts)</CardTitle>
          <CardDescription>
            Detailed explanations of fields, statuses, and concepts used throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <FolderGit2 className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Repositories</h2>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Repository</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  A GitHub repository monitored within the configured GitHub organization.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Default Branch</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The primary branch (e.g., <code>main</code> or <code>master</code>) used
                  as the fallback git ref when no specific ref is supplied during dispatch.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Status (Active / Inactive)</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Indicates whether the repository is currently tracked and synchronized.
                  Inactive repositories are excluded from sync sweeps.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Last Synced</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The UTC timestamp when repository details and workflow files were last
                  fetched from the GitHub API.
                </dd>
              </div>
              <div className="rounded-md border p-3 sm:col-span-2">
                <dt className="font-medium text-foreground">Sync Repos</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Triggers an immediate background synchronization that queries the GitHub
                  organization, indexes <code>.github/workflows/*.yml</code> files, updates
                  existing workflows, and flags deleted workflows.
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <Workflow className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Workflows</h2>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Workflow</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  A CI/CD automation definition located in <code>.github/workflows/</code> in
                  a tracked repository.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Workflow Path</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The relative repository file path of the workflow file (for example,{" "}
                  <code>.github/workflows/ci.yml</code>).
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Dispatchable (workflow_dispatch)</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Indicates whether the workflow defines the <code>workflow_dispatch</code>{" "}
                  trigger event. Only dispatchable workflows can be triggered manually or
                  run on a schedule by this dispatcher.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">State</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The GitHub workflow state (e.g., <code>active</code>,{" "}
                  <code>disabled_manually</code>).
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Ref (Git Reference)</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The git branch name, tag, or commit SHA where the workflow will run. If
                  left empty, the repository default branch is used.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Inputs</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Key-value parameters accepted by the workflow definition, passed as a JSON
                  object during dispatch.
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <CalendarClock className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Schedules</h2>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Schedule</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  An automation rule associating a dispatchable workflow with a recurring
                  cron interval, target ref, and default inputs.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Cron Expression</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  A standard 5-field cron pattern (<code>minute hour day month day-of-week</code>)
                  evaluated in UTC. For example, <code>0 2 * * *</code> triggers daily at 02:00 UTC.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Status (Enabled / Disabled)</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Controls whether the schedule is active. Disabled schedules remain
                  configured but are paused from firing.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Next Run At / Last Run At</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The projected UTC timestamp for the next trigger, and the timestamp when
                  the schedule was most recently triggered.
                </dd>
              </div>
              <div className="rounded-md border p-3 sm:col-span-2">
                <dt className="font-medium text-foreground">Jitter Delay</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  A small randomized wait time inserted before invoking GitHub API to prevent
                  simultaneous jobs from creating concurrency bursts.
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <ScrollText className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Dispatch Logs & Audit Trail</h2>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Triggered At</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The exact UTC timestamp when the dispatch HTTP request was sent to GitHub.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Target</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  A point-in-time snapshot of the repository, workflow, ref, resolved ref,
                  and inputs used for the execution.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Status Code</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  HTTP response code from the GitHub API. <code>204 No Content</code> indicates
                  successful dispatch acceptance. Codes 4xx/5xx indicate validation or server errors.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="font-medium text-foreground">Run URL</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  A direct link to the resulting GitHub Actions workflow run in GitHub,
                  allowing immediate inspection of execution steps and logs.
                </dd>
              </div>
              <div className="rounded-md border p-3 sm:col-span-2">
                <dt className="font-medium text-foreground">Response Payload & Error Message</dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  The raw JSON response or diagnostic error string recorded when GitHub
                  rejects the dispatch or when a network exception occurs.
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <Layers className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Engine & System Components</h2>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <dt className="flex items-center gap-1 font-medium text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" />
                  APScheduler
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  In-process Python scheduling engine evaluating cron triggers against UTC
                  timestamps and scheduling dispatch tasks.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="flex items-center gap-1 font-medium text-foreground">
                  <Activity className="size-3.5 text-muted-foreground" />
                  Rate Limiter
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Token bucket rate limiter that throttles outbound GitHub API requests to
                  prevent secondary rate limit violations.
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="flex items-center gap-1 font-medium text-foreground">
                  <Badge variant="outline" className="text-[10px]">UTC</Badge>
                  Timezone Standardization
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  All schedule evaluations, trigger timestamps, and sync times are strictly
                  calculated in UTC (Coordinated Universal Time).
                </dd>
              </div>
              <div className="rounded-md border p-3">
                <dt className="flex items-center gap-1 font-medium text-foreground">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  GitHub App Integration
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">
                  Installed organization GitHub App with scoped permissions for Actions,
                  Repository Contents, and Metadata.
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>
            Developer profiles and external contact links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {CONTACT_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex transition-opacity hover:opacity-80"
              >
                <img
                  src={item.badgeUrl}
                  alt={item.label}
                  className="h-5"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
