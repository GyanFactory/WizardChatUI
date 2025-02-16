import sys
import json
import re

def main():
    try:
        # Get input text from command line argument
        text = sys.argv[1]

        # Split text into paragraphs and sentences
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        qa_pairs = []

        for paragraph in paragraphs:
            # Skip short paragraphs
            if len(paragraph.split()) < 10:
                continue

            # Split into sentences (simple approach)
            sentences = [s.strip() for s in re.split(r'[.!?]+', paragraph) if s.strip()]

            for sentence in sentences:
                if len(sentence.split()) < 5:  # Skip very short sentences
                    continue

                try:
                    # Create simple questions based on sentence structure
                    words = sentence.split()

                    # Try to identify key information
                    if any(word.lower() in ['is', 'are', 'was', 'were', 'will', 'has', 'have'] for word in words):
                        # Create a yes/no question
                        question = ' '.join(words) + '?'
                    else:
                        # Create a "what" question
                        question = 'What is meant by: ' + sentence

                    qa_pairs.append({
                        'question': question.strip(),
                        'answer': sentence.strip(),
                        'context': paragraph
                    })
                except Exception as e:
                    print(f"Error processing sentence: {str(e)}", file=sys.stderr)
                    continue

        # Print JSON output
        print(json.dumps(qa_pairs))
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()