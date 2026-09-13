# Vaultline Documentation Hub

```text
  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗██╗     ██╗███╗   ██╗███████╗
  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝██║     ██║████╗  ██║██╔════╝
  ██║   ██║███████║██║   ██║██║     ██║   ██║     ██║██╔██╗ ██║█████╗  
  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ██║     ██║██║╚██╗██║██╔══╝  
   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ███████╗██║██║ ╚████║███████╗
    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                     TECHNICAL DOCUMENTATION REPOSITORY
```

Welcome to the canonical technical documentation repository for **Vaultline**. This directory houses in-depth specifications, architectural blueprints, threat modeling, endpoint schemas, and evaluation runbooks.

---

## Documentation Navigation Paths

### 1. For Evaluators & Academic Reviewers
1. 📄 [Project README](../README.md) — High-level architecture, feature highlights, and quickstart
2. 🎬 [Demo & Presentation Runbook](DEMO_GUIDE.md) — 3-minute guided tour and 7-minute live evaluation script
3. 📝 [Combined Team Journal](../journals/COMBINED_TEAM_JOURNAL.md) — Multi-contributor engineering log & retrospectives
4. 📋 [Project Status & Readiness Report](../STATUS.md) — Verification gate results and capability checklist

### 2. For Software Engineers & System Designers
1. 🏛️ [System Architecture](ARCHITECTURE.md) — 11 Mermaid diagrams, sequence flows, data models, and trust boundaries
2. 📡 [REST API Reference](API_REFERENCE.md) — Full endpoint contracts, JSON payloads, and HTTP status codes
3. 🧪 [Testing & Quality Runbook](TESTING.md) — Automated verification matrix, commands, and security tests
4. 🚀 [Deployment Guide](../DEPLOYMENT_GUIDE.md) — Docker profiles, PostgreSQL migration, and production hardening
5. 💻 [Backend Operations Manual](../backend-integration/README.md) — FastAPI server configuration and setup

### 3. For Security Engineers & Cryptographers
1. 🛡️ [Security Threat Model](SECURITY.md) — STRIDE threat analysis, asset classification, and cryptographic specifications
2. 🔐 [Cryptographic Architecture](ARCHITECTURE.md#3-cryptographic-key-derivation--hierarchy) — PBKDF2, HKDF, AES-256-GCM, and RSA-OAEP 3072 protocols
3. 🚫 [Security Invariants & Incident Log](SECURITY.md#6-security-invariants-engineering-rules) — Operational rules and responsible disclosure

---

## Contributor Engineering Logs

| Contributor | Roll Number | Primary Responsibility | Link |
|---|---|---|---|
| **Ishjaap Singh** | `1024030327` | Full-Stack Integration, Auth Defect Repair, UI Redesign, Demo, Docs | [week1-2.md](../journals/1024030327-Ishjaap-Singh/week1-2.md) |
| **Vikramaditya** | `1024030315` | Frontend Core, Web Crypto Primitives, React Component Hierarchy | [week1-2.md](../journals/1024030315-Vikramaditya/week1-2.md) |
| **Sukhansh Mittal** | `1024030318` | Backend Routing, Database Models, Python 3.14 Triage | [week1-2.md](../journals/1024030318-sukhanshmittal/week1-2.md) |
| **Complete Team** | `Multi-Author` | Multi-Author Sprint Logs, Retrospectives, Decision Evolution | [Combined Journal](../journals/COMBINED_TEAM_JOURNAL.md) |
