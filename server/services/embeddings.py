import sys
import json
import openai
from typing import List

def get_embeddings(text: str, api_key: str = None) -> List[float]:
    """Generate embeddings using OpenAI's ada-002 model"""
    try:
        if not api_key:
            print(json.dumps({"error": "OpenAI API key is required"}), file=sys.stderr)
            sys.exit(1)

        openai.api_key = api_key
        response = openai.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(json.dumps({"error": f"Failed to generate embeddings: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

def chunk_text(text: str, chunk_size: int = 1000) -> List[str]:
    """Split text into chunks for embedding generation"""
    try:
        # Split by sentences to maintain context
        sentences = text.split('. ')
        chunks = []
        current_chunk = []
        current_size = 0

        for sentence in sentences:
            sentence = sentence.strip()
            # Skip empty sentences
            if not sentence:
                continue

            sentence_size = len(sentence)

            if current_size + sentence_size > chunk_size and current_chunk:
                # Join current chunk and add to chunks
                chunks.append('. '.join(current_chunk) + '.')
                current_chunk = [sentence]
                current_size = sentence_size
            else:
                current_chunk.append(sentence)
                current_size += sentence_size

        # Add remaining chunk if exists
        if current_chunk:
            chunks.append('. '.join(current_chunk) + '.')

        return chunks
    except Exception as e:
        print(json.dumps({"error": f"Failed to chunk text: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

def main():
    try:
        # Read input text and API key from stdin
        input_data = json.loads(sys.stdin.read())
        text = input_data.get('text', '').strip()
        api_key = input_data.get('api_key')

        if not text:
            raise ValueError("No input text provided")
        if not api_key:
            raise ValueError("No API key provided")

        # Generate embeddings for each chunk
        chunks = chunk_text(text)
        embeddings = [get_embeddings(chunk, api_key) for chunk in chunks]

        # Output JSON result
        print(json.dumps(embeddings))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()