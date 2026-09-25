import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure API
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key found: {bool(api_key)}")
print(f"API Key (first 10 chars): {api_key[:10] if api_key else 'None'}...")

if api_key:
    genai.configure(api_key=api_key)
    
    print("\nListing available models:")
    print("-" * 50)
    
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"Model: {model.name}")
            print(f"  Display Name: {model.display_name}")
            print(f"  Description: {model.description}")
            print(f"  Supported methods: {model.supported_generation_methods}")
            print()
else:
    print("ERROR: GEMINI_API_KEY not found in environment!")
