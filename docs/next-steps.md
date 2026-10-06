# Next steps

What's left before the project is complete, in order. Status as of 2026-10-05.

## 1. Live setup (blocks everything else)

- [ ] Add the Anthropic key: `echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local`
- [ ] Install Ollama and pull the local model: `brew install ollama && ollama pull qwen3:8b && ollama serve`
- [ ] Smoke test in the UI (`npm run dev`): ask query 1 on **B1**, then on **A1**. Query 1 is "I have a party of four level 5 characters. Is a single adult black dragon a fair fight?" B1 should show tool cards and answer Deadly, 11,500 adjusted XP.

These paths have never run, so expect small fixes:

- Tool cards and the Apply / Put on board buttons in the chat.
- Grading a successful response end to end (the Haiku extraction in `eval/grade.ts`).
- Ollama tool calling through the OpenAI-compatible endpoint (configs A2/B2).

## 2. Evaluation

- [ ] Quick check: `npm run eval -- --configs B1,A1 --runs 1` (about 5 minutes). Spot-check `extraction_json` against a few responses.
- [ ] Full run: `npm run eval` (4 configs × 29 queries × 3 runs).
- [ ] Run `eval/analysis.ipynb` once to generate `manual_review.csv` in the run folder.
- [ ] Hand-grade the rows in `manual_review.csv`, filling in `success` and `manual_notes`. Then re-run the notebook to write the figures to `docs/figures/`.
- [ ] Commit the run folder under `eval/results/` and the figures.
- [ ] Fill in the README **Results** section, replacing "not yet run", with the headline numbers and the main failure modes.

## 3. Peer testing

- [ ] Run sessions with at least 2 classmates using `docs/peer-testing.md`.
- [ ] Fill in the session log and summary there, then copy the summary into the README **Peer testing** section.
- [ ] Make any fixes that come out of it, then re-run the eval if behavior changed.

## 4. Presentation artifacts

- [ ] Slides covering: use case, system design, data and tools, the 2x2 comparison, eval results, safety findings, limitations. Planned hook: "Ask an LLM if a fight is balanced and it'll confidently get the math wrong." Live demo: the same encounter through A1 vs B1 in compare mode.
- [ ] Demo recording covering: overview, walkthrough, a few representative queries, design choices, and at least one failure case. Add the link to the README.
- [ ] Update the README **Status** table.

## Optional

- [ ] 3D boss models (stretch goal, skipped): 3-5 Blender GLBs in React Three Fiber, lazy-loaded into the battlefield's sigil slot.
- [ ] After the course: copy the repo to your personal GitHub account (see README), then add the 2024 ruleset and a public deploy with bring-your-own-key.
