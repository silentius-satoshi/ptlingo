# importQuestions.js

Parses structured markdown files and bulk-upserts questions into Supabase.

## Usage

```bash
node scripts/importQuestions.js path/to/questions.md
```

Run from the **project root** directory.

## Requirements

- Node.js 18+
- `questions` table must exist — run `supabase/schema.sql` followed by `supabase/step16_schema.sql` in the Supabase SQL Editor
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` set in `.env` at project root (see below)
  - Use the **service role key**, not the anon key

## Environment

Create `.env.local` in the project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

## Markdown format

```markdown
# Series 3 Form A – Section 1 Questions 1–10

---

## Scenario (applies to Q3–Q5)
Patient is a 45-year-old woman who presents to outpatient PT…

---

**Q1.** A physical therapist is evaluating a patient with right shoulder
pain. Which intervention is most appropriate at this stage?

A. Apply ice packs only
B. Initiate passive ROM exercises
C. Begin resistive strengthening
D. Refer to orthopedic surgery

**Correct Answer:**
- **B.** Passive ROM is indicated in the acute phase to maintain joint
mobility without additional stress to healing tissue.

**Incorrect Answers:**
- **A.** Ice alone does not address the mobility deficit.
- **C.** Strengthening is contraindicated in the acute phase.
- **D.** Referral is not warranted without conservative trial.

---
```

### Rules

- **File header** (required, first line): `# {Series} – Section {n} …`
- **Scenario blocks** prepend `[SCENARIO]\n{text}\n\n` to each question in the stated range
- **Choices** must be exactly A, B, C, D — one per line, `Letter. Text` format
- **Correct Answer** block: exactly one `- **Letter.** rationale` entry (multi-line supported)
- **Incorrect Answers** block: one entry per incorrect choice (multi-line supported)
- Questions with parse errors are skipped with a warning; valid questions still import
- Re-running the same file is safe — questions are upserted on `(exam_series, section, question_number)`
