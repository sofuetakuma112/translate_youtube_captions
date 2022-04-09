#!/bin/bash

if [ $# -ne 1 ]; then
  echo "指定された引数は$#個です。" 1>&2
  echo "実行するには1個の引数が必要です。" 1>&2
  exit 1
fi

node getTranscriptAndEscape.js $1
python3 repunc.py $1
node translateWithFiles.js $1