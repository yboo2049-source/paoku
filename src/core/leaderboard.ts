import { loadSaveData } from './storage';

export async function submitScore(score: number): Promise<void> {
  console.log('Submitting score to mock backend:', score);
  return new Promise(resolve => setTimeout(resolve, 500));
}

export async function fetchLeaderboard(): Promise<Array<{name:string, score:number}>> {
  return new Promise(resolve => {
    setTimeout(() => {
      const saveData = loadSaveData();
      const list = [
        { name: 'Alice', score: 10000 },
        { name: 'Bob', score: 8500 },
        { name: 'Charlie', score: 7200 },
        { name: 'Dave', score: 6000 },
        { name: 'Eve', score: 5000 },
        { name: 'You', score: Math.floor(saveData.highScore) }
      ];
      list.sort((a, b) => b.score - a.score);
      resolve(list.slice(0, 6));
    }, 500);
  });
}
