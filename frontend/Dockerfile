FROM node:20-slim

WORKDIR /app

# Install build essentials if needed (some npm packages require them)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

# Vite default preview port is 4173, dev is usually 5173 or 3001
EXPOSE 8888 3001 4173

# We use 'dev' because your script includes --host=0.0.0.0
CMD ["yarn", "dev"]