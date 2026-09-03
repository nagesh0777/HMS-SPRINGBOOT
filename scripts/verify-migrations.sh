#!/usr/bin/env bash
# Flyway migrates an empty MySQL from scratch, then Hibernate validates the entities against the
# result. If a migration and an entity disagree by so much as a nullable flag, this fails here
# rather than at deploy time against patient data.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="hms-migrate-verify-$$"
PORT="${VERIFY_PORT:-3399}"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> throwaway MySQL on :$PORT"
docker run -d --rm --name "$NAME" -p "$PORT:3306" \
  -e MYSQL_ROOT_PASSWORD=verify -e MYSQL_DATABASE=trikaar_emr mysql:8 >/dev/null
until docker exec "$NAME" mysqladmin ping -h localhost -uroot -pverify --silent >/dev/null 2>&1; do sleep 2; done

echo "==> migrate from empty, then validate entities"
docker run --rm -v "$ROOT/backend-java":/app -v "$HOME/.m2":/root/.m2 -w /app \
  --add-host=host.docker.internal:host-gateway \
  -e APP_JWT_SECRET="verify-only" \
  maven:3.9-eclipse-temurin-21 mvn -B test \
    -Dspring.datasource.url="jdbc:mysql://host.docker.internal:$PORT/trikaar_emr?allowPublicKeyRetrieval=true&useSSL=false" \
    -Dspring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver \
    -Dspring.datasource.username=root -Dspring.datasource.password=verify \
    -Dspring.flyway.enabled=true -Dspring.jpa.hibernate.ddl-auto=validate

echo "==> migrations verified"
