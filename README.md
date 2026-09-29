# watermark-pipeline-converter

Local document watermarking and PDF conversion.

## What it does

Browser interface and Python server for converting documents or images to PDF, applying text or image watermarks, rasterizing pages and compressing the result. Install PyMuPDF, run `python3 server.py`, then open `http://127.0.0.1:8766`. Office conversion uses installed Word, PowerPoint or LibreOffice when available. The server binds to localhost.

## Workflow

1. Upload PDF, DOCX, PPTX or an image in the local browser interface.
2. Convert to PDF and apply a text or image watermark.
3. Render pages to JPEG, rebuild the PDF and set output quality.
4. Review and download the generated file.

## Repository

Source files are in `scripts/`, `references/`, `agents/` or `static/` where applicable.

## Notes

Commands that use external services require your own authenticated account. Review generated outputs before sharing them.
