from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import pathlib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API router mounted at /api so the frontend can be served at the root
api = APIRouter(prefix="/api")


@api.get("/")
def home():
    return {"status": "OK"}


@api.get("/login")
def get_login_info():
    return {"message": "Login successful!"}

@api.get("/items")
def get_items():
    return {"items": ["item1", "item2", "item3"]}


app.include_router(api)

# Serve the built frontend from frontend/dist at the application root (if present).
# This makes the app a single origin in production/dev when you've run a frontend build.
BASE_DIR = pathlib.Path(__file__).resolve().parents[1]
DIST_DIR = BASE_DIR / "fronted" / "dist"

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
