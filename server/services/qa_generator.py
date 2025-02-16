import sys
import json
from transformers import pipeline
import nltk
from nltk.tokenize import sent_tokenize

def main():
    try:
        # Get input text from command line argument
        text = sys.argv[1]
        
        # Download necessary NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')

        # Initialize QA pipeline
        qa_pipeline = pipeline(
            "question-generation",
            model="microsoft/git-base-qa",
            device=-1  # Use CPU
        )

        # Split text into sentences
        sentences = sent_tokenize(text)
        
        # Generate QA pairs
        qa_pairs = []
        for sentence in sentences:
            if len(sentence.split()) < 5:  # Skip very short sentences
                continue
                
            try:
                # Generate question from the sentence
                result = qa_pipeline({
                    "question_generation": {
                        "text": sentence,
                    }
                })
                
                if result and 'question' in result:
                    qa_pairs.append({
                        'question': result['question'],
                        'answer': sentence,
                        'context': sentence
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
