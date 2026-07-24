set shell := ['/bin/zsh', '-eu', '-o', 'pipefail', '-c']

# Delegates to run.sh — use pnpm for all scripts.

help:
	@./run.sh help

install:
	@./run.sh install

dev:
	@./run.sh dev

build:
	@./run.sh build

preview:
	@./run.sh preview

check:
	@./run.sh check

test:
	@./run.sh test

verify:
	@./run.sh verify

clean:
	@./run.sh clean
