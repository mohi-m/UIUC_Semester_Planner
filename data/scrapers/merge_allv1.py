import json
import csv
from collections import defaultdict
import os


DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
COURSE_FILE = os.path.join(RAW_DIR, "uiuc_courses.json")
GENED_FILE = os.path.join(RAW_DIR, "uiuc_gened_courses.json")
RMP_FILE = os.path.join(RAW_DIR, "uiuc_professor_ratings.json")
GPA_FILE = os.path.join(RAW_DIR, "gpa_cleaned.csv")
OUTPUT_FILE = os.path.join(PROCESSED_DIR, "uiuc_courses_final.json")

DEPT_MAP = {
    "CS": "Computer Science",
    "IS": "Information Science",
    "STAT": "Statistics",
    "ECE": "Electrical Engineering",
    "MATH": "Mathematics",
    "BADM": "Business",
    "RHET": "Rhetoric",
    "CMN": "Communication",
    "HIST": "History",
    "PHIL": "Philosophy",
}


def load_json(path):
    """Load a JSON file safely."""
    with open(path, "r") as f:
        return json.load(f)


def merge_course_jsons(main_courses, gened_courses):
    """
    Merge uiuc_courses.json and uiuc_gened_courses.json.
    """
    merged = {dept: courses.copy() for dept, courses in main_courses.items()}
    for dept, courses in gened_courses.items():
        if dept not in merged:
            merged[dept] = {}
        for cid, info in courses.items():
            if cid not in merged[dept]:
                merged[dept][cid] = info

    return merged


def extract_pairs(parts):
    extracted = []
    for p in parts:
        tokens = p.strip().split()
        if len(tokens) >= 2:
            dept = tokens[-2].upper()
            num = tokens[-1]
            if dept.isalpha() and num.replace(",", "").isdigit():
                extracted.append(f"{dept} {num}")
    return extracted


def clean_prereq(text):
    """
    Converts prerequisite text into structured format.
    """
    if not text or not text.strip():
        return None
    txt = text.replace(".", "").strip().lower()
    if " or " in txt:
        return {"type": "OR", "courses": extract_pairs(txt.split("or"))}
    if " and " in txt:
        return {"type": "AND", "courses": extract_pairs(txt.split("and"))}

    return {"type": "RAW", "text": text}


def build_rmp_lookup(ratings):
    lookup = defaultdict(list)
    for prof in ratings:
        last = prof["lastName"].lower().strip()
        first_init = prof["firstName"][0].lower().strip()
        dept = prof["department"]
        lookup[(last, first_init, dept)].append(prof)
    return lookup


def build_gpa_lookup(gpa_file):
    lookup = defaultdict(list)
    with open(gpa_file, "r") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 4:
                continue

            course_id, _, instructor, gpa = row
            if not gpa.strip() or gpa.lower() in ["na", "null", "--"]:
                continue

            try:
                gpa_val = float(gpa)
            except:
                continue

            if "," not in instructor:
                continue

            last, first = instructor.split(",")
            last = last.strip().lower()
            first_init = first.strip()[0].lower()

            lookup[(course_id.strip(), last, first_init)].append(gpa_val)

    return lookup


def merge_data(courses, rmp_lookup, gpa_lookup):
    enriched = {}
    total_matches = 0

    for dept, dept_courses in courses.items():
        enriched.setdefault(dept, {})
        long_name = DEPT_MAP.get(dept, dept)

        for course_id, info in dept_courses.items():

            prereq_clean = clean_prereq(info.get("prerequisites"))
            instructor_block = {}

            for inst in info["instructors"]:
                last, first = inst.split(",")
                last = last.strip().lower()
                first_init = first.strip()[0].lower()

                # RMP
                rmp_data = rmp_lookup.get((last, first_init, long_name))
                if rmp_data:
                    rmp = rmp_data[0]
                    rating = rmp["avgRating"]
                    difficulty = rmp["avgDifficulty"]
                else:
                    rating = None
                    difficulty = None

                # GPA
                gpa_vals = gpa_lookup.get((course_id, last, first_init))
                avg_gpa = round(sum(gpa_vals) / len(gpa_vals), 2) if gpa_vals else None

                if rating or avg_gpa:
                    total_matches += 1

                instructor_block[inst] = {
                    "rating": rating,
                    "difficulty": difficulty,
                    "avg_gpa": avg_gpa,
                }

            enriched[dept][course_id] = {
                "course_id": course_id,
                "title": info["title"],
                "description": info["description"],
                "credit_hours": info["credit_hours"],
                "prerequisites": prereq_clean,
                "instructors": instructor_block,
                "semesters": info["semesters"],
                "gen_ed": info["gen_ed"],
            }

    return enriched, total_matches


if __name__ == "__main__":

    main_courses = load_json(COURSE_FILE)
    gened_courses = load_json(GENED_FILE)
    rmp_ratings = load_json(RMP_FILE)
    merged_courses = merge_course_jsons(main_courses, gened_courses)
    rmp_lookup = build_rmp_lookup(rmp_ratings)
    gpa_lookup = build_gpa_lookup(GPA_FILE)
    enriched, matches = merge_data(merged_courses, rmp_lookup, gpa_lookup)
    print(f"Total instructors matched with RMP or GPA: {matches}")
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(enriched, f, indent=4)
    print(f"Saved {OUTPUT_FILE}")
