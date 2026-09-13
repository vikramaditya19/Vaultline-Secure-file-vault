"""Vaultline FastAPI application."""

from contextlib import asynccontextmanager
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import init_db, test_connection
from app.routers import auth, files, sharing


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    print(f"Vaultline API ready; database={'connected' if test_connection() else 'unavailable'}")
    yield
    print("Vaultline API stopped")


app = FastAPI(
    title=settings.APP_NAME,
    description="Zero-knowledge encrypted file storage and sharing API.",
    version=settings.API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Encrypted-Metadata", "X-Wrapped-Key", "X-File-Id", "Content-Disposition"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - started:.4f}"
    return response


app.include_router(auth.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(sharing.router, prefix="/api")


@app.get("/")
def root():
    return {"name": settings.APP_NAME, "version": settings.API_VERSION, "status": "operational", "docs": "/docs"}


@app.get("/health")
def health_check():
    connected = test_connection()
    return {"status": "healthy" if connected else "unhealthy", "database": "connected" if connected else "disconnected", "api": "operational"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Validation error", "errors": exc.errors()})


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_request: Request, exc: SQLAlchemyError):
    print(f"Database error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Database error occurred", "type": "database_error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=settings.DEBUG)
