#!/bin/bash

# Install dependencies
npm install

# Copy .env file
cp $CONDUCTOR_ROOT_PATH/.env.local .env.local

# Run the app
npm run dev