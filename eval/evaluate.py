"""Authored retrieval regression checks; not a user study or independent benchmark."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.services.ai_service import retrieve


def main():
    cases = json.loads((ROOT/'data/eval/test_cases.json').read_text())
    correct = 0
    for case in cases:
        cards = retrieve(case['situation'])
        actual = cards[0]['id'] if cards else None
        passed = actual == case['expected_card']
        correct += passed
        print(f"{'PASS' if passed else 'FAIL'} {case['id']}: {actual} (expected {case['expected_card']})")
    print(f'\nAuthored retrieval checks: {correct}/{len(cases)}. Not a measure of cultural accuracy or learning impact.')
    return 0 if correct == len(cases) else 1

if __name__ == '__main__':
    raise SystemExit(main())
