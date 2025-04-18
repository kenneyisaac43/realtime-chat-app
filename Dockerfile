# Build the Frontend
FROM node:16-alpine as frontend-build
WORKDIR /app/frontend

# Copy the package files of your frontend and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy all frontend source code and build it
COPY frontend .
RUN npm run build

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

# Optionally, remove the existing public folder content if needed
RUN rm -rf public/*

# Copy the built frontend from the previous stage into the public folder
COPY --from=frontend-build /app/frontend/build/ public/

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run your app
CMD ["node", "server.js"]

