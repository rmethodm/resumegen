# PDF export fonts

TTF faces embedded into resume PDFs via Dompdf `@font-face`.

- Sourced from [Fontsource](https://fontsource.org/) static Latin subsets (SIL OFL / Apache 2.0 as applicable).
- Carlito / Caladea are metric-compatible stand-ins for Calibri / Cambria (not redistributable).
- Arial, Times New Roman, and Georgia use PDF core fonts (Helvetica / Times-Roman) — no TTF here.

Regenerate from jsDelivr Fontsource URLs if a face needs updating; keep regular (400) and bold (700) pairs for each family listed in `App\Support\PdfFonts`.
