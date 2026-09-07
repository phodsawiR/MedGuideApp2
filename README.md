# MedGuideApp2
Created with CodeSandbox

## AC USMLE practice

Open the **เด็ก · AC USMLE (206 ข้อ)** tab, or append `#ac-usmle` to the app URL.
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

Pediatrics uses its own data file and `medguide.ped.ac-practice.v1` progress key.
The medicine MCQ bank remains at `public/quiz/` with its original data unchanged.

Pediatrics choices are shuffled per question and saved under
`medguide.ped.ac-orders.v1`. Answer progress still stores original choice IDs, so
existing scores remain valid. Retrying a pair reshuffles both questions and moves
the correct choice to a different displayed letter. Audited prose-reference spans
in `src/data/acChoiceReferences.json` relabel only option letters; medical names
and English articles are preserved. If source explanation text changes, review
these offsets and run the alignment tests before publishing.
