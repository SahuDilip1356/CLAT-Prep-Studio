import json
import os

def main():
    qbank_file = 'src/data/gk_question_bank.json'
    if not os.path.exists(qbank_file):
        print(f"Error: {qbank_file} not found.")
        return

    with open(qbank_file, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    print(f"Loaded {len(questions)} questions from question bank.")

    # Sort questions by category, then by topic to group similar concepts together
    questions.sort(key=lambda q: (
        q.get("category", ""),
        q.get("topic", ""),
        q.get("id", 0)
    ))

    num_days = 125
    total_qs = len(questions)
    qs_per_day = total_qs // num_days
    extra_days = total_qs % num_days

    print(f"Distributing {total_qs} questions across {num_days} days:")
    print(f"  • {extra_days} days will have {qs_per_day + 1} questions.")
    print(f"  • {num_days - extra_days} days will have {qs_per_day} questions.")

    current_idx = 0
    for day in range(1, num_days + 1):
        # Determine the size of the block for this day
        size = qs_per_day + (1 if day <= extra_days else 0)
        
        for q_idx_in_day in range(size):
            if current_idx < total_qs:
                q = questions[current_idx]
                q["day"] = day
                q["dayStr"] = f"Day {day}"
                q["dailyQNo"] = f"Q{q_idx_in_day + 1}"
                current_idx += 1

    # Save redistributed questions back to the file
    with open(qbank_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2)

    print(f"Successfully redistributed all {total_qs} questions across exactly {num_days} days!")

if __name__ == '__main__':
    main()
