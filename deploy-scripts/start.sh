#!/bin/bash

# Run database migrations if needed
echo "Running database migrations..."
npm run db:push

# Start the application
echo "Starting the application..."
npm run start