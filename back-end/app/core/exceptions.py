from fastapi import HTTPException, status
from typing import Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class APIException(HTTPException):
    """Base exception for API errors"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "INTERNAL_ERROR",
        headers: Optional[dict] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class NotFoundError(APIException):
    """Resource not found error"""

    def __init__(self, resource: str, identifier: Optional[str] = None):
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} with ID '{identifier}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND",
        )


class BadRequestError(APIException):
    """Invalid request error"""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BAD_REQUEST",
        )


class InternalServerError(APIException):
    """Internal server error"""

    def __init__(self, detail: str = "An unexpected error occurred"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INTERNAL_SERVER_ERROR",
        )


class UnauthorizedError(APIException):
    """Unauthorized access error"""

    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"},
        )


def log_exception(exc: Exception, context: str = "") -> None:
    """Log exception with context"""
    error_msg = (
        f"Exception in {context}: {str(exc)}" if context else f"Exception: {str(exc)}"
    )
    logger.error(error_msg, exc_info=exc)
