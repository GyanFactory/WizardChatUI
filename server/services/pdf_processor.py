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

def combine_related_chunks(chunks: List[str], similarity_threshold: float = 0.7) -> List[str]:
    """Combine related text chunks for better context."""
    from difflib import SequenceMatcher
    
    combined_chunks = []
    current_chunk = chunks[0] if chunks else ""
    
    for i in range(1, len(chunks)):
        similarity = SequenceMatcher(None, current_chunk, chunks[i]).ratio()
        if similarity >= similarity_threshold:
            current_chunk += " " + chunks[i]
        else:
            if current_chunk:
                combined_chunks.append(current_chunk)
            current_chunk = chunks[i]
    
    if current_chunk:
        combined_chunks.append(current_chunk)
    
    return combined_chunks

def summarize_context(text: str, max_length: int = 150) -> str:
    """Generate a concise summary of the text."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    summary = []
    current_length = 0
    
    for sentence in sentences:
        if current_length + len(sentence) <= max_length:
            summary.append(sentence)
            current_length += len(sentence)
        else:
            break
    
    return ' '.join(summary)

def generate_qa_pairs(chunks: List[str]) -> List[Dict[str, str]]:
    """Generate Q&A pairs with context-aware responses."""
    qa_pairs = []
    
    # Common document section headers
    section_patterns = [
        r'^(?:CHAPTER|Section)\s+\d+[.:]\s*(.+)',
        r'^\d+[.:]\d*\s+(.+)',
        r'^(?:Overview|Introduction|Background|Summary):\s*(.+)',
        r'^(?:Note|Warning|Caution|Important):\s*(.+)',
        r'^(?:Procedure|Steps|Instructions):\s*(.+)'
    ]
    
    # Combine related chunks for better context
    combined_chunks = combine_related_chunks(chunks)

    for chunk in chunks:
        if len(chunk) < 30:  # Skip very short chunks
            continue
            
        # Clean the text
        chunk = re.sub(r'\s+', ' ', chunk).strip()
        
        # Handle numbered lists and procedures
        if re.match(r'^\d+\.\s', chunk):
            question = "What are the steps for " + re.sub(r'^\d+\.\s', '', chunk.split('.')[1]) + "?"
            qa_pairs.append({"question": question, "answer": chunk})
            continue
            
        # Handle sections and headers
        for pattern in section_patterns:
            if match := re.match(pattern, chunk, re.IGNORECASE):
                section_title = match.group(1)
                question = f"What is {section_title}?"
                qa_pairs.append({"question": question, "answer": chunk})
                break
                
        # Handle regular sentences
        sentences = re.split(r'(?<=[.!?])\s+', chunk)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 40:  # Skip short sentences
                continue
                
            # Generate contextual questions
            lower_sentence = sentence.lower()
            
            # Handle instructional content
            if re.search(r'(?:press|click|select|choose|tap)\s+this\s+(?:button|option|menu)', lower_sentence, re.IGNORECASE):
                question = "What is the purpose of this " + re.search(r'(?:button|option|menu)', sentence, re.IGNORECASE).group(0) + "?"
            elif re.search(r'(?:how to|steps to|method for|procedure for)', lower_sentence):
                question = "How do you " + re.sub(r'^.*?(?:how to|steps to|method for|procedure for)\s+', '', lower_sentence) + "?"
            elif re.search(r'(?:means|refers to|is defined as|consists of)', lower_sentence):
                match = re.match(r'^([^,.]+)', sentence)
                term = match.group(1) if match else sentence.split()[0]
                question = "What is " + term.strip() + "?"
            elif re.search(r'(?:must|should|need to|required to)', lower_sentence):
                # Remove any leading context
                clean_sentence = re.sub(r'^.*?(?=must|should|need to|required to)', '', lower_sentence)
                question = "What is required for " + clean_sentence + "?"
            else:
                # For general statements, create a more natural question
                clean_sentence = re.sub(r'^(?:this |the |a |an |in order to |to )', '', lower_sentence)
                question = "What is the purpose of " + clean_sentence + "?"
                
            # Create context-aware answer by combining relevant information
            context = ""
            for chunk in combined_chunks:
                if sentence.lower() in chunk.lower():
                    context = summarize_context(chunk)
                    break
            
            # Generate a more natural answer
            if context:
                answer = f"{sentence} {context}"
            else:
                answer = sentence
                
            qa_pairs.append({
                "question": question,
                "answer": answer,
                "context": context
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