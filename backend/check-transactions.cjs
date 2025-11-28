// 檢查交易記錄
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'goodmoney666-jackpot'
});

async function checkTransactions() {
  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🔍 檢查交易記錄                      ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const transactionsSnapshot = await db.collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    console.log(`找到 ${transactionsSnapshot.size} 筆最近的交易記錄\n`);
    
    if (transactionsSnapshot.size === 0) {
      console.log('❌ 沒有任何交易記錄！\n');
      return;
    }
    
    transactionsSnapshot.forEach((doc, index) => {
      const tx = doc.data();
      console.log(`${index + 1}. ${tx.type || '未知類型'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   用戶 ID: ${tx.userId}`);
      console.log(`   金額: ${tx.amount > 0 ? '+' : ''}${tx.amount} P`);
      console.log(`   描述: ${tx.description || '無'}`);
      console.log(`   時間: ${tx.createdAt || tx.date || '無'}`);
      console.log(`   date 欄位: ${tx.date ? '✓' : '✗'}`);
      console.log('');
    });
    
    // 統計
    const stats = {
      RECHARGE: 0,
      DRAW: 0,
      SHIPPING: 0,
      RECYCLE: 0,
      SHOP_ORDER: 0,
      OTHER: 0
    };
    
    const allTransactions = await db.collection('transactions').get();
    allTransactions.forEach(doc => {
      const tx = doc.data();
      if (stats[tx.type] !== undefined) {
        stats[tx.type]++;
      } else {
        stats.OTHER++;
      }
    });
    
    console.log('═══════════════════════════════════════\n');
    console.log('📊 交易統計：');
    console.log(`   儲值 (RECHARGE): ${stats.RECHARGE} 筆`);
    console.log(`   抽獎 (DRAW): ${stats.DRAW} 筆`);
    console.log(`   運費 (SHIPPING): ${stats.SHIPPING} 筆`);
    console.log(`   回收 (RECYCLE): ${stats.RECYCLE} 筆`);
    console.log(`   商城訂單 (SHOP_ORDER): ${stats.SHOP_ORDER} 筆`);
    console.log(`   其他: ${stats.OTHER} 筆`);
    console.log(`   總計: ${allTransactions.size} 筆\n`);
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    process.exit(0);
  }
}

checkTransactions();
