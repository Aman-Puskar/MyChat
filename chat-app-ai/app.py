from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_LLM_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_LLM_KEY not found in environment variables. Please set GEMINI_LLM_KEY in your system environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize the model - using gemini-2.0-flash-exp (latest model)
# If this doesn't work, try: gemini-1.5-pro-latest, gemini-1.5-flash-latest
try:
    model = genai.GenerativeModel('gemini-3.1-flash-lite')
except:
    model = genai.GenerativeModel('gemini-1.5-pro-latest')

@app.route('/api/summarize-chat', methods=['POST'])
def summarize_chat():
    """Summarize the chat messages"""
    try:
        data = request.json
        chat_text = data.get('chatText', '')
        
        if not chat_text:
            return jsonify({'error': 'No chat text provided'}), 400
        
        # Create a prompt for summarization
        prompt = f"""Please provide a brief and concise summary of the following chat conversation. 
Keep the summary short (2-3 sentences) and highlight the main points.

Chat Conversation:
{chat_text}

Summary:"""
        
        response = model.generate_content(prompt)
        summary = response.text
        
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
    
    except Exception as e:
        print(f"Error in summarize_chat: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat-with-ai', methods=['POST'])
def chat_with_ai():
    """Chat with AI about the conversation"""
    try:
        data = request.json
        user_message = data.get('message', '')
        chat_context = data.get('chatContext', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Create a prompt with context
        prompt = f"""You are a helpful AI assistant discussing a chat conversation. 
Keep your responses concise and friendly.
Always use bullet points if you are listing items, and keep your tone conversational.

Chat Context:
{chat_context}

User Question: {user_message}

Response:"""
        
        response = model.generate_content(prompt)
        ai_response = response.text
        
        return jsonify({
            'success': True,
            'response': ai_response
        }), 200
    
    except Exception as e:
        print(f"Error in chat_with_ai: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5175)
