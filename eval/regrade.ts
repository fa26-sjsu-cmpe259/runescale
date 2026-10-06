// Re-grades an existing run without calling the agents again: npm run eval:grade -- eval/results/<run_id>

import { gradeRunDir } from './grade';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: npm run eval:grade -- eval/results/<run_id>');
  process.exit(1);
}

gradeRunDir(dir)
  .then((out) => console.log(`Graded results: ${out}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
