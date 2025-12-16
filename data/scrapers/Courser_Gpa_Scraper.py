import json
import pandas as pd
import os

# Point to the repo's data directory
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_DIR = os.path.join(DATA_DIR, "raw")
COURSE_FILE = os.path.join(RAW_DATA_DIR, "uiuc_courses.json")
GENED_FILE = os.path.join(RAW_DATA_DIR, "uiuc_gened_courses.json")
OUTPUT_FILE = os.path.join(RAW_DATA_DIR, "gpa_cleaned.csv")

GPA_FILES = {
    "fall_2024": os.path.join(RAW_DATA_DIR, "fa2024.csv"),
    "spring_2025": os.path.join(RAW_DATA_DIR, "sp2025.csv"),
    "summer_2024": os.path.join(RAW_DATA_DIR, "su2024.csv"),
}


def load_json(path):
    """Load JSON safely."""
    with open(path, "r") as f:
        return json.load(f)


def normalize_columns(df):
    """Normalize column names for consistency."""
    df.columns = [col.lower().strip().replace(" ", "_") for col in df.columns]
    return df


def build_course_set(all_courses, gened_courses):
    """Combine course IDs from both JSONs."""
    valid_ids = set()
    for dept in all_courses:
        for cid in all_courses[dept]:
            valid_ids.add(cid.upper().strip())
    for dept in gened_courses:
        for cid in gened_courses[dept]:
            valid_ids.add(cid.upper().strip())
    print(f"Total unique course IDs (combined): {len(valid_ids)}")
    return valid_ids


def filter_gpa(df, valid_ids):
    """Filter GPA rows based on valid course IDs."""
    df = normalize_columns(df)
    df["course_subject"] = df["course_subject"].astype(str).str.upper().str.strip()
    df["course_number"] = df["course_number"].astype(str).str.strip()
    df["course_id"] = df["course_subject"] + " " + df["course_number"]
    required_cols = [
        "course_subject",
        "course_number",
        "course_title",
        "primary_instructor",
        "average_grade",
        "course_id",
    ]
    df_filtered = df[df["course_id"].isin(valid_ids)][required_cols]
    return df_filtered


def merge_duplicate_instructors(df):
    """Merge rows that have the same course and instructor."""
    grouped = df.groupby(
        ["course_id", "course_title", "primary_instructor"], as_index=False
    ).agg({"average_grade": "mean"})
    grouped["average_grade"] = grouped["average_grade"].round(2)
    return grouped


if __name__ == "__main__":

    all_courses = load_json(COURSE_FILE)
    gened_courses = load_json(GENED_FILE)
    valid_course_ids = build_course_set(all_courses, gened_courses)
    combined_list = []
    for term, file_path in GPA_FILES.items():
        df = pd.read_csv(file_path)
        df_filtered = filter_gpa(df, valid_course_ids)
        df_filtered["term"] = term
        combined_list.append(df_filtered)

    combined_df = pd.concat(combined_list, ignore_index=True)
    print(f"\nRows BEFORE merging duplicates: {len(combined_df)}")
    print(f"Unique course IDs found: {combined_df['course_id'].nunique()}")

    merged_df = merge_duplicate_instructors(combined_df)
    print(f"\nRows AFTER merging duplicates: {len(merged_df)}")
    print(f"Unique course IDs after merge: {merged_df['course_id'].nunique()}")

    merged_df.to_csv(OUTPUT_FILE, index=False)
    print(f"\nSaved cleaned GPA data → {OUTPUT_FILE}")
