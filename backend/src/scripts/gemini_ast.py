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
async def analyze_code_async(session, functions, filename):
    if not functions:
        logging.warning(f"No functions found in {filename}, skipping analysis.")
        return {"file": filename, "functionality": "[ERROR] No functions found"}

    logging.info(f"Analyzing file: {filename} with {len(functions)} functions")

    prompt = f"""
    Analyze the following functions from the file `{filename}` and extract their functionalities.
    Provide a structured JSON output with:
    - functionality_name
    - description
    - input_parameters
    - output_values
    - related_methods

    Functions:
    {functions}
    """

    models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-pro-exp"]  # Fastest first
    retry_attempts = 2
    delay = 3  # Initial delay

    for model_name in models:
        for attempt in range(retry_attempts):
            try:
                logging.info(f"Using model: {model_name} (Attempt {attempt+1}/{retry_attempts})")
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, prompt)

                if response and response.text:
                    return {"file": filename, "functionality": response.text}

                raise Exception(f"Empty response from {model_name}")
            except Exception as e:
                logging.error(f"{model_name} Error for {filename} (Attempt {attempt+1}/{retry_attempts}): {e}")

                if "Resource has been exhausted" in str(e):
                    delay *= 2  # Exponential backoff
                await asyncio.sleep(delay)

        logging.warning(f"{model_name} failed after {retry_attempts} attempts. Switching to next model...")

    return {"file": filename, "functionality": "[ERROR] All Gemini models failed after retries"}


async def process_files(zip_name, file_paths):
    async with aiohttp.ClientSession() as session:
        results = []
        semaphore = asyncio.Semaphore(5)  # Limit concurrency to 5 requests at a time

        async def analyze_file(file_path):
            async with semaphore:
                ext = os.path.splitext(file_path)[1]
                extracted_functions = []

                try:
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
                except Exception as e:
                    logging.error(f"Skipping file {file_path} due to extraction error: {e}")
                    return

                if not extracted_functions:
                    logging.warning(f"No functions extracted from {file_path}, skipping analysis.")
                    return

                result = await analyze_code_async(session, extracted_functions, os.path.basename(file_path))
                results.append(result)

        tasks = [analyze_file(file_path) for file_path in file_paths]
        await asyncio.gather(*tasks)

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
