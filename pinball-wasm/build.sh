#!/bin/sh
# Builds assets/games/pinball/pinball.wasm from the SpaceCadetPinball sources with wasi-sdk.
set -e
cd "$(dirname "$0")/src"
SDK=${WASI_SDK:-/tmp/wasi-sdk}
mkdir -p /tmp/pbobj; rm -f /tmp/pbobj/*
ls *.cpp | grep -v -E "^(SpaceCadetPinball|font_selection|DebugOverlay|EmbeddedData)" | xargs -P8 -I{} sh -c "$SDK/bin/clang++ --sysroot=$SDK/share/wasi-sysroot --target=wasm32-wasi -std=c++14 -O2 -fno-exceptions -I../shim -I. -c {} -o /tmp/pbobj/{}.o"
$SDK/bin/clang++ --sysroot=$SDK/share/wasi-sysroot --target=wasm32-wasi -mexec-model=reactor -fno-exceptions -O2 /tmp/pbobj/*.o -Wl,--allow-undefined-file=/dev/null -o ../../assets/games/pinball/pinball.wasm
