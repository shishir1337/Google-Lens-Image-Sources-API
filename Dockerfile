# Use the Puppeteer Docker image with the desired version
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /usr/src/app

# Copy your application files to the container
COPY . .

# Install dependencies
RUN npm install

# Specify the command to run your application
CMD ["node", "index.js"]
