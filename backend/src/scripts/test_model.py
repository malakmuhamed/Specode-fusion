import os
import argparse
import pickle
import pandas as pd
from tensorflow.keras.models import load_model
from pdf_processing import extract_text_from_pdf
from requirement_extraction import extract_requirements_from_pdf  # ⬅️ Process only the uploaded file

# ==============================
# 1️⃣ SET FILE PATHS
# ==============================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
EXTRACTED_DIR = os.path.join(BASE_DIR, "extracted")
OUTPUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "output"))

MODEL_PATH = os.path.join(OUTPUT_DIR, "requirement_extraction_model.keras")
TOKENIZER_PATH = os.path.join(OUTPUT_DIR, "tokenizer.pkl")

# ==============================
# 2️⃣ CHECK IF MODEL & TOKENIZER EXIST
# ==============================
if not os.path.exists(MODEL_PATH):
    print(f"❌ ERROR: Model file NOT found at {MODEL_PATH}!")
    exit(1)

if not os.path.exists(TOKENIZER_PATH):
    print(f"❌ ERROR: Tokenizer file NOT found at {TOKENIZER_PATH}!")
    exit(1)

# ==============================
# 3️⃣ LOAD MODEL & TOKENIZER
# ==============================
print(f"✅ Loading model from {MODEL_PATH}...")
try:
    model = load_model(MODEL_PATH)
except Exception as e:
    print(f"❌ ERROR: Failed to load model: {e}")
    exit(1)

print(f"✅ Loading tokenizer from {TOKENIZER_PATH}...")
try:
    with open(TOKENIZER_PATH, "rb") as f:
        tokenizer = pickle.load(f)
except Exception as e:
    print(f"❌ ERROR: Failed to load tokenizer: {e}")
    exit(1)

# ==============================
# 4️⃣ ARGUMENT PARSER (FOR CLI)
# ==============================
parser = argparse.ArgumentParser(description="Process an SRS PDF and extract requirements.")
parser.add_argument("--file", required=True, help="Path to the SRS PDF file.")
parser.add_argument("--output", required=True, help="Path to save extracted CSV.")  

args = parser.parse_args()

# ==============================
# 5️⃣ VALIDATE PDF FILE PATH
# ==============================
pdf_path = os.path.abspath(args.file)
if not os.path.exists(pdf_path):
    print(f"❌ ERROR: PDF file NOT found at {pdf_path}!")
    exit(1)

# ==============================
# 6️⃣ EXTRACT TEXT FROM PDF
# ==============================
print(f"📂 Processing: {pdf_path}")
text = extract_text_from_pdf(pdf_path)

if not text.strip():
    print(f"⚠️ WARNING: No text extracted from {pdf_path}")
    exit(1)

# ==============================
# 7️⃣ EXTRACT REQUIREMENTS
# ==============================
print("🔍 Extracting requirements...")
try:
    extracted_data = extract_requirements_from_pdf(pdf_path)  # ⬅️ Process only the uploaded file
except Exception as e:
    print(f"❌ ERROR: Extraction function failed: {e}")
    exit(1)

if not extracted_data:
    print("⚠️ No requirements found in the document!")
    exit(1)

# ==============================
# 8️⃣ SAVE RESULTS TO CSV
# ==============================
output_csv_path = os.path.abspath(args.output)

# ✅ Ensure the output folder exists
output_folder = os.path.dirname(output_csv_path)
if not os.path.exists(output_folder):
    os.makedirs(output_folder, exist_ok=True)

df = pd.DataFrame(extracted_data)
df.to_csv(output_csv_path, index=False, encoding="utf-8")

print(f"✅ Extracted {len(df)} requirements. Saved to: {output_csv_path}")
