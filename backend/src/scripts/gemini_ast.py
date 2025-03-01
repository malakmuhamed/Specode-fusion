import os
import zipfile
import json
import asyncio
import aiohttp
import logging
import concurrent.futures
import google.generativeai as genai
import ast
import javalang
import subprocess
import re
import time

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Configure Google Generative AI with API Key
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logging.error("API key not found. Set the GEMINI_API_KEY environment variable.")
    exit(1)

genai.configure(api_key=API_KEY)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_CODES_FOLDER = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "source_codes"))
RESULTS_FOLDER = os.path.join(BASE_DIR, "results")
TEMP_FOLDER = os.path.join(BASE_DIR, "temp_extracted")

os.makedirs(RESULTS_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".py", ".java", ".js", ".php", ".cpp"}

def extract_zip(zip_path):
    logging.info(f"Extracting ZIP: {zip_path}")
    extracted_files = []
    zip_name = os.path.basename(zip_path).replace(".zip", "")
    extract_folder = os.path.join(TEMP_FOLDER, zip_name)
    os.makedirs(extract_folder, exist_ok=True)
    
    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_folder)
            for root, _, files in os.walk(extract_folder):
                for file in files:
                    if any(file.endswith(ext) for ext in ALLOWED_EXTENSIONS):
                        extracted_files.append(os.path.join(root, file))
    except zipfile.BadZipFile:
        logging.error(f"Invalid ZIP file: {zip_path}")
    
    return zip_name, extracted_files

# Language-Specific Parsers
def extract_python_functions(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()
        tree = ast.parse(code)
        return [ast.unparse(node) for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
    except Exception as e:
        logging.error(f"Error parsing Python file {file_path}: {e}")
        return []

def extract_java_functions(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()
        tree = javalang.parse.parse(code)
        return [node.name for node in tree.types[0].methods]
    except Exception as e:
        logging.error(f"Error parsing Java file {file_path}: {e}")
        return []

def extract_js_functions(file_path):
    try:
        result = subprocess.run(["node", "extract_js.js", file_path], capture_output=True, text=True)
        return json.loads(result.stdout) if result.stdout else []
    except Exception as e:
        logging.error(f"JS Parsing Error: {e}")
        return []

def extract_php_functions(file_path):
    try:
        result = subprocess.run(["php", "extract_php.php", file_path], capture_output=True, text=True)
        return json.loads(result.stdout) if result.stdout else []
    except Exception as e:
        logging.error(f"PHP Parsing Error: {e}")
        return []

def extract_cpp_functions(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()
        pattern = r"[\w<>]+\s+\w+\s*\([^)]*\)\s*\{[^}]*\}"
        return re.findall(pattern, code, re.DOTALL)
    except Exception as e:
        logging.error(f"Error parsing C++ file {file_path}: {e}")
        return []

async def analyze_code_async(session, code, filename):
    logging.info(f"Analyzing file: {filename}")
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
    retry_attempts = 3
    for attempt in range(retry_attempts):
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = await asyncio.to_thread(model.generate_content, prompt)
            await asyncio.sleep(2)  # Rate limiting to prevent 429 errors
            return {"file": filename, "functionality": response.text if response else "[ERROR] No response"}
        except Exception as e:
            logging.error(f"Gemini API Error for {filename} (Attempt {attempt+1}/{retry_attempts}): {e}")
            await asyncio.sleep(5)  # Delay before retry
    return {"file": filename, "functionality": "[ERROR] API request failed after retries"}

async def process_files(zip_name, file_paths):
    async with aiohttp.ClientSession() as session:
        results = []
        for file_path in file_paths:
            ext = os.path.splitext(file_path)[1]
            extracted_functions = []
            
            if ext == ".py":
                extracted_functions = extract_python_functions(file_path)
            elif ext == ".java":
                extracted_functions = extract_java_functions(file_path)
            elif ext == ".js":
                extracted_functions = extract_js_functions(file_path)
            elif ext == ".php":
                extracted_functions = extract_php_functions(file_path)
            elif ext == ".cpp":
                extracted_functions = extract_cpp_functions(file_path)
            
            tasks = [analyze_code_async(session, func, os.path.basename(file_path)) for func in extracted_functions]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            results.extend(batch_results)
        
        output_file = os.path.join(RESULTS_FOLDER, f"{zip_name}.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=4)
        
        logging.info(f"✅ Saved results to {output_file}")

async def main():
    zip_files = [os.path.join(SOURCE_CODES_FOLDER, f) for f in os.listdir(SOURCE_CODES_FOLDER) if f.endswith(".zip")]
    tasks = [process_files(*extract_zip(zip_file)) for zip_file in zip_files]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
