FROM node:24-alpine AS build

WORKDIR /app

# Copy package.json to run , then copy current project root -> workspace
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# npm ci install use package.lock.json or dependency lock file as main reference 

# Expose port 3000 to the host machine (Map 3000:3000 or 800:3000 , any config)
EXPOSE 3000

# Entry point command node main.js
CMD ["node", "src/main.js"]