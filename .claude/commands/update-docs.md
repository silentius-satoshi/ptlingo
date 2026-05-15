Review everything that was just built in this session and update CLAUDE.md accordingly.

Do this in order:

1. Read the current CLAUDE.md in full
2. Identify what changed — new steps completed, new architectural decisions made,
   new bug patterns discovered and fixed, new dependencies added
3. Update CLAUDE.md:
   a. Add completed step(s) to the "Completed Steps" table with step number and name
   b. Update "Current State" to reflect what now exists in the app
   c. Update "Next available step" if it changed
   d. Add any new architectural decisions to "Key learnings & principles"
   e. Add any new bug patterns and their fixes to "Key learnings & principles"
   f. Update "Tools & resources" if new dependencies were added
4. Do NOT rewrite sections that didn't change — surgical updates only
5. Stage CLAUDE.md: git add CLAUDE.md
6. Report what you changed in CLAUDE.md as a brief summary

Be specific and precise. CLAUDE.md is the living spec that the review-plan.js
script reads — vague entries reduce its usefulness.
