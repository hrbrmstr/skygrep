# show tasks
@default:
  just --list

# dev mode
@dev:
  docker compose -f docker-compose.yaml up -d
  deno run allow-read --allow-env --allow-net --watch main.ts

# build cli
@build:
  deno compile --allow-read --allow-env --allow-net main.ts

# start services and run cli
@run: ensure-docker build
  ./skygrep

# ensure docker services are up and healthy
@ensure-docker:
  #!/usr/bin/env bash
  docker compose -f docker-compose.yaml up -d
  # Wait for Redpanda to be ready (checking Kafka port)
  while ! nc -z localhost 19092; do
      echo "Waiting for Redpanda to be ready..."
      sleep 2
  done
  # Wait for Schema Registry to be ready
  while ! curl -s localhost:18081 >/dev/null; do
      echo "Waiting for Schema Registry to be ready..."
      sleep 2
  done
  # Wait for Console to be ready
  while ! curl -s localhost:9080 >/dev/null; do
      echo "Waiting for Console to be ready..."
      sleep 2
  done
  echo "All services are ready!"

# clean up docker resources — this also deletes the volume
@clean:
  docker compose -f docker-compose.yaml down -v

# stop docker w/o deleting the volume
@stop:
  docker compose -f docker-compose.yaml down

# rebuild and run fresh instance — this also deletes the volume
@reset: clean run

# watch metrics with live updates every 5 seconds
@watch-metrics:
  #!/usr/bin/env bash
  while true; do
    metrics=$(curl -s http://localhost:3030/metrics)
    crypto=$(echo "$metrics" | jq -r '.crypto_posts')
    cve=$(echo "$metrics" | jq -r '.cve_mentions')
    printf "\rcrypto_posts: %d | cve_mentions: %d" "$crypto" "$cve"
    sleep 5
  done
