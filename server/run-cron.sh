#!/bin/bash
cd /Users/scales/Developer/chikoro-ai-mobile/server
export PATH="/Users/scales/.nvm/versions/node/v22.20.0/bin:$PATH"
node endpoints/cronupdates.js
