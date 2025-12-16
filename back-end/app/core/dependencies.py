import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer
from app.core.config import settings
from app.core.logging import get_logger
import os

logger = get_logger(__name__)
security = HTTPBearer()


def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(
            settings.FIREBASE_CREDENTIALS_PATH
        ):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized with credentials file")
        else:
            # If no credentials file, initialize with default credentials
            try:
                firebase_admin.initialize_app()
                logger.info("Firebase initialized with default credentials")
            except ValueError:
                # Already initialized or error
                logger.debug("Firebase already initialized")
                pass


def verify_firebase_token(credentials=Depends(security)) -> dict:
    """
    Verify Firebase ID token and extract user information

    Args:
        credentials: HTTP bearer token credentials

    Returns:
        Decoded token data with user information

    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials

    try:
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(decoded_token: dict = Depends(verify_firebase_token)) -> dict:
    """
    Get current authenticated user from decoded token

    Args:
        decoded_token: Decoded Firebase ID token

    Returns:
        User information dict containing uid, email, etc.
    """
    return {
        "uid": decoded_token.get("uid"),
        "email": decoded_token.get("email"),
        "name": decoded_token.get("name"),
        "email_verified": decoded_token.get("email_verified", False),
    }


# Initialize Firebase on module import
init_firebase()
