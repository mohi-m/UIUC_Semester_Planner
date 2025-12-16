from UIUC_Course_Scraper import *

YEARS = range(2024, 2026)
SEMESTERS = ["spring", "summer", "fall"]
DEPARTMENTS = ["RHET", "CMN", "HIST", "PHIL"]
BASE_URL = "https://courses.illinois.edu/cisapp/explorer/schedule"
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    departments = {dept: {} for dept in DEPARTMENTS}
    for dept in DEPARTMENTS:
        for year in YEARS:
            for semester in SEMESTERS:
                get_course_details(dept, year, semester, departments)
    departments = convert_set_to_list(departments)

    OUTPUT_PATH = os.path.join(DATA_DIR, "raw", "uiuc_gened_courses.json")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(departments, f, indent=4)

    total_gened = sum(len(departments[d]) for d in departments)
    print("\nTOTAL GENED COURSES EXTRACTED:", total_gened)
    print(f"\nSaved GenEd course data {OUTPUT_PATH}")
