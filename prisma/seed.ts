import { runSeed } from '../src/seed';

runSeed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  });
