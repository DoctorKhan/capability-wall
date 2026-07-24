# Capability Wall — chat CTF. Run `just` to list recipes.

set shell := ['/bin/zsh', '-eu', '-o', 'pipefail', '-c']

default:
    @just --list

install: ## Install dependencies (pnpm)
    pnpm install

dev: ## Vite dev server — http://127.0.0.1:5173
    pnpm run dev -- --host 127.0.0.1 --strictPort

build: ## Production build → dist/
    pnpm run build

preview: build ## Build then serve production preview
    pnpm run preview -- --host 127.0.0.1 --strictPort

check: ## Type-check
    pnpm run check

test: ## Unit + session tests
    pnpm test

verify: check test build ## Pre-push gate: check + test + build

clean: ## Remove build output and Vite cache
    rm -rf dist node_modules/.vite
