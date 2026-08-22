"""Central application configuration helpers."""
import os


def get_cors_origins() -> list:
    """Get CORS allowed origins from environment variables."""
    environment = os.getenv('ENVIRONMENT', 'development')

    if environment == 'development':
        return [
            os.getenv('DEV_FRONTEND_URL', 'http://localhost:5173'),
            os.getenv('FRONTEND_LOCAL_URL', 'http://localhost:5173'),
            "http://127.0.0.1:5173",
            os.getenv('FRONTEND_ALT_URL', 'http://localhost:3000'),
            "http://127.0.0.1:3000",
            os.getenv('DEV_BACKEND_URL', 'http://localhost:8000'),
            "http://127.0.0.1:8000",
        ]
    return [
        os.getenv('FRONTEND_URL', 'https://deployxsystem.vercel.app'),
        os.getenv('FRONTEND_LOCAL_URL', 'http://localhost:5173'),
        "http://127.0.0.1:5173",
        os.getenv('FRONTEND_ALT_URL', 'http://localhost:3000'),
        "http://127.0.0.1:3000",
        os.getenv('DEV_BACKEND_URL', 'http://localhost:8000'),
        "http://127.0.0.1:8000",
        "https://accounts.google.com",
        "https://accounts.google.com/gsi",
    ]
