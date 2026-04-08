import { findConnectingRoutes } from './src/utils/bfsEngine';

const testBFS = async () => {
  console.log('Testing BFS: NDLS to BSB');
  const results = await findConnectingRoutes('NDLS', 'BSB');
  console.log('Results Found:', results.length);
  results.forEach((opt: any, i: number) => {
    console.log(`\nOption ${i + 1}: ${opt.totalDuration} minutes total`);
    opt.legs.forEach((leg: any, j: number) => {
      console.log(`  Leg ${j + 1}: ${leg.fromCode} -> ${leg.toCode} (${leg.trainName})`);
    });
    if (opt.layoverDuration) {
      console.log(`  Layover: ${opt.layoverDuration} minutes`);
    }
  });
};

testBFS();
