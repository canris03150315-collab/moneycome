const admin = require('firebase-admin');
const crypto = require('crypto');

// 初始化 Firebase Admin
const serviceAccount = require('./goodmoney666-jackpot-firebase-adminsdk-vfwxh-3c6e3c3f0e.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'goodmoney666-jackpot'
});

const db = admin.firestore();

async function checkLotteryData() {
  const lotteryId = 'set-1764840328813-ecfdg55';
  
  try {
    const doc = await db.collection('lotterySets').doc(lotteryId).get();
    
    if (!doc.exists) {
      console.log('❌ 商品不存在');
      return;
    }
    
    const data = doc.data();
    
    console.log('=== 商品數據 ===');
    console.log('ID:', lotteryId);
    console.log('Title:', data.title);
    console.log('earlyTerminated:', data.earlyTerminated);
    console.log('poolSeed:', data.poolSeed);
    console.log('_poolSeed:', data._poolSeed ? data._poolSeed.substring(0, 20) + '...' : undefined);
    console.log('poolCommitmentHash:', data.poolCommitmentHash);
    console.log('prizeOrder length:', data.prizeOrder ? data.prizeOrder.length : 0);
    console.log('First 3 prizes:', data.prizeOrder ? data.prizeOrder.slice(0, 3) : []);
    
    // 驗證 Hash
    if (data._poolSeed && data.prizeOrder) {
      const poolData = data.prizeOrder.join(',') + data._poolSeed;
      const calculatedHash = crypto.createHash('sha256').update(poolData).digest('hex');
      
      console.log('\n=== Hash 驗證 ===');
      console.log('Stored Hash:', data.poolCommitmentHash);
      console.log('Calculated Hash:', calculatedHash);
      console.log('Match:', calculatedHash === data.poolCommitmentHash ? '✅ 正確' : '❌ 不匹配');
      
      console.log('\n=== 驗證格式 ===');
      console.log('籤池順序格式: prizeOrder.join(",")');
      console.log('種子碼格式: 直接附加在後面，無分隔符');
      console.log('完整字串長度:', poolData.length);
      console.log('完整字串（前100字）:', poolData.substring(0, 100) + '...');
      
      console.log('\n=== 前端顯示的數據 ===');
      console.log('籤池順序（每行一個）:');
      data.prizeOrder.slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. ${p}`));
      console.log('種子碼:', data._poolSeed);
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    process.exit(0);
  }
}

checkLotteryData();
