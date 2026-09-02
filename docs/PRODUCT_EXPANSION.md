# Product expansion roadmap

## Product identity

Private Document Toolbox is now led by **Safe to Share**: a local document-release workflow for professionals handling confidential PDFs. The focused PDF, image, document, and data utilities remain free acquisition and support tools. Breadth is valuable only when it reinforces the release workflow or demonstrates real user demand.

## Commercial priority — Safe to Share

- Shipped: local release-risk scan for metadata, annotations, forms, attachments, scripts/actions, and common selectable-text patterns
- Shipped: maximum-safety flattened export, post-export verification, SHA-256 release receipt, and explicit human-review acknowledgement
- Next: search-assisted manual redaction, stronger hostile-PDF fixtures, batch release checks, reusable local release policies, and receipt history
- Deferred: OCR, AI review, cloud case storage, team administration, and compliance claims

## Release sequence

### M1 — Office foundation and Images to Word (complete)

- Dedicated Office worker and typed message boundary
- Capability-aware file matching
- Images to DOCX with ordering, A4/Letter, automatic or fixed orientation, margins, progress, cancellation, metadata stripping, and explicit safety budgets
- Semantic OOXML assertions and a no-document-network-request browser check
- Broader product identity in all five languages

### M2 — Image and scan workbench (maintenance)

- Shipped: batch resize presets, centered 1:1/4:3/16:9 crops, rotation, PNG/JPG/WebP conversion, metadata stripping, before/after size reporting, aspect-ratio preservation, no upscaling, safety budgets, progress, and cancellation
- Metadata viewer and reusable image presets when supported by observed demand
- OCR to TXT and searchable PDF with language packs loaded only when requested
- PDF image extraction and scan cleanup

### M3 — Data and lightweight document tools

- CSV/TSV/JSON to XLSX and XLSX sheet export
- TXT and a documented Markdown subset to DOCX/PDF
- DOCX text and image extraction with hostile-ZIP/XML limits
- PDF pages or images to PPTX as visual slides

### M4 — PDF completeness and workflows

- Crop and resize pages, N-up layouts, flatten forms/annotations, extract images
- Reusable local workflows, presets, offline installation, and batch chaining
- Accessibility and multi-browser compatibility matrix

## Deliberate deferrals

The static browser product will not initially promise high-fidelity DOCX/XLSX/PPTX to PDF, PDF to editable Office, legacy DOC/XLS/PPT, arbitrary URL to PDF, certified e-signatures, or cloud-drive automation. Those features require an Office-grade renderer, a carefully sandboxed backend, or both. They should be revisited only after the core toolbox is stable and the custom-domain/backend stage is ready.

## Release gates for every new format

1. Validate the actual output package or file structure.
2. Enforce compressed size, expanded size, item-count, pixel, and time budgets appropriate to the format.
3. Reject external relationships, macros, active content, and path traversal when reading Office packages.
4. Keep document bytes out of analytics and network requests.
5. Provide accurate fidelity labels; never imply OCR or editability when output is image-based.
6. Localize the entire user path and verify keyboard, mobile, and screen-reader semantics.
