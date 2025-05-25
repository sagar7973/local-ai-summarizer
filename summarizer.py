import sys
import fitz  # PyMuPDF
import os
import re
import textwrap
from openai import OpenAI

client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

# Read PDF or TXT content
def extract_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        doc = fitz.open(file_path)
        return "\n".join([page.get_text() for page in doc])
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        raise ValueError("Unsupported file format")

# Split document into chunks (~1000 words)
def chunk_text(text, max_words=1000):
    words = text.split()
    return [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]

# Clean and filter output
def clean_summary(text):
    lines = text.strip().split("\n")
    unique = list(dict.fromkeys([line.strip() for line in lines if line.strip()]))
    return "\n".join(unique)

# Custom prompt template
def build_prompt(text_chunk):
    return f"""
You are an assistant for veterinary insurance claims. Your task is to summarize the following medical records of a pet for a claim handler. 
Focus on clinically relevant events and remove redundant or non-medical text.

✅ Include:
- Date of visit (if available)
- Diagnoses or symptoms
- Medications prescribed
- Treatments or surgeries performed
- Notes on progress or outcome
- Recurrence or chronic conditions

❌ Do not include:
- Greetings, disclaimers, or general form text
- Duplicate information
- Non-medical details (e.g., owner comments, payment)

Summarize in clear bullet points.

Medical Record:
{text_chunk}
"""

# Generate summary using local model
def summarize(text):
    prompt = build_prompt(text)
    response = client.chat.completions.create(
        model="mistralai/mistral-7b-instruct-v0.3",  # Or try llama-3 if downloaded
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()

# Main function
def main():
    if len(sys.argv) < 2:
        print("Usage: python summarizer.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        full_text = extract_text(file_path)
        chunks = chunk_text(full_text)

        print("Processing chunks...")
        partial_summaries = [summarize(chunk) for chunk in chunks]

        print("Merging and cleaning output...")
        final_summary = clean_summary("\n".join(partial_summaries))
        print(final_summary)

    except Exception as e:
        print("Error during summarization:", str(e))

if __name__ == "__main__":
    main()



