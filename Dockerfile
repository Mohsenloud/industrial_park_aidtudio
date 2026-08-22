# Use the official Node.js 22 Alpine image for a lightweight footprint
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variable to indicate production build
ENV NODE_ENV=production

# Build the application using your existing build script
RUN npm run build

# Expose the standard port the app runs on
EXPOSE 3000

# Start the application using your compiled server entrypoint
CMD ["npm", "run", "start"]
