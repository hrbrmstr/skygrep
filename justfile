set quiet

# show tasks
@default:
  just --list

# dev mode
@dev:
  docker compose up -d
  deno task dev

# build cli
@build:
  deno compile --allow-read --allow-env --allow-net src/main.ts

# start services
@start:
  docker compose up --build -d

# stop docker w/o deleting the volume
@stop:
  docker compose down

# clean up docker resources — this also deletes the volume
@clean:
  docker compose down -v

# rebuild and run fresh instance — this also deletes the volume
@reset: clean start

# watch metrics with live updates every 5 seconds
watch-metrics:
  #!/usr/bin/env bash
  while true; do
    metrics=$(curl -s http://localhost:3030/metrics)
    crypto=$(echo "$metrics" | jq -r '.crypto_posts')
    cve=$(echo "$metrics" | jq -r '.cve_mentions')
    printf "\rcrypto_posts: %d | cve_mentions: %d" "$crypto" "$cve"
    sleep 5
  done

# monitor the health of Skygrep
@health-check:
   docker inspect skygrep | jq '.[] | .State.Health'
