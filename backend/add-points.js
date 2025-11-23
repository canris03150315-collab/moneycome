// 快速補點腳本 - 給測試帳號補充點數
const { Firestore } = require('@google-cloud/firestore');

// 使用默認配置（與 server.js 一致）
const firestore = new Firestore();

const USERS_COLL = 'users';

async function addPoints(email, pointsToAdd) {
  try {
    console.log(`\n🔍 查找用戶: ${email}`);
    
    // 查找用戶
    const usersRef = firestore.collection(USERS_COLL);
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      console.error(`❌ 找不到用戶: ${email}`);
      return;
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const currentPoints = Number(userData.points || 0);
    const newPoints = currentPoints + pointsToAdd;
    
    console.log(`📊 當前點數: ${currentPoints} P`);
    console.log(`➕ 增加點數: ${pointsToAdd} P`);
    console.log(`💰 新點數: ${newPoints} P`);
    
    // 更新點數
    await userDoc.ref.update({ points: newPoints });
    
    console.log(`✅ 點數更新成功！`);
    console.log(`\n用戶資訊:`);
    console.log(`  ID: ${userDoc.id}`);
    console.log(`  Email: ${email}`);
    console.log(`  名稱: ${userData.name || 'N/A'}`);
    console.log(`  點數: ${currentPoints} P → ${newPoints} P`);
    
  } catch (error) {
    console.error('❌ 補點失敗:', error.message);
    throw error;
  }
}

// 主程式
async function main() {
  const email = process.argv[2] || '123123@aaa';
  const points = parseInt(process.argv[3]) || 2000;
  
  console.log('╔══════════════════════════════════════╗');
  console.log('║     🎁 測試帳號快速補點工具 🎁      ║');
  console.log('╚══════════════════════════════════════╝');
  
  await addPoints(email, points);
  
  console.log('\n✨ 完成！現在可以進行抽獎測試了！');
  console.log('\n📝 使用方式:');
  console.log('  node add-points.js [email] [points]');
  console.log('  預設: email=123123@aaa, points=2000');
}

main().catch(console.error);
