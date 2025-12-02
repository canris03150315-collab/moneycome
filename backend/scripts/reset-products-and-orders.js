/**
 * 清空所有商品和訂單，回到初始狀態
 * 用於測試新增商品功能
 */

const admin = require('firebase-admin');
const path = require('path');

// 初始化 Firebase Admin
const serviceAccount = require('../goodmoney666-jackpot-firebase-adminsdk-qr2gg-b6a6e5e1e8.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'goodmoney666-jackpot'
});

const db = admin.firestore();

// 集合名稱
const COLLECTIONS = {
  LOTTERY_SETS: 'lotterySets',
  ORDERS: 'orders',
  LOTTERY_STATES: 'lotteryStates',
  PRIZE_INSTANCES: 'prizeInstances',
  TRANSACTIONS: 'transactions'
};

async function deleteCollection(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ 已刪除 ${snapshot.size} 筆資料`);

    // 繼續刪除下一批
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function resetDatabase() {
  console.log('🚀 開始清空資料庫...\n');

  try {
    // 1. 清空商品
    console.log('📦 清空商品 (lotterySets)...');
    await deleteCollection(COLLECTIONS.LOTTERY_SETS);
    console.log('✅ 商品已清空\n');

    // 2. 清空訂單
    console.log('📋 清空訂單 (orders)...');
    await deleteCollection(COLLECTIONS.ORDERS);
    console.log('✅ 訂單已清空\n');

    // 3. 清空抽獎狀態
    console.log('🎲 清空抽獎狀態 (lotteryStates)...');
    await deleteCollection(COLLECTIONS.LOTTERY_STATES);
    console.log('✅ 抽獎狀態已清空\n');

    // 4. 清空獎品實例
    console.log('🎁 清空獎品實例 (prizeInstances)...');
    await deleteCollection(COLLECTIONS.PRIZE_INSTANCES);
    console.log('✅ 獎品實例已清空\n');

    // 5. 清空交易記錄（可選）
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('是否也要清空交易記錄？(y/N): ', (ans) => {
        readline.close();
        resolve(ans.toLowerCase());
      });
    });

    if (answer === 'y' || answer === 'yes') {
      console.log('\n💰 清空交易記錄 (transactions)...');
      await deleteCollection(COLLECTIONS.TRANSACTIONS);
      console.log('✅ 交易記錄已清空\n');
    } else {
      console.log('⏭️  保留交易記錄\n');
    }

    console.log('🎉 資料庫已重置完成！');
    console.log('\n📊 清空結果：');
    console.log('  ✅ 商品：已清空');
    console.log('  ✅ 訂單：已清空');
    console.log('  ✅ 抽獎狀態：已清空');
    console.log('  ✅ 獎品實例：已清空');
    if (answer === 'y' || answer === 'yes') {
      console.log('  ✅ 交易記錄：已清空');
    } else {
      console.log('  ⏭️  交易記錄：保留');
    }
    console.log('\n現在可以開始測試新增商品功能了！🚀\n');

  } catch (error) {
    console.error('❌ 清空資料庫時發生錯誤:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// 執行清理
resetDatabase().catch((error) => {
  console.error('❌ 執行失敗:', error);
  process.exit(1);
});
