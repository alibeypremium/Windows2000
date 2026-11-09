#!/bin/sh
# usage: try.sh file.cpp  -> compile a single translation unit
SDK=/tmp/wasi-sdk
$SDK/bin/clang++ --sysroot=$SDK/share/wasi-sysroot --target=wasm32-wasi -std=c++14 -O1 -fno-exceptions -I../shim -I. -c "$1" -o /tmp/pbobj/$(basename "$1").o 2>&1 | head -${2:-12}
