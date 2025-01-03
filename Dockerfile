FROM denoland/deno:ubuntu

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache the dependencies
COPY deno.json .
COPY src/ src/

# Compile the application
RUN deno cache src/main.ts

# Run the application
CMD ["deno", "run", "--allow-read", "--allow-env", "--allow-net", "src/main.ts"]
