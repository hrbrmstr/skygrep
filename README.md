# Skygrep

A real-time Bluesky Jetstream firehose consumer that filters and forwards posts to Kafka topics based on configurable rules.

## 🌟 Features

- Connect to Bluesky's firehose via Jetstream
- Filter posts using configurable regex patterns
- Forward matched posts to Kafka topics
- Prometheus-compatible metrics endpoint
- Health monitoring endpoint
- Configurable historical backfill
- Docker-based development environment

## 🛠️ Prerequisites

- [Deno](https://deno.land/) runtime
- [Redpanda](https://github.com/redpanda-data/redpanda/) (recomended vs.Kafka-proper)
- [Docker](https://www.docker.com/) and Docker Compose
- [just](https://github.com/casey/just) command runner

## 🏃🏼‍♀️ Quickstart

Edit `docker-config.json` to setup `rules` for what you want to monitor then run:

```bash
docker compose up --build -d
```

or

```bash
just start
```

and Docker Compose will do everything for you.

It's pretty efficient, resource-wise:

```bash
$ docker stats
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O        PIDS
24aa1f3f6169   skygrep            33.67%    59.73MiB / 15.66GiB   0.37%     1.71GB / 23.5MB   169MB / 3.46MB   5
962906967b45   redpanda-console   0.01%     24.26MiB / 15.66GiB   0.15%     153kB / 269kB     167MB / 8.19kB   10
3d5bbc67bf81   redpanda-0         1.03%     1.824GiB / 15.66GiB   11.65%    2.85MB / 397kB    255MB / 7.21MB   3
```

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://codeberg.org/hrbrmstr/skygrep.git
cd skygrep
```

2. Create a `config.json` file:
```json
{
  "jetstream": {
    "endpoint": "wss://jetstream2.us-east.bsky.network/subscribe"
  },
  "kafka": {
    "brokers": ["localhost:19092"]
  },
  "rules": [
    {
      "type": "collection",
      "collections": [
        "sh.tangled.repo",
        "sh.tangled.feed.star",
        "sh.tangled.graph.follow",
        "sh.tangled.publicKey",
        "sh.tangled.repo.issue.comment"
      ],
      "kafkaTopic": "tangled"
    },
    {
      "field": "text",
      "pattern": "(?i)(bitcoin|crypto|eth|nft)",
      "kafkaTopic": "crypto_posts"
    },
    {
      "field": "text",
      "pattern": "(?i)CVE-\\d{4}-\\d{4,}",
      "kafkaTopic": "cve_mentions"
    }
  ]
}
```

3. Start the development environment:
```bash
just dev
```

## 🔧 Available Commands

- `just build` — build cli
- `just clean` — clean up docker resources — this also deletes the volume
- `just default` — show tasks
- `just dev` — dev mode
- `just health-check` — monitor the health of Skygrep
- `just reset` — rebuild and run fresh instance — this also deletes the volume
- `just start` — start services
- `just stop` — stop docker w/o deleting the volume
- `just watch-metrics` — watch metrics with live updates every 5 seconds

## 📊 Monitoring

### Metrics Endpoint
Access metrics at `http://localhost:3030/metrics`

Example response:
```json
{
  "crypto_posts": 42,
  "cve_mentions": 7
}
```

### Health Endpoint
Access health status at `http://localhost:3030/health`

Example response:
```json
{
  "status": "healthy",
  "uptime_ms": 20918,
  "last_event_ms_ago": 0
}
```

## 🏗️ Architecture

The application consists of several key components:

1. **Jetstream Client**: Connects to Bluesky's firehose and receives real-time posts
2. **Kafka Producer**: Forwards matched posts to configured Kafka topics
3. **Rule Engine**: Applies regex patterns to filter relevant posts or captures events for one or more collections
4. **Metrics Server**: Exposes operational metrics and health status

## 🐳 Docker Services

- **Redpanda**: Kafka-compatible event streaming platform
  - Kafka API: localhost:19092
  - Schema Registry: localhost:18081
  - Admin API: localhost:19644
- **Redpanda Console**: Web UI for managing Kafka
  - Interface: http://localhost:9080
- **Skygrep**:
  - Health: http://localhost:3030/health
  - Metrics: http://localhost:3030/metrics

## 📝 Configuration Options

Command line flags:
- `--hours`: Number of hours to look back in history (default: 24)
- `--port`: HTTP server port (default: 3030)
- `--help`: Show help message

## 🚨 Monitoring and Maintenance

The application provides:
- Real-time metrics for rule matches
- Health status monitoring
- Graceful shutdown on SIGINT/SIGTERM
- Connection status logging

## 📄 License

MIT
