import json
import os
import certifi
from pymongo import MongoClient, UpdateOne
from typing import Optional

# Load environment from repo root if python-dotenv is available
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None  # optional dependency

# Resolve paths
DB_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.dirname(DB_SCRIPTS_DIR)
REPO_ROOT = os.path.dirname(DATA_DIR)

# Load .env from repository root if available
if load_dotenv:
    env_path = os.path.join(REPO_ROOT, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)

JSON_PATH = os.path.join(DATA_DIR, "processed", "uiuc_courses_flatten.json")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    courses = json.load(f)

print(f"Loaded {len(courses)} courses.")

# Read Mongo configuration from environment
MONGO_URI: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME: str = os.getenv("MONGODB_DB_NAME", "semester_planner")
TIMEOUT_MS: int = int(os.getenv("MONGODB_TIMEOUT_MS", "10000"))

uri_lower = MONGO_URI.lower()
use_tls = (
    uri_lower.startswith("mongodb+srv://")
    or ("tls=true" in uri_lower)
    or ("ssl=true" in uri_lower)
)

if use_tls:
    client = MongoClient(
        MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=TIMEOUT_MS
    )
else:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=TIMEOUT_MS)

db = client[DB_NAME]
collection = db["courses"]

print(f"Connected to MongoDB. DB='{DB_NAME}', collection='courses'.")

operations = []

for course_id, course_data in courses.items():
    course_data["_id"] = course_id
    operations.append(UpdateOne({"_id": course_id}, {"$set": course_data}, upsert=True))

if operations:
    result = collection.bulk_write(operations)
    print("Inserted:", result.upserted_count)
    print("Updated:", result.modified_count)

print("Import complete.")
