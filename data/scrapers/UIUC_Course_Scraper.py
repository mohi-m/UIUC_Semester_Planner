import requests
import xml.etree.ElementTree as ET
import re
import time
from random import uniform
import json
import os


YEARS = range(2024, 2026)
SEMESTERS = ["spring", "summer", "fall"]
DEPARTMENTS = ["CS", "IS", "STAT", "ECE", "MATH", "BADM"]
BASE_URL = "https://courses.illinois.edu/cisapp/explorer/schedule"
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def safe_text(element):
    """
    This function is to avoid errors while extracting text from xml element
    """
    return element.text.strip() if element is not None and element.text else None


def extract_prerequisites(description):
    """
    Extracts prerequisites from description of the course using regex.
    """
    if not description:
        return None
    match = re.search(r"Prerequisite[s]?: (.*?)(\.|$)", description)
    return match.group(1).strip() if match else None


def fix_url(url):
    """Sometimes UIUC API can return broken urls. This function fixes the broken urls."""
    if "cis.local" in url:
        url = url.replace(
            "http://cis.local/cisapi/", "https://courses.illinois.edu/cisapp/explorer/"
        )
        if not url.endswith(".xml"):
            url += ".xml"
    return url


def get_response(url, retries=3):
    """This function fetches the response from url if any errors it will fix the url and retries upto 3 times(due to API rate limit)"""
    url = fix_url(url)
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return ET.fromstring(response.text)
            else:
                print(f"Status {response.status_code}: {url}")
        except Exception as e:
            print(f"Error fetching {url}: {e}")
        time.sleep(1.5 * attempt)
    print(f"Failed after retries for {url}")
    return None


def get_course_details(dept, year, semester, departments: dict):
    """
    Extracts the course details for all the courses in given department, semester and year and stores in department dictionary.
    course details: course ID, title, credit hours, prerequisites, general education flag, instructors, semesters the course is available
    """
    print(f"\n{dept} • {semester} {year}")
    subject_url = f"{BASE_URL}/{year}/{semester}/{dept}.xml"
    root = get_response(subject_url)
    if root is None:
        print(f"No data for {dept} {semester} {year}")
        return
    courses_found = root.findall(".//course")
    print(f"Found {len(courses_found)} courses.")
    for course in courses_found:
        course_num = course.attrib["id"]
        full_id = f"{dept} {course_num}"
        detail_url = course.attrib["href"]
        print(f"Course: {full_id}")
        detail_root = get_response(detail_url)
        if detail_root is None:
            continue
        title = safe_text(detail_root.find("label"))
        description = safe_text(detail_root.find("description"))
        credit_hours = safe_text(detail_root.find("creditHours"))
        prereq = extract_prerequisites(description)
        gened = detail_root.find(".//genEdCategories") is not None
        instructors = set()
        for section in detail_root.findall(".//section"):
            sec_url = section.attrib["href"]
            sec_root = get_response(sec_url)
            if sec_root is None:
                continue
            for instr in sec_root.findall(".//instructor"):
                if instr.text:
                    instructors.add(instr.text.strip())
            time.sleep(uniform(0.15, 0.35))
        if full_id not in departments[dept]:
            departments[dept][full_id] = {
                "course_id": full_id,
                "title": title,
                "description": description,
                "credit_hours": credit_hours,
                "prerequisites": prereq,
                "instructors": set(),
                "semesters": set(),
                "gen_ed": gened,
            }
        departments[dept][full_id]["instructors"].update(instructors)
        departments[dept][full_id]["semesters"].add(f"{semester}")
    print(f"Pausing after {dept} to avoid API throttling")
    time.sleep(3)


def convert_set_to_list(departments):
    """
    This function converts instructors, semesters in departments to a list
    """
    for dept in departments:
        for cid in departments[dept]:
            departments[dept][cid]["instructors"] = list(
                departments[dept][cid]["instructors"]
            )
            departments[dept][cid]["semesters"] = list(
                departments[dept][cid]["semesters"]
            )
    return departments


if __name__ == "__main__":
    departments = {dept: {} for dept in DEPARTMENTS}
    for dept in DEPARTMENTS:
        for year in YEARS:
            for semester in SEMESTERS:
                get_course_details(dept, year, semester, departments)

    departments = convert_set_to_list(departments)

    OUTPUT_PATH = os.path.join(DATA_DIR, "raw", "uiuc_courses.json")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(departments, f, indent=4, ensure_ascii=False)
    print(f"\nSaved course data to file {OUTPUT_PATH}")
    print(sum(len(departments[dept]) for dept in departments))
