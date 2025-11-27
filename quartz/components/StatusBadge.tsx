import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

const LABELS: Record<string, string> = {
  "notion": "Notion",
  "half-baked":  "Half-Baked",
  "good-enough":"Good Enough",
}

export default (() => {
  function StatusBadge({ fileData }: QuartzComponentProps) {
    const fm = fileData.frontmatter ?? {}
    const raw = (fm["status"] ?? "").toString().toLowerCase().trim()
    if (!raw) return null
    const label = LABELS[raw] ?? raw
    return <span class="status-badge">{label}</span>
  }
  StatusBadge.css = `
    .status-badge {
      display: inline-block;
      margin-left: .1rem;
      margin-top: .5rem;
      margin-bottom: .5rem;
      padding: .1rem .5rem;
      border: 1px solid currentColor;
      border-radius: .5rem;
      font-size: .85em;
      opacity: .9;
    }
  `
  return StatusBadge
}) satisfies QuartzComponentConstructor

