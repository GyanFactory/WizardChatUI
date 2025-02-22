import sys
import json
from sentence_transformers import SentenceTransformer
import numpy as np

def get_embeddings(text: str) -> list[float]:
    """Generate embeddings using the all-MiniLM-L6-v2 model"""
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        embeddings = model.encode(text)
        return embeddings.tolist()
    except Exception as e:
        print(json.dumps({"error": f"Failed to generate embeddings: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    """Split text into chunks for embedding generation"""
    try:
        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0

        for word in words:
            current_chunk.append(word)
            current_size += len(word) + 1  # +1 for space

            if current_size >= chunk_size:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_size = 0

        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks
    except Exception as e:
        print(json.dumps({"error": f"Failed to chunk text: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

def main():
    try:
        # Read input text from stdin
        text = sys.stdin.read().strip()
        if not text:
            raise ValueError("No input text provided")

        # Generate embeddings
        chunks = chunk_text(text)
        embeddings = [get_embeddings(chunk) for chunk in chunks]

        # Output JSON result
        print(json.dumps(embeddings))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()