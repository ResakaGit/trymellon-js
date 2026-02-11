---
name: fintech-hexagonal-manifesto
description: Enforces the FinTech Architecture Manifesto for AWS Lambda (ARM64) and TypeScript: Functional Hexagonal + Railway Oriented Programming. Use when building or reviewing financial systems, Lambda handlers, domain logic, DynamoDB writes, or when the user mentions FinTech, hexagonal architecture, Result monad, idempotency, or precision for money.
---

# FinTech Architecture Manifesto

Functional Hexagonal + Railway Oriented Programming. Ten non-negotiable rules for financial systems on AWS Lambda (ARM64) and TypeScript.

**Principle:** _"Code as if the auditor is a serial killer who knows where you live."_

---

## 1. Error as First-Class Citizen (Result Monad)

**Rule:** Domain functions MUST return `Result<T, E>`. Expected errors (insufficient funds, blocked account) are return values, not exceptions.

**Do not:** Use `try/catch` for business logic.

**Purpose:** Railway Oriented Programming — force handling the error path; no silent failures in production.

---

## 2. Pure Functional Core

**Rule:** Business logic lives in pure functions. No side effects, no external dependencies.

**Do not:** Import DB, HTTP clients, or AWS SDKs in the Domain Core. Only types or math/logic libraries.

**Purpose:** Full testability without mocks; absolute determinism.

---

## 3. Imperative Shell

**Rule:** Infrastructure and I/O only in input adapters (Handlers) and output adapters (Gateways). The Shell: validates input with Zod → calls Core → persists result.

**Do not:** Put AWS/volatile concerns inside domain code.

**Purpose:** Isolate AWS volatility from stable business rules.

---

## 4. Dependency Injection via HOF

**Rule:** No DI containers, decorators, or reflection. Use Higher-Order Functions: use cases receive ports (dependencies) as arguments and return the executor function.

**Do not:** Use class-based DI or framework magic.

**Purpose:** Simplicity, fast compile/run, explicit composition.

---

## 5. Absolute Financial Precision

**Rule:** No `number`/`float` for monetary amounts. Use `bigint` in smallest unit (cents, satoshis) or a decimal-precision library.

**Do not:** Use `number` for money. Floating point causes accounting errors.

**Purpose:** Balance integrity and auditability without discrepancies.

---

## 6. Idempotency by Design

**Rule:** Every write to the database (DynamoDB) MUST use `ConditionExpression` based on `idempotencyKey` or `version`.

**Do not:** Assume events (SQS, EventBridge, Lambda) are delivered exactly once.

**Purpose:** No double charge or duplicate transactions on retries.

---

## 7. Opaque Typing and Validation at the Boundary

**Rule:** Use Branded Types (e.g. `AccountId`, `UserId`) so you cannot pass a user ID where an account ID is required. Validate with Zod the moment the event hits the Lambda.

**Do not:** Trust data crossing the application boundary; do not use raw strings for IDs in domain.

**Purpose:** No parameter-swap bugs; robust data contracts.

---

## 8. Immutability and Audit Trail (Append-Only)

**Rule:** Financial state is not "updated"; it is transformed via events. No destructive UPDATE. If a record changes, persist a new version or a reversal entry.

**Do not:** Overwrite or delete financial records in place.

**Purpose:** Full traceability for compliance and forensic debugging.

---

## 9. Ephemeral Architecture and ARM64 Optimization

**Rule:** Code must be light (no heavy deps), optimized for `arm64`, minimal cold start. Cache DB connections outside the handler.

**Do not:** Heavy frameworks or per-invocation connection creation inside the handler.

**Purpose:** Low P99 latency and cost optimization on AWS.

---

## 10. Contract-Based Deployment

**Rule:** Infrastructure as code. `serverless.yml` (or equivalent) MUST define IAM permissions following least privilege per function.

**Do not:** Broad or shared IAM roles that exceed what each Lambda needs.

**Purpose:** Defensive security at the infrastructure layer for financial assets.

---

## Quick Checklist (Code Review)

When reviewing or writing code under this manifesto:

- [ ] Domain returns `Result<T, E>`; no try/catch for business errors
- [ ] Core has no I/O, no AWS/DB imports
- [ ] Shell: Zod at boundary → Core → Gateway
- [ ] Use cases are HOFs receiving ports as arguments
- [ ] Amounts in `bigint` (smallest unit) or decimal lib; no `number`
- [ ] DynamoDB writes use `ConditionExpression` (idempotencyKey/version)
- [ ] Branded types for IDs; Zod validation at Lambda entry
- [ ] Append-only / new version; no destructive UPDATE
- [ ] Lean deps, arm64, connection cache outside handler
- [ ] IAM least privilege per function in IaC

---

## Code Patterns

For concrete TypeScript patterns (Result type, HOF use-case composition, Branded Types, Zod at boundary), see [reference.md](reference.md).
