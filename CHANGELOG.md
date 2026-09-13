# Changelog

This changelog records meaningful product and security changes. Historical implementation notes are preserved in the [combined team journal](journals/COMBINED_TEAM_JOURNAL.md).

## 2026-09-14 — Release candidate documentation and quality pass

### Added

- Canonical documentation index.
- Architecture diagrams for system context, authentication, files, sharing, data model, and deployment.
- API reference, testing guide, deployment guide, and presentation script.
- Individual journal for Ishjaap Singh (`1024030327`).
- Combined team engineering journal with roles, weekly outcomes, and decision history.

### Changed

- Replaced contradictory completion/status documents with one evidence-based `STATUS.md`.
- Rewrote the root README around evaluator, developer, and security-review reading paths.
- Rewrote the backend README to match SQLite development, Argon2 authentication, and the current API contract.
- Pinned direct backend dependencies for reproducible installs.
- Replaced the generic HTML changelog artifact with this Markdown release record.

### Security

- Retired the credential-bearing troubleshooting document and documented the incident safely.
- Added production validation that rejects the shared development JWT secret and short production secrets.
- Added explicit security invariants and an operational hardening checklist.

## 2026-09-13 — Integrated product release candidate

### Added

- In-website `/demo` walkthrough with Overview, Encrypt, Share, Open, and Proof chapters.
- Persistent SQLAlchemy authentication with exact salt persistence and signed JWTs.
- Browser crypto regression tests and backend integration tests.

### Changed

- Replaced mock service calls with real Axios/FastAPI adapters.
- Introduced the warm editorial Vaultline design language across landing, auth, navigation, and workspace screens.
- Made SQLite the zero-setup local default while retaining PostgreSQL configuration.

### Fixed

- Repeat login failure caused by server-side replacement of the client registration salt.
- Sharing route contract and encrypted download header mapping.
- Windows startup crash caused by non-ASCII backend logging.
- Tracked Python bytecode and generated cache pollution.

## Before 2026-09-13

The repository contains earlier frontend, backend, and troubleshooting work from the team. Those entries are retained in contributor journals and Git history; they are not the source of truth for current behavior.

## Release note

This is an academic/local release candidate. Large-file chunking, hard revocation, refresh-token rotation, public-key transparency, object storage, and independent security review remain explicitly open.
