# Changelog

## 2.1.0

### Added
- `HttpError.body` — error payload read once from the response
- `ParseError` for invalid JSON bodies
- `ClientOptions.transport` for custom/mock transports
- `BestFetch.eject()` / `HTTPClient.eject()` for plugins
- `QueryParams` with array support in `buildURL`
- Vitest test suite and GitHub Actions CI
- ESM build (`dist/esm`)

### Changed
- Empty and 204/205 responses return `undefined` instead of failing JSON parse
- `HttpError` is created via `HttpError.from()` (async) to populate `body`

### Breaking
- `HttpError` constructor is private; use `HttpError.from(response)` if needed directly

## 2.0.5

- Typed generics on `get`/`post`, per-request retry, `HttpError` instead of thrown `Response`
