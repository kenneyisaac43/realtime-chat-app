# Use an official Node.js runtime as a parent image
FROM node:16-alpine

# Install required build tools for native modules
RUN apk add --no-cache python3 make g++

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run your app
CMD ["node", "server.js"]
