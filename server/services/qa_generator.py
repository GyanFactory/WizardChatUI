import sys
import json
import re
from typing import List, Dict

def extract_sentences(text: str) -> List[str]:
    """Extract sentences using regex patterns."""
    return [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]

def identify_key_entities(text: str) -> List[str]:
    """Identify potential key terms/entities using regex patterns."""
    # Match capitalized phrases, technical terms, and important concepts
    patterns = [
        r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*',  # Capitalized phrases
        r'\b(?:process|method|system|technology|framework)\b',  # Technical terms
        r'\b(?:key|main|primary|essential|important)\s+\w+',  # Important concepts
    ]
    entities = []
    for pattern in patterns:
        matches = re.finditer(pattern, text)
        entities.extend(match.group() for match in matches)
    return list(set(entities))

def generate_questions(text: str, context: str) -> List[Dict[str, str]]:
    """Generate different types of questions from text."""
    qa_pairs = []
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

    # Context-based patterns
    context_keywords = context.lower().split()

    for paragraph in paragraphs:
        if len(paragraph.split()) < 20:  # Skip short paragraphs
            continue

        sentences = extract_sentences(paragraph)
        entities = identify_key_entities(paragraph)

        for entity in entities:
            # Definition questions
            qa_pairs.append({
                'question': f"What is {entity} and how is it relevant?",
                'answer': paragraph,
                'context': paragraph
            })

        for sentence in sentences:
            if len(sentence.split()) < 8:  # Skip very short sentences
                continue

            # Process/How-to questions
            if any(word in sentence.lower() for word in ['how', 'process', 'method', 'step', 'procedure']):
                qa_pairs.append({
                    'question': f"How does the following process work: {sentence}?",
                    'answer': sentence,
                    'context': paragraph
                })

            # Purpose/Why questions
            if any(word in sentence.lower() for word in ['purpose', 'goal', 'aim', 'objective']):
                qa_pairs.append({
                    'question': f"What is the purpose of {sentence.split()[2:6]}...?",
                    'answer': sentence,
                    'context': paragraph
                })

            # Cause-effect relationships
            if any(word in sentence.lower() for word in ['because', 'therefore', 'thus', 'result', 'effect']):
                qa_pairs.append({
                    'question': f"What is the relationship between cause and effect in: {sentence}?",
                    'answer': sentence,
                    'context': paragraph
                })

        # Add analytical questions for the whole paragraph
        qa_pairs.append({
            'question': "Based on this information, what are the key implications or conclusions?",
            'answer': paragraph,
            'context': paragraph
        })

        # Add context-specific questions
        relevant_context = any(keyword in paragraph.lower() for keyword in context_keywords)
        if relevant_context:
            qa_pairs.append({
                'question': f"How does this information relate to {context}?",
                'answer': paragraph,
                'context': paragraph
            })

    # Remove duplicates while preserving order
    seen = set()
    unique_qa_pairs = []
    for qa in qa_pairs:
        q_lower = qa['question'].lower()
        if q_lower not in seen:
            seen.add(q_lower)
            unique_qa_pairs.append(qa)

    return unique_qa_pairs

def main():
    try:
        # Get input text and context from command line arguments
        if len(sys.argv) != 3:
            raise ValueError("Please provide both text and context arguments")

        text = sys.argv[1]
        context = sys.argv[2]

        # Generate QA pairs
        qa_pairs = generate_questions(text, context)

        # Print JSON output
        print(json.dumps(qa_pairs))
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()