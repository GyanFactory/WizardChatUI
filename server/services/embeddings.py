
from sentence_transformers import SentenceTransformer
import numpy as np

def get_embeddings(text: str) -> list[float]:
    """Generate embeddings using the all-MiniLM-L6-v2 model"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(text)
    return embeddings.tolist()

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    """Split text into chunks for embedding generation"""
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
