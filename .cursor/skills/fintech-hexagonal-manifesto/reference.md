# FinTech Manifesto — Code Reference

Concrete TypeScript patterns for the 10 rules.

---

## 1. Result type (no try/catch for domain)

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function debit(balance: bigint, amount: bigint): Result<bigint, 'INSUFFICIENT_FUNDS' | 'BLOCKED'> {
  if (amount > balance) return { ok: false, error: 'INSUFFICIENT_FUNDS' };
  return { ok: true, value: balance - amount };
}
```

Handler (Shell) maps domain `Result` to HTTP/response; it does not use try/catch for business outcomes.

---

## 2. Pure Core — no imports from I/O

Domain folder may import only:

- Types (interfaces, branded types)
- Pure utils or math (e.g. decimal library)

Never: `@aws-sdk/*`, `dynamodb`, `axios`, env, etc.

---

## 3. Shell flow

```
Event → Zod parse → Core(input) → Result → Gateway.persist (if ok) → Response
```

Zod failure → 400; Core `ok: false` → business error response (e.g. 422); Gateway failure → 500.

---

## 4. Use case as HOF (ports as arguments)

```typescript
// Port (interface for adapter)
type GetBalance = (accountId: AccountId) => Promise<bigint>;
type SaveBalance = (accountId: AccountId, balance: bigint) => Promise<void>;

// Use case: receives ports, returns executor
function makeDebit(getBalance: GetBalance, saveBalance: SaveBalance) {
  return async (accountId: AccountId, amount: bigint): Promise<Result<void, DomainError>> => {
    const balance = await getBalance(accountId);
    const result = debit(balance, amount); // pure domain
    if (!result.ok) return result;
    await saveBalance(accountId, result.value);
    return { ok: true, value: undefined };
  };
}
```

Handler wires concrete Gateways into `makeDebit` and calls the returned function.

---

## 5. Money as bigint (smallest unit)

```typescript
// Store and operate in cents (or satoshis)
const amountCents = 199n; // 1.99
const balanceCents = 1000n;
// Comparisons and arithmetic in bigint; convert to display only at boundary
```

Alternatively use a decimal library with fixed precision; never `number` for amounts.

---

## 6. Idempotency in DynamoDB

```typescript
// PutItem with condition: only write if idempotencyKey not present (or version match)
ConditionExpression: 'attribute_not_exists(idempotencyKey)';
// or
ConditionExpression: 'version = :expectedVersion';
```

Every write path for financial state must use such a condition to avoid double apply on retries.

---

## 7. Branded types + Zod at boundary

```typescript
declare const AccountIdBrand: unique symbol;
type AccountId = string & { [AccountIdBrand]: true };

const AccountIdSchema = z
  .string()
  .uuid()
  .transform((s) => s as AccountId);

// In handler: parse event with Zod, get AccountId; pass only typed values to Core
const parsed = EventSchema.safeParse(event);
if (!parsed.success) return { statusCode: 400, body: parsed.error.message };
// parsed.data.accountId is AccountId, not string
```

---

## 8. Append-only / new version

- Do not: `UpdateItem` that overwrites balance or critical fields.
- Do: `PutItem` with new version, or append event/ledger row; reversals as new entries.

---

## 9. ARM64 and cold start

- Use `arm64` in Lambda config.
- Lazy-init or cache DB client outside handler so it’s reused across invocations.
- Keep dependencies minimal to reduce bundle and cold start.

---

## 10. IAM in serverless.yml

Per-function IAM role with only the actions/resources that function needs (e.g. DynamoDB table, specific SQS queue). No `*` on actions or resources for production.
