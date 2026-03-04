FROM node:20-slim

WORKDIR /app

# Install system essentials
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 1. Copy root package files
COPY package.json yarn.lock ./

# 2. Copy sub-app package files
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
COPY collector/package.json ./collector/

# 3. Install ALL dependencies
# This installs root deps + triggers installs in sub-folders
RUN yarn install
RUN cd frontend && yarn install
RUN cd server && yarn install
RUN cd collector && yarn install

# 4. Copy the rest of the source code
COPY . .

# Ensure the sub-app binaries are in the path
ENV PATH /app/node_modules/.bin:/app/frontend/node_modules/.bin:/app/server/node_modules/.bin:/app/collector/node_modules/.bin:$PATH

EXPOSE 4173 3001 8888