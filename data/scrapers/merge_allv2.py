import json
import csv
from collections import defaultdict
import os
import re


DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

COURSE_FILE = os.path.join(RAW_DIR, "uiuc_courses.json")
GENED_FILE = os.path.join(RAW_DIR, "uiuc_gened_courses.json")
RMP_FILE = os.path.join(RAW_DIR, "uiuc_professor_ratings.json")
GPA_FILE = os.path.join(RAW_DIR, "gpa_cleaned.csv")
OUTPUT_FILE = os.path.join(PROCESSED_DIR, "uiuc_courses_flatten.json")

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
    with open(path, "r") as f:
        return json.load(f)


def merge_course_jsons(main_courses, gened_courses):
    merged = {dept: courses.copy() for dept, courses in main_courses.items()}

    for dept, courses in gened_courses.items():
        if dept not in merged:
            merged[dept] = {}
        for cid, info in courses.items():
            if cid not in merged[dept]:
                merged[dept][cid] = info

    return merged


# ---------------------------
# CREDIT HOURS
# ---------------------------


def clean_credit_hours(text):
    if not text:
        return None

    t = text.lower().replace("hours", "").replace("hour", "").replace(".", "").strip()
    nums = [int(x) for x in re.findall(r"\d+", t)]

    if len(nums) == 1:
        return nums[0]
    if len(nums) > 1:
        return sorted(nums)
    return None


# ---------------------------
# PREREQUISITES
# ---------------------------


def extract_course_codes(text):
    raw = re.findall(r"\b([A-Za-z]{2,5}\s*\d{2,3})\b", text)

    cleaned = []
    for c in raw:
        c = c.upper().replace(" ", "")
        cleaned.append(c[:-3] + " " + c[-3:])
    return cleaned


def clean_prereq(text):
    if not text or not text.strip():
        return None

    txt = text.strip()

    if txt.lower().startswith("one of"):
        codes = extract_course_codes(txt)
        return {"type": "OR", "courses": codes}

    if " or " in txt.lower():
        codes = extract_course_codes(txt)
        return {"type": "OR", "courses": codes}

    if " and " in txt.lower():
        codes = extract_course_codes(txt)
        return {"type": "AND", "courses": codes}

    codes = extract_course_codes(txt)
    if len(codes) == 1:
        return {"type": "SINGLE", "course": codes[0]}

    return {"type": "RAW", "text": text}


# ---------------------------
# RMP LOOKUP
# ---------------------------


def build_rmp_lookup(ratings):
    lookup = defaultdict(list)
    for prof in ratings:
        last = prof["lastName"].lower().strip()
        first_init = prof["firstName"][0].lower().strip()
        dept = prof["department"]
        lookup[(last, first_init, dept)].append(prof)
    return lookup


# ---------------------------
# GPA LOOKUP
# ---------------------------


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


# ---------------------------
# MERGE INTO FINAL FORMAT
# ---------------------------


def merge_data(courses, rmp_lookup, gpa_lookup):
    enriched = {}
    total_matches = 0

    for dept, dept_courses in courses.items():
        long_name = DEPT_MAP.get(dept, dept)

        for course_id, info in dept_courses.items():

            prereq_clean = clean_prereq(info.get("prerequisites"))
            instructors_list = info["instructors"]

            instructor_block = {}
            rating_values = []
            difficulty_values = []
            gpa_values = []

            for inst in instructors_list:
                last, first = inst.split(",")
                last = last.strip().lower()
                first_init = first.strip()[0].lower()

                inst_rating = None
                inst_difficulty = None
                inst_avg_gpa = None

                # --- RMP ---
                rmp_data = rmp_lookup.get((last, first_init, long_name))
                if rmp_data:
                    inst_rating = rmp_data[0].get("avgRating")
                    inst_difficulty = rmp_data[0].get("avgDifficulty")

                    if inst_rating is not None:
                        rating_values.append(inst_rating)
                    if inst_difficulty is not None:
                        difficulty_values.append(inst_difficulty)

                # --- GPA ---
                gpa_vals = gpa_lookup.get((course_id, last, first_init))
                if gpa_vals:
                    inst_avg_gpa = sum(gpa_vals) / len(gpa_vals)
                    gpa_values.append(inst_avg_gpa)

                instructor_block[inst] = {
                    "rating": inst_rating,
                    "difficulty": inst_difficulty,
                    "avg_gpa": (
                        round(inst_avg_gpa, 2) if inst_avg_gpa is not None else None
                    ),
                }

            # --- COURSE LEVEL ---
            course_avg_rating = (
                round(sum(rating_values) / len(rating_values), 2)
                if rating_values
                else None
            )
            course_avg_difficulty = (
                round(sum(difficulty_values) / len(difficulty_values), 2)
                if difficulty_values
                else None
            )
            course_avg_gpa = (
                round(sum(gpa_values) / len(gpa_values), 2) if gpa_values else None
            )

            enriched[course_id] = {
                "course_id": course_id,
                "department": dept,
                "title": info["title"],
                "description": info["description"],
                "credit_hours": clean_credit_hours(info["credit_hours"]),
                "prerequisites": prereq_clean,
                "instructors": instructor_block,  # <-- FULL INSTRUCTOR DATA
                "course_avg_rating": course_avg_rating,
                "course_avg_difficulty": course_avg_difficulty,
                "course_avg_gpa": course_avg_gpa,
                "semesters": info["semesters"],
                "gen_ed": info["gen_ed"],
            }

    return enriched, total_matches


# ---------------------------
# MAIN
# ---------------------------

if __name__ == "__main__":

    main_courses = load_json(COURSE_FILE)
    gened_courses = load_json(GENED_FILE)
    rmp_ratings = load_json(RMP_FILE)

    merged_courses = merge_course_jsons(main_courses, gened_courses)

    rmp_lookup = build_rmp_lookup(rmp_ratings)
    gpa_lookup = build_gpa_lookup(GPA_FILE)

    enriched, matches = merge_data(merged_courses, rmp_lookup, gpa_lookup)

    print(f"Total matched instructor records (RMP or GPA): {matches}")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(enriched, f, indent=4)

    print(f"Saved final dataset → {OUTPUT_FILE}")
