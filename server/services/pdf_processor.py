import sys
from PyPDF2 import PdfReader
import json
import re
from typing import List, Dict

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF in chunks."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def split_text_into_chunks(text: str, chunk_size: int = 1000) -> List[str]:
    """Split text into smaller chunks."""
    # Split by sentences to maintain context
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += sentence + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def generate_qa_pairs(chunks: List[str]) -> List[Dict[str, str]]:
    """Generate Q&A pairs from text chunks."""
    qa_pairs = []

    for chunk in chunks:
        # Skip short or empty chunks
        if len(chunk) < 50:
            continue

        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', chunk)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 50:  # Only process substantial sentences
                # Create questions using different patterns
                if sentence.startswith("The ") or sentence.startswith("A ") or sentence.startswith("An "):
                    question = "What is " + sentence[4:].lower() + "?"
                elif sentence.startswith("In ") or sentence.startswith("On ") or sentence.startswith("At "):
                    question = "What happened " + sentence[:sentence.find(" ")+1].lower() + sentence[sentence.find(" ")+1:] + "?"
                else:
                    question = "Can you explain " + sentence.lower() + "?"

                qa_pairs.append({
                    "question": question,
                    "answer": sentence
                })

    return qa_pairs

def main(pdf_path: str):
    try:
        # Extract text
        text = extract_text_from_pdf(pdf_path)

        # Split into chunks
        chunks = split_text_into_chunks(text)

        # Generate Q&A pairs
        qa_pairs = generate_qa_pairs(chunks)

        # Output as JSON
        print(json.dumps(qa_pairs))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Please provide PDF file path"}), file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])