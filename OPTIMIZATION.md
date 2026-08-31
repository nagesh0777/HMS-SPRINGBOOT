# Multi-tenancy, correctness and performance

## Cross-tenant data leak — fixed

`DoctorPortalController` had three endpoints that fell back to `findAll()` when the signed-in user
had no linked doctor record — which is the case for **every admin, receptionist and manager
account**:

| Endpoint | Returned |
|---|---|
| `GET /Prescriptions` | Every prescription **on the platform**, all hospitals |
| `GET /FollowUps` | Every follow-up, all hospitals |
| `GET /Labs` | Every medical record, all hospitals |

The caller's `hospitalId` was already in scope on the line above, and simply not used. Any
non-doctor staff account at Hospital A could read Hospital B's prescriptions and lab results.

All three now use hospital-scoped queries. This is worth a look at your access logs.

## `/api/Migration/HashPasswords` — removed

A `GET` endpoint under `permitAll()`, so **unauthenticated**, that iterated every user on the
platform and rewrote passwords. Three problems at once: public, mutating on a GET (so it could be
triggered by an image tag on any page a logged-in admin visited), and a one-time migration that
had been left deployed. Deleted, and `/api/Migration/**` removed from the public matcher.

## Performance

**No indexes existed on any hot table.** Every query filters by `hospitalId`, so each one was a
full table scan whose cost grows with every tenant onboarded — the worst possible shape for
multi-tenant SaaS. Added 14 indexes across `patient`, `appointment`, `prescription`,
`medical_record` and `follow_up`, composite on the columns actually queried together.

**N+1 queries** in the prescription and follow-up lists: patient names were fetched one row at a
time, so 200 prescriptions meant 201 round trips. Replaced with a single batched lookup.

**Labs** loaded every medical record in the hospital and filtered by type in Java. Now filtered
by the database.

**Connection pool and JPA** were entirely untuned. Added Hikari sizing and — importantly — a
`max-lifetime` below MySQL's `wait_timeout`, without which the pool hands out connections the
server has already closed. Also JDBC batching, batch fetching, response compression, graceful
shutdown, and `open-in-view=false` (it held a database connection for the whole request
including rendering, quietly capping throughput at the pool size).

## Frontend bundle

Every page was in the entry bundle, so the login screen downloaded the billing dashboard, the
superadmin console and the 1,700-line prescription module before anyone could type a password.

| | Before | After |
|---|---|---|
| Entry chunk | 1,443 kB | **353 kB** |
| Entry, gzipped | 403 kB | **115 kB** |

Routes are lazy-loaded per page, and React / charts / animation are separate vendor chunks so a
routine deploy no longer invalidates the cached copy of all three. Recharts alone was 386 kB
loading on every page including login; it now loads only where a chart is rendered.

## Still open

- **`ddl-auto=update`** is still on. It issues unreviewed `ALTER`s against live patient data with
  no rollback. The new indexes will be created by it on next boot, which is fine — but this
  should move to Flyway, as GlamLook now has.
- **Nothing here has been run.** Backend compiles, frontend builds. No request has been served.
  The tenant-scoping fix in particular deserves a check against a second hospital account.
- The notification dropdown in `DashboardLayout` still uses a manual outside-click listener;
  `dropdown-menu.jsx` is ready for it.
