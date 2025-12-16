from typing import Any, Dict, List
from bson import ObjectId


def to_jsonable(obj: Any) -> Any:
    """Recursively convert Mongo/BSON types to JSON-serializable values.

    - Converts ObjectId -> str
    - Processes dicts and lists recursively
    """
    if isinstance(obj, ObjectId):
        return str(obj)

    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [to_jsonable(i) for i in obj]

    return obj
