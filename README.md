# MedGuideApp2
Created with CodeSandbox

## AC USMLE practice

Open the **AC USMLE · 206 ข้อ** tab, or append `#ac-usmle` to the app URL.
The React view includes 103 pairs (main question + answer-changing twist),
system/search filters, random navigation, explicit answer grading, explanations,
and clinical source links. Progress is stored in this browser's localStorage;
the practice view does not write to Firebase or call an AI service.

The questions are synthetic practice derived from incomplete pediatrics AC exam
recalls, not restored historical questions or answer keys. This collection covers
105 deduplicated source IDs from a pending set of 197 AC cards; 2 unidentifiable
source fragments remain held and are shown separately. It is not the full AC bank.

Content lives in `src/data/acPractice.json` and is loaded only when the practice
view opens. Keep source IDs, main/twist answers, explanations and clinical
references together when updating a pair. The original standalone MCQ page and
Firebase quiz collection remain separate.

Validation: `npm test -- --watchAll=false --runInBand` and `npm run build`.
