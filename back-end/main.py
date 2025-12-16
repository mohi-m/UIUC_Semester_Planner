import os
from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

# Import configuration and database
from app.core.config import settings
from app.core.database import MongoDBClient
from app.core.logging import get_logger
from app.core.exceptions import InternalServerError

# Import routes
from app.api.endpoints.courses import router as courses_router
from app.api.endpoints.pathways import router as pathways_router
from app.api.endpoints.tagged_courses import router as tagged_courses_router

logger = get_logger(__name__)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    logger.info("Application starting up...")
    # Initialize DB per worker and log basic diagnostics
    try:
        MongoDBClient.get_instance()
        try:
            courses_col = MongoDBClient.get_collection("courses")
            career_paths_col = MongoDBClient.get_collection("career_paths")
            logger.info(
                "DB diagnostics - counts: courses=%s, career_paths=%s",
                courses_col.estimated_document_count(),
                career_paths_col.estimated_document_count(),
            )
        except Exception as inner_e:
            logger.warning("DB diagnostics failed: %s", str(inner_e))
    except Exception as e:
        logger.error("DB initialization failed on startup: %s", str(e))
    yield
    logger.info("Application shutting down...")
    MongoDBClient.close()


# Create FastAPI app
app = FastAPI(
    title="Semester Planner API",
    description="API for managing courses, pathways, and semester planning",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}


# Include routers
app.include_router(courses_router, prefix="/api/v1")
app.include_router(pathways_router, prefix="/api/v1")
app.include_router(tagged_courses_router, prefix="/api/v1")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Semester Planner API", "version": "1.0.0", "docs": "/docs"}


# Global exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
            },
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("SERVER_HOST", settings.SERVER_HOST),
        port=int(os.getenv("SERVER_PORT", settings.SERVER_PORT)),
        reload=settings.DEBUG,
    )
