#!/bin/bash

# Start AI Backend Server
# This script starts the Flask server for the AI Summarizer

echo "Starting AI Chat Summarizer Backend..."
echo "Make sure you have:"
echo "1. Installed dependencies: pip install -r requirements.txt"
echo "2. Created .env file with your GEMINI_API_KEY"
echo ""

python app.py
