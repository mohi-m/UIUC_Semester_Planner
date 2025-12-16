import requests
import math
import json
import os

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(DATA_DIR, "raw", "uiuc_professor_ratings.json")
API_URL = "https://www.ratemyprofessors.com/graphql"
UIUC_ID = "U2Nob29sLTExMTI="
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "*/*",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36",
    "Origin": "https://www.ratemyprofessors.com",
    "Referer": "https://www.ratemyprofessors.com/",
}


TOTAL_COUNT_QUERY = """
query ProfessorCountQuery($schoolID: ID!) {
  newSearch {
    teachers(query: { schoolID: $schoolID }) {
      resultCount
    }
  }
}
"""


GET_PROFESSORS_QUERY = """
query ProfessorRatingsQuery($schoolID: ID!, $first: Int!, $cursor: String) {
  newSearch {
    teachers(query: { schoolID: $schoolID }, first: $first, after: $cursor) {
      edges {
        cursor
        node {
          id
          firstName
          lastName
          department
          avgDifficulty
          avgRating
          numRatings
          wouldTakeAgainPercent
        }
      }
    }
  }
}
"""


def get_total_professor_count():
    """
    This function will count the total number of professor ratings available for UIUC
    :return:
    """
    payload = {"query": TOTAL_COUNT_QUERY, "variables": {"schoolID": UIUC_ID}}
    res = requests.post(API_URL, json=payload, headers=HEADERS)

    if res.status_code != 200:
        print("ERROR:", res.status_code)
        print(res.text)
        return None

    return res.json()["data"]["newSearch"]["teachers"]["resultCount"]


def get_all_professors(batch_size=50):
    """
    Extracts all professor ratings available for UIUC.
    """
    total = get_total_professor_count()
    if total is None:
        return None
    print(f"Found {total} professors")
    pages = math.ceil(total / batch_size)
    professors = []
    cursor = None
    for i in range(pages):
        print(f"Fetching page {i + 1}/{pages}…")
        variables = {"schoolID": UIUC_ID, "first": batch_size, "cursor": cursor}
        payload = {"query": GET_PROFESSORS_QUERY, "variables": variables}
        res = requests.post(API_URL, json=payload, headers=HEADERS)
        if res.status_code != 200:
            print("ERROR:", res.status_code)
            print(res.text)
            break
        data = res.json()["data"]["newSearch"]["teachers"]["edges"]
        if not data:
            break
        for entry in data:
            professors.append(entry["node"])
        cursor = data[-1]["cursor"]

    return professors


if __name__ == "__main__":
    all_professors = get_all_professors()
    print(f"\nExtracted {len(all_professors)} professors.")
    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_professors, f, indent=4)
    print(f"Saved to {OUTPUT_PATH}")
