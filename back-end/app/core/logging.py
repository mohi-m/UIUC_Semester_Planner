import logging
from typing import Optional

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL = logging.INFO


def configure_logging(level: int = LOG_LEVEL, format_string: str = LOG_FORMAT):
    """Configure global logging"""
    logging.basicConfig(level=level, format=format_string)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a module"""
    return logging.getLogger(name)


# Initialize logging on module import
configure_logging()
