import json
import time
import os
from openai import OpenAI

# ============================================================
#  PATHS
# ============================================================

# Point to the repo's data directory
DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

# ============================================================
#  OPENAI API CONFIGURATION
# ============================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

# ============================================================
#  OPENAI API CALL
# ============================================================


def call_openai(prompt, model="gpt-4o-mini", retries=3, backoff=2.0):
    """
    Calls OpenAI API with robust error handling.
    gpt-4o-mini is cheap and fast (~$0.15 per 1M input tokens)
    """
    last_err = None

    for attempt in range(1, retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert academic analyst. Always return valid JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},  # Force JSON output
            )

            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content.strip()
            else:
                last_err = f"Empty response (attempt {attempt})"
                if attempt < retries:
                    time.sleep(backoff * attempt)
                    continue
                raise RuntimeError(f"Empty response after {retries} attempts")

        except Exception as e:
            error_str = str(e).lower()
            last_err = f"Error: {str(e)[:500]} (attempt {attempt})"

            # Handle rate limits
            if "rate" in error_str or "limit" in error_str or "429" in error_str:
                wait_time = 5 * attempt
                print(f"\n⏸️  Rate limit, waiting {wait_time}s...", end=" ", flush=True)
                time.sleep(wait_time)
                if attempt < retries:
                    continue

            if attempt < retries:
                time.sleep(backoff * attempt)
                continue
            raise RuntimeError(f"OpenAI call failed: {last_err}")

    raise RuntimeError(f"OpenAI call failed after {retries} attempts: {last_err}")


def extract_json(response):
    """Safely extract and parse JSON"""
    response = response.strip()

    # Remove markdown if present
    if response.startswith("```json"):
        response = response[7:]
    if response.startswith("```"):
        response = response[3:]
    if response.endswith("```"):
        response = response[:-3]
    response = response.strip()

    try:
        return json.loads(response)
    except json.JSONDecodeError as e:
        error_path = os.path.join(PROCESSED_DIR, "openai_error_response.txt")
        with open(error_path, "w", encoding="utf-8") as f:
            f.write(response)
        raise RuntimeError(
            f"Failed to parse JSON: {e}\n"
            f"Response saved to '{error_path}'\n"
            f"Preview: {response[:500]}..."
        )


# ============================================================
#  1. TAG COURSES with SKILLS
# ============================================================


def infer_skills(courses):
    """Infer skills from course descriptions"""
    prompt = f"""Analyze these courses and infer skills students learn.

Return a JSON object with a "courses" array:

{{
  "courses": [
    {{"course_id": "CS 446", "skills": ["machine learning", "probability", "python"]}},
    {{"course_id": "CS 101", "skills": ["programming", "algorithms"]}}
  ]
}}

Rules:
- 3-8 skills per course
- Keep skill names SHORT (1-3 words)
- Return ONLY the JSON object

Courses:
{json.dumps(courses, indent=2)}"""

    response = call_openai(prompt)
    data = extract_json(response)
    return data.get("courses", [])


# ============================================================
#  2. GENERATE CAREER PATHWAYS
# ============================================================


def generate_career_pathways(tagged_courses):
    """Generate career pathways from tagged courses"""

    # Use first 200 courses to avoid token limits
    sample = tagged_courses[:200]

    prompt = f"""Generate 8-12 distinct career pathways based on these courses.

Return a JSON object with a "pathways" array:

{{
  "pathways": [
    {{
      "name": "Machine Learning Engineer",
      "description": "Builds ML models for production systems",
      "required_skills": ["deep learning", "statistics", "python"],
      "core_courses": ["CS 446", "STAT 410", "CS 411", "MATH 415", "CS 225", "CS 374", "CS 412", "ECE 220"],
      "recommended_courses": ["CS 440", "STAT 425", "CS 461", "MATH 441", "CS 498"],
      "optional_courses": ["CS 598", "ECE 534", "STAT 510"]
    }}
  ]
}}

Rules:
- Generate 8-12 diverse pathways (software eng, data science, AI/ML, systems, security, web dev, etc.)
- Each pathway needs 8-15 core courses that are ESSENTIAL
- Include 5-10 recommended courses
- Include 3-5 optional advanced courses
- Keep descriptions SHORT (one sentence)
- Return ONLY the JSON object

Courses:
{json.dumps(sample, indent=2)}"""

    response = call_openai(prompt)
    data = extract_json(response)
    return data.get("pathways", [])


# ============================================================
#  3. LOAD COURSES
# ============================================================

print("📂 Loading courses...")

COURSES_PATH = os.path.join(PROCESSED_DIR, "uiuc_courses_final.json")
with open(COURSES_PATH, "r", encoding="utf-8") as f:
    all_courses = json.load(f)

# Normalize to list
if isinstance(all_courses, dict):
    flattened = []
    if all(
        isinstance(v, dict) and all(isinstance(c, dict) for c in v.values())
        for v in all_courses.values()
    ):
        for dept_courses in all_courses.values():
            for course in dept_courses.values():
                flattened.append(course)
    elif all(isinstance(v, dict) and v.get("course_id") for v in all_courses.values()):
        flattened = list(all_courses.values())
    else:
        flattened = [all_courses]
    all_courses = flattened


# ============================================================
#  4. BATCH PROCESS
# ============================================================

BATCH_SIZE = 20
chunks = [
    all_courses[i : i + BATCH_SIZE] for i in range(0, len(all_courses), BATCH_SIZE)
]

TAGGED_PATH = os.path.join(PROCESSED_DIR, "tagged_courses.json")
CAREER_PATHS_PATH = os.path.join(PROCESSED_DIR, "career_pathways.json")

tagged_courses = []

# Try to load existing progress
if os.path.exists(TAGGED_PATH):
    try:
        with open(TAGGED_PATH, "r", encoding="utf-8") as f:
            tagged_courses = json.load(f)
        print(f"📂 Loaded {len(tagged_courses)} previously tagged courses")
        start_batch = len(tagged_courses) // BATCH_SIZE
    except:
        start_batch = 0
else:
    start_batch = 0

print(f"\nProcessing {len(all_courses)} courses ({len(chunks)} batches)")
print(f"   Starting from batch {start_batch + 1}")
print(f"   Using OpenAI gpt-4o-mini (estimated cost: $0.70)\n")

successful_batches = 0
failed_batches = 0
start_time = time.time()

for idx, chunk in enumerate(chunks, start=1):
    if idx <= start_batch:
        continue

    try:
        print(
            f"  Batch {idx}/{len(chunks)} ({len(chunk)} courses)...",
            end=" ",
            flush=True,
        )
        result = infer_skills(chunk)
        tagged_courses.extend(result)
        successful_batches += 1
        print(f" ({len(result)} tagged)")

        # Save progress
        with open(TAGGED_PATH, "w", encoding="utf-8") as f:
            json.dump(tagged_courses, f, indent=2)

        # Show progress every 10 batches
        if idx % 10 == 0:
            elapsed = time.time() - start_time
            avg_time = elapsed / (idx - start_batch)
            remaining = (len(chunks) - idx) * avg_time
            print(f" Progress: {idx}/{len(chunks)} | ETA: {remaining/60:.1f} min")

        time.sleep(0.5)  # Light rate limiting

    except Exception as e:
        failed_batches += 1
        print(f"✗ Error: {str(e)[:200]}")
        print(f"    Skipping batch {idx}...")
        time.sleep(2)
        continue

total_time = time.time() - start_time
print(f"\n✅ Tagged {len(tagged_courses)} courses in {total_time/60:.1f} minutes")
print(f"   Success: {successful_batches} batches | Failed: {failed_batches} batches\n")

# Save final results
with open(TAGGED_PATH, "w", encoding="utf-8") as f:
    json.dump(tagged_courses, f, indent=2)

print(" Generating career pathways...\n")

try:
    career_paths = generate_career_pathways(tagged_courses)
    print(f" Generated {len(career_paths)} pathways\n")

    with open(CAREER_PATHS_PATH, "w", encoding="utf-8") as f:
        json.dump(career_paths, f, indent=2)

    print("Career Pathways Created:")
    for i, path in enumerate(career_paths, 1):
        print(f"  {i}. {path['name']}")
        print(f"     - {len(path.get('core_courses', []))} core courses")
        print(f"     - {len(path.get('recommended_courses', []))} recommended")
        print(f"     - {len(path.get('optional_courses', []))} optional\n")

    print(f"💾 Saved to '{CAREER_PATHS_PATH}'\n")

except Exception as e:
    print(f" Error generating pathways: {str(e)[:500]}")
    raise

print(" Done! Check the processed folder for results.")
