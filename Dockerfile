# Use the Puppeteer Docker image with the desired version
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json separately
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Specify the command to run your application
CMD ["node", "index.js"]
