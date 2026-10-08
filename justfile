# Deloitte Airport Modernization ECS — Justfile
# Run `just` or `just --list` to view available recipes.

set dotenv-load := true

port := env_var_or_default("PORT", "3002")
api_port := env_var_or_default("API_PORT", "3001")

# List all available commands
default:
    @just --list

# Install dependencies for root, client, and server workspaces
install:
    npm install

# Build the SolidJS frontend into src/client/dist
build-frontend:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -d node_modules/@google/genai ] || [ ! -d node_modules/esbuild ]; then
      echo "==> Installing missing workspace dependencies (npm install) ..."
      npm install
    fi
    npm run build --workspace=src/client

# Typecheck client and server code
typecheck:
    npm run typecheck

# Run unused dependency and export analysis via Knip
knip:
    npm run knip

# Run all static checks (typecheck + knip)
check: typecheck knip

# Build both frontend and backend for production
build: build-frontend

# Debug both frontend and backend together on a single port (0.0.0.0:3002) with watch mode
debug:
    #!/usr/bin/env bash
    set -euo pipefail
    npm run build:frontend
    npx --workspace=src/client vite build --watch &
    CLIENT_PID=$!
    trap "kill $CLIENT_PID 2>/dev/null || true" EXIT
    PORT={{port}} npx tsx watch src/server/main.ts

# Debug frontend (Vite HMR on :3002) and backend (Hono watch on :3001) concurrently via Vite /api proxy
debug-split:
    #!/usr/bin/env bash
    set -euo pipefail
    PORT={{api_port}} npx tsx watch src/server/main.ts &
    SERVER_PID=$!
    trap "kill $SERVER_PID 2>/dev/null || true" EXIT
    API_URL="http://localhost:{{api_port}}" npm run dev --workspace=src/client

# Debug only the Hono backend in watch mode
debug-server:
    PORT={{port}} npm run dev:server

# Debug only the SolidJS frontend with Vite dev server
debug-client:
    npm run dev:client

# Verify Hono backend health endpoint
health:
    curl -fsS "http://localhost:{{port}}/api/health" && echo ""

# Tail client and server log files in ./logs
logs:
    tail -n 50 logs/server.log logs/client.log

# Start the unified production server (serves built frontend + Hono API)
serve:
    PORT={{port}} npm run start

# Full deployment pipeline: install, check, build frontend + backend, and start production server
deploy: install check build serve

# Pack the deployment as a single-press stand-alone executable (./airport-modernization-ecs and ./dist-package/airport-modernization-ecs)
pack: build-frontend
    #!/usr/bin/env bash
    set -euo pipefail
    echo "==> Packing single-press executable deployment in ./dist-package ..."
    if [ ! -d node_modules/@google/genai ] || [ ! -d node_modules/esbuild ]; then
      echo "==> Installing missing dependencies (npm install) ..."
      npm install
    fi
    rm -rf dist-package dist-package.tar.gz airport-modernization-ecs
    mkdir -p dist-package/src/client dist-package/logs dist-package/reports dist-package/node_modules/@electric-sql
    cp -r src/client/dist dist-package/src/client/dist
    cp config.json dist-package/config.json
    if [ -d node_modules/@electric-sql/pglite ]; then
      cp -r node_modules/@electric-sql/pglite dist-package/node_modules/@electric-sql/pglite
    fi
    npx esbuild src/server/main.ts --bundle --platform=node --format=esm --minify --external:@electric-sql/pglite --banner:js="import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" --outfile=dist-package/server-bundle.mjs
    printf '#!/usr/bin/env bash\nset -euo pipefail\nDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\ncd "$DIR"\nexec node "$DIR/server-bundle.mjs" "$@"\n' > dist-package/airport-modernization-ecs
    chmod +x dist-package/server-bundle.mjs dist-package/airport-modernization-ecs
    printf '#!/usr/bin/env bash\nset -euo pipefail\nDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\ncd "$DIR/dist-package"\nexec node "$DIR/dist-package/server-bundle.mjs" "$@"\n' > airport-modernization-ecs
    chmod +x airport-modernization-ecs
    tar -czf dist-package.tar.gz dist-package
    echo "==> Single-press executable created: ./airport-modernization-ecs (and ./dist-package/airport-modernization-ecs)"
    echo "==> Slim deployment archive created: ./dist-package.tar.gz"
    ls -lh airport-modernization-ecs dist-package/airport-modernization-ecs dist-package.tar.gz

# Alias for pack: create a slim deployment package with a stand-alone executable process
package-slim: pack

# Run the packaged stand-alone executable
run-standalone:
    ./airport-modernization-ecs

# Clean build artifacts, standalone package, and temporary TypeScript caches
clean:
    rm -rf src/client/dist src/client/node_modules/.tmp dist-package dist-package.tar.gz airport-modernization-ecs
