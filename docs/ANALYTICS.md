# Privacy-safe product measurement

PDF Toolbox exposes a small, typed activation-event schema without shipping an
analytics vendor or making network requests. Deployments can subscribe to the
`pdf-toolbox:metric` browser event and forward only its `detail` payload after a
cookieless analytics property has been configured.

## Event schema

| Event | Allowed properties | Funnel meaning |
| --- | --- | --- |
| `tool_opened` | `tool` | A tool route was opened |
| `file_selected` | `tool`, `source` (`device` or `recent`) | A valid local input entered a tool |
| `export_downloaded` | `tool`, `output` (`single` or `zip`) | The user downloaded a completed result |
| `workflow_continued` | `from`, `to` | A result moved directly into another tool |
| `pro_interest_opened` | `placement` (`home` or `result`), optional `tool` | A user opened the public Founding Pro research form |

The union in `src/lib/analytics.ts` is the allowlist. Do not add arbitrary
property bags. In particular, events must never contain filenames, document
bytes or text, metadata values, passwords, signatures, exact file sizes, or
persistent device identifiers. Founding Pro submissions are explicit public GitHub issues; the form warns users not to include personal, confidential, or document information.

## Provider integration checklist

1. Select a cookieless provider that can receive custom events without setting
   cross-site identifiers.
2. Configure the public site/domain identifier outside the repository.
3. Add a transport that accepts only `ProductEvent`; do not expose a generic
   `track(name, properties)` API.
4. Verify requests in the browser network panel with a sensitive fixture.
5. Document retention and deletion settings before enabling production data.
