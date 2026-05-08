# AI Chat Summarizer Backend

A Flask-based backend service that provides chat summarization and AI-powered discussions using Google's Gemini API.

## Features

- **Chat Summarization**: Automatically summarize chat conversations
- **AI Chat**: Ask questions about the chat context
- **CORS Enabled**: Ready for frontend integration

## Setup Instructions

### 1. Prerequisites
- Python 3.8 or higher
- Pip (Python package manager)

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click on "Create API Key"
3. Copy your API key

### 4. Configure Environment Variables

Create a `.env` file in the `chat-app-ai` directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 5. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5175`

## API Endpoints

### 1. Summarize Chat
**POST** `/api/summarize-chat`

Request body:
```json
{
  "chatText": "Full chat conversation as text"
}
```

Response:
```json
{
  "success": true,
  "summary": "Brief summary of the chat"
}
```

### 2. Chat with AI
**POST** `/api/chat-with-ai`

Request body:
```json
{
  "message": "User's question",
  "chatContext": "Full chat conversation"
}
```

Response:
```json
{
  "success": true,
  "response": "AI's response"
}
```

### 3. Health Check
**GET** `/health`

Response:
```json
{
  "status": "healthy"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## Troubleshooting

### CORS Errors
Make sure the frontend is running on `http://localhost:5174` and the backend on `http://localhost:5175`. The CORS is configured to allow both.

### API Key Errors
- Verify your API key is correct in `.env`
- Make sure the `.env` file is in the `chat-app-ai` directory
- Restart the server after updating `.env`

### Connection Issues
- Ensure Flask server is running on port 5175
- Check if the port is already in use: `netstat -ano | findstr :5175` (Windows)

## Integration with Frontend

The AI Summarizer component is already integrated in `ChatPage.jsx`. When users click the AI button and select "Copy" or "Skip", a floating widget will appear in the bottom right corner of the chat page.

## Development

To run in debug mode with auto-reload:

```bash
# Debug mode is already enabled in app.py
python app.py
```

## Security Notes

- Never commit your `.env` file with actual API keys
- Use environment variables for production
- Validate and sanitize user inputs
- Rate limit API requests in production
