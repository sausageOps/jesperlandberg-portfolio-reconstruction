# Jesper Landberg original-site HAR extraction

Source website: https://jesperlandberg.com/
Source capture: download(3)
HAR version: 1.2
Captured entries: 224
Responses with bodies extracted: 212
Extracted response bytes: 58,469,638

## Contents
- `manifest.json`: every captured request, original URL, status, MIME type, extracted file path, timing, and sanitized request/response headers.
- `data/json/`: JSON and Next.js payload responses.
- `data/graphql/`: GraphQL response bodies.
- `assets/images/`, `assets/videos/`, `assets/fonts/`: captured media/font bodies.
- `assets/styles/`, `assets/scripts/`: captured CSS and JavaScript response bodies.
- `responses/`: HTML and other response documents.
- `assets/other/`: other captured response bodies.

## Extraction notes
- Only response bodies present in the HAR were extracted. Requests without an embedded response body are listed in `manifest.json` with `extraction: no_body`.
- URLs are preserved in the manifest; filenames are indexed and hashed to avoid collisions.
- Request cookies, authorization headers, and response `Set-Cookie` headers were omitted from the manifest.
- This is a network capture, not a full source repository. Minified/bundled scripts may be included as downloaded, and interaction/animation behavior still needs live-site comparison.

## Structured project data
- `data/projects.json`: deduplicated representative GraphQL project dataset (23 records).
- `data/project_media_urls.csv`: URLs referenced inside project records (389 URL occurrences), with JSON paths and project names.
- The GraphQL response was captured repeatedly; raw copies are preserved under `data/graphql/`.
