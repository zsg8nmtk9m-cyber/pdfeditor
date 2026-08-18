# Product expansion roadmap

## Product identity

Private Document Toolbox is a focused set of PDF, image, document, and data utilities that run on the user's device. Breadth is valuable only when privacy, output honesty, and browser reliability survive the expansion.

## Release sequence

### M1 — Office foundation and Images to Word

- Dedicated Office worker and typed message boundary
- Capability-aware file matching
- Images to DOCX with ordering, A4/Letter, automatic or fixed orientation, margins, progress, cancellation, metadata stripping, and explicit safety budgets
- Semantic OOXML assertions and a no-document-network-request browser check
- Broader product identity in all five languages

### M2 — Image and scan workbench

- Resize, compress, crop, rotate, and convert PNG/JPG/WebP
- Metadata viewer and scrubber
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
