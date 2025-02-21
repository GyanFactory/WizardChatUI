import sys
import json
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.tag import pos_tag
from nltk.chunk import ne_chunk
from typing import List, Dict, Tuple

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('averaged_perceptron_tagger')
    nltk.data.find('maxent_ne_chunker')
    nltk.data.find('words')
except LookupError:
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('maxent_ne_chunker')
    nltk.download('words')

def identify_entities(text: str) -> List[Tuple[str, str]]:
    """Identify named entities in the text."""
    tokens = word_tokenize(text)
    pos_tags = pos_tag(tokens)
    named_entities = ne_chunk(pos_tags)
    entities = []

    for chunk in named_entities:
        if hasattr(chunk, 'label'):
            entity_text = ' '.join(c[0] for c in chunk)
            entity_type = chunk.label()
            entities.append((entity_text, entity_type))

    return entities

def generate_definition_question(sentence: str, entity: Tuple[str, str]) -> Dict[str, str]:
    """Generate a definition or explanation question."""
    return {
        'question': f"What is {entity[0]} and why is it important in this context?",
        'answer': sentence,
        'context': sentence
    }

def generate_process_question(sentence: str) -> Dict[str, str]:
    """Generate a process or how-to question."""
    # Look for process indicators
    process_indicators = ['by', 'through', 'using', 'steps', 'process', 'method']
    if any(indicator in sentence.lower() for indicator in process_indicators):
        return {
            'question': f"How does this process work: {sentence.strip()}?",
            'answer': sentence,
            'context': sentence
        }
    return None

def generate_comparison_question(sentences: List[str]) -> Dict[str, str]:
    """Generate a comparison question if multiple related items are found."""
    combined_text = ' '.join(sentences)
    if 'and' in combined_text or ',' in combined_text:
        return {
            'question': f"Compare and contrast the different elements mentioned in this text.",
            'answer': combined_text,
            'context': combined_text
        }
    return None

def generate_analytical_question(paragraph: str) -> Dict[str, str]:
    """Generate an analytical question that requires synthesis of information."""
    return {
        'question': f"Based on the information provided, what are the key implications or conclusions that can be drawn?",
        'answer': paragraph,
        'context': paragraph
    }

def generate_cause_effect_question(sentence: str) -> Dict[str, str]:
    """Generate a cause and effect question."""
    indicators = ['because', 'therefore', 'thus', 'as a result', 'consequently', 'leads to']
    if any(indicator in sentence.lower() for indicator in indicators):
        return {
            'question': f"What is the cause and effect relationship described in: {sentence.strip()}?",
            'answer': sentence,
            'context': sentence
        }
    return None

def main():
    try:
        # Get input text and context from command line arguments
        if len(sys.argv) != 3:
            raise ValueError("Please provide both text and context arguments")

        text = sys.argv[1]
        context = sys.argv[2]

        # Split text into paragraphs and sentences
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        qa_pairs = []

        for paragraph in paragraphs:
            # Skip short paragraphs
            if len(paragraph.split()) < 20:  # Increased minimum length for better context
                continue

            # Split into sentences
            sentences = sent_tokenize(paragraph)

            # Process each sentence for entities and questions
            for i, sentence in enumerate(sentences):
                if len(sentence.split()) < 8:  # Skip very short sentences
                    continue

                # Identify named entities
                entities = identify_entities(sentence)

                # Generate different types of questions
                for entity in entities:
                    qa_pairs.append(generate_definition_question(sentence, entity))

                # Process question
                process_qa = generate_process_question(sentence)
                if process_qa:
                    qa_pairs.append(process_qa)

                # Cause-effect question
                cause_effect_qa = generate_cause_effect_question(sentence)
                if cause_effect_qa:
                    qa_pairs.append(cause_effect_qa)

                # For groups of sentences, try comparison questions
                if i < len(sentences) - 1:
                    comparison_qa = generate_comparison_question(sentences[i:i+2])
                    if comparison_qa:
                        qa_pairs.append(comparison_qa)

            # Add an analytical question for the whole paragraph
            qa_pairs.append(generate_analytical_question(paragraph))

        # Filter out None values and duplicates
        qa_pairs = [qa for qa in qa_pairs if qa is not None]
        unique_qa_pairs = []
        seen_questions = set()

        for qa in qa_pairs:
            question = qa['question'].lower()
            if question not in seen_questions:
                seen_questions.add(question)
                unique_qa_pairs.append(qa)

        # Print JSON output
        print(json.dumps(unique_qa_pairs))
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()