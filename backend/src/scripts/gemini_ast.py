import os
import zipfile
import json
import google.generativeai as genai
import sys

# Configure Gemini AI API
genai.configure(api_key="AIzaSyA9wrEDD65p0otguFeE8cAYuJ9lmWOpfoE")

# Get the script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
RESULTS_FOLDER = os.path.join(BASE_DIR, "results")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

def extract_code_from_zip(zip_path):
    """Extracts code files from a ZIP archive."""
    print("[INFO] Extracting ZIP file...")
    code_files = []
    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for file in zip_ref.namelist():
                if file.endswith((".py", ".java", ".js", ".cpp")):
                    with zip_ref.open(file) as extracted_file:
                        code_files.append((file, extracted_file.read().decode("utf-8", errors="ignore")))
        print(f"[SUCCESS] Extracted {len(code_files)} code files from ZIP.")
    except zipfile.BadZipFile:
        print("[ERROR] Invalid ZIP file.")
    return code_files

def analyze_code_with_gemini(code):
    """Uses Gemini AI to analyze code functionalities."""
    print("[INFO] Sending code to Gemini AI for analysis...")
    prompt = f"""
    Analyze the following code and extract the functionalities it implements.
    Provide a structured JSON output with:
    - functionality_name
    - description
    - input_parameters
    - output_values
    - related_methods
    
    Code:
    {code}
    """
    try:
        model = genai.GenerativeModel("gemini-pro")
        response = model.generate_content(prompt)
        print("[SUCCESS] Analysis completed.")
        return response.text if response else "[ERROR] No response from Gemini"
    except Exception as e:
        print(f"[ERROR] Gemini API call failed: {e}")
        return "[ERROR] Analysis failed."

def main():
    if len(sys.argv) < 3 or sys.argv[1] != "--file":
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)

    zip_path = sys.argv[2]
    if not os.path.exists(zip_path):
        print(json.dumps({"error": "ZIP file not found"}))
        sys.exit(1)

    code_files = extract_code_from_zip(zip_path)
    extracted_functionalities = []

    for filename, code in code_files:
        print(f"[INFO] Analyzing {filename}...")
        functionality = analyze_code_with_gemini(code)
        extracted_functionalities.append({"file": filename, "functionality": functionality})

    output_file = os.path.join(RESULTS_FOLDER, f"analysis_{os.path.basename(zip_path)}.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(extracted_functionalities, f, indent=4)

    print(json.dumps(extracted_functionalities))  # Send JSON output to Node.js

if __name__ == "__main__":
    main()
