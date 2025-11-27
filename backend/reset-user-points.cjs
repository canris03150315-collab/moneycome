// 重置所有用戶點數為 0
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'goodmoney666-jackpot'
});

async function resetUserPoints() {
  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🔄 重置所有用戶點數                  ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const usersSnapshot = await db.collection('users').get();
    console.log(`找到 ${usersSnapshot.size} 個用戶\n`);
    
    const batch = db.batch();
    let count = 0;
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      console.log(`用戶: ${user.username || user.email}`);
      console.log(`  當前點數: ${user.points || 0} P`);
      console.log(`  重置為: 0 P\n`);
      
      batch.update(doc.ref, { 
        points: 0,
        lastActiveAt: new Date().toISOString()
      });
      count++;
    });
    
    await batch.commit();
    
    console.log('╔════════════════════════════════════════╗');
    console.log(`║   ✅ 已重置 ${count} 個用戶的點數為 0      ║`);
    console.log('╚════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

resetUserPoints();
