#!/usr/bin/env bash
set -e

# We can only use the ts-loader if the user has installed Sly
# If they run from npx without installing, don't set the flag
if [ -d "./node_modules/@sly-cli/sly" ]; then
  export NODE_OPTIONS="--experimental-loader @sly-cli/sly/ts-loader"
fi

# Get the absolute path of the script
SCRIPT=$(readlink -f "$0")

# Get the directory name of the script
DIR=$(dirname "$SCRIPT")

node "$DIR/dist/index.js" "$@"
