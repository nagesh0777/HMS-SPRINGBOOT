# Deploying Trikaar HMS

## Before the next deploy — required

The database predates Flyway, so it has tables but no migration history. Flyway will refuse to
run against it (`baseline-on-migrate` is deliberately off, so a drifted database fails loudly
rather than silently skipping migrations).

**One-off, on the server, before deploying this version:**

```bash
docker compose exec db mysql -uroot -p trikaar_emr -e "
CREATE TABLE IF NOT EXISTS flyway_schema_history (
  installed_rank INT NOT NULL PRIMARY KEY,
  version VARCHAR(50), description VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL, script VARCHAR(1000) NOT NULL,
  checksum INT, installed_by VARCHAR(100) NOT NULL,
  installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_time INT NOT NULL, success BOOL NOT NULL);
INSERT INTO flyway_schema_history VALUES
  (1,'1','baseline schema','SQL','V1__baseline_schema.sql',NULL,'manual',NOW(),0,1);"
```

That records V1 as already applied, which it effectively is. The new indexes then need creating
once — they are in V1 but V1 will not re-run:

```bash
docker compose exec db mysql -uroot -p trikaar_emr < backend-java/src/main/resources/db/migration/indexes-only.sql
```

Verify before deploying anywhere:

```bash
./scripts/verify-migrations.sh
```

## Environment

Copy `.env.example` to `.env` and fill in. Compose will refuse to start without
`MYSQL_ROOT_PASSWORD` and `APP_JWT_SECRET` — that is intentional; both previously had committed
defaults in a public repository and must be regenerated:

```bash
openssl rand -base64 24   # MYSQL_ROOT_PASSWORD
openssl rand -base64 48   # APP_JWT_SECRET
```

Rotating `APP_JWT_SECRET` invalidates every existing session — everyone signs in again once.

## Schema changes from here

Add `V2__describe_change.sql` in `backend-java/src/main/resources/db/migration/`. Never edit V1
after it has run: Flyway checksums applied migrations and will refuse to start if one changes.

## Still outstanding

- **The repository is public.** The old database password, JWT secret and VPS root details remain
  in git history even though they are gone from the working tree. Make it private, rotate all
  three, then treat the old values as compromised.
- **Nothing in this change set has been run against the live system.** The suite passes and both
  halves build; no request has been served.
