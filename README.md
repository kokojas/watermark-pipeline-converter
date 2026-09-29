# watermark-pipeline-converter

A local browser tool for watermarking and compressing documents.

## What it does

- Accepts PDF, DOC/DOCX, PPT/PPTX and JPEG/PNG inputs
- Converts to PDF, applies text or image watermark, rasterizes and compresses
- Provides preview and output through a local web interface
- Binds the server to `127.0.0.1` and keeps working files locally

## Quick start

Install PyMuPDF with `python3 -m pip install PyMuPDF`, run `python3 server.py`, then open `http://127.0.0.1:8766`.

## Browse the repository

- `server.py` — local HTTP server
- `static` — browser interface

## Compatibility

Python 3 and PyMuPDF. Office conversion prefers Microsoft Word/PowerPoint or LibreOffice when installed; fallback conversion is available.

## Quality checks

Python and JavaScript syntax checks passed. Inspect any output PDF visually, especially when source documents use complex fonts or layouts.

## Security and privacy

Inspect source files and your own input data before running or publishing outputs. Do not commit credentials, browser cookies, client documents or generated work directories.

## Limits

Rasterization can make text unselectable and reduce fine-detail quality. Localhost binding does not expose the server to the public network.
