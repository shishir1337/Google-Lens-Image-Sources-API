# Use the official Node.js image from the Docker Hub
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app will run on
EXPOSE 3000

# Command to run your app
CMD [ "npm", "start" ]
