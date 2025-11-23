#!/usr/bin/env node

/**
 * Firestore 快速測試腳本
 * 測試所有核心功能是否正常
 */

const db = require('./db/firestore');

async function testUserOperations() {
  console.log('\n📝 測試用戶操作...');
  
  try {
    // 創建測試用戶
    const testUser = await db.createUser({
      email: 'test-firestore@example.com',
      username: 'FirestoreTest',
      password: 'test123',
      points: 500,
    });
    console.log('✅ 創建用戶成功:', testUser.email);
    
    // 通過 Email 查詢
    const found = await db.getUserByEmail('test-firestore@example.com');
    console.log('✅ 查詢用戶成功:', found ? 'found' : 'not found');
    
    // 更新點數
    await db.updateUserPoints(testUser.id, 1000);
    const updated = await db.getUserById(testUser.id);
    console.log('✅ 更新點數成功:', updated.points, 'P');
    
    return testUser.id;
    
  } catch (error) {
    console.error('❌ 用戶操作失敗:', error.message);
    throw error;
  }
}

async function testOrderOperations(userId) {
  console.log('\n📦 測試訂單操作...');
  
  try {
    // 創建訂單
    const order = await db.createOrder({
      userId,
      type: 'LOTTERY_DRAW',
      lotterySetId: 'test-set-1',
      costInPoints: 300,
      items: [
        { ticketIndex: 1, prizeId: 'prize-1', prizeName: '測試獎品' }
      ],
    });
    console.log('✅ 創建訂單成功:', order.id);
    
    // 查詢用戶訂單
    const orders = await db.getUserOrders(userId);
    console.log('✅ 查詢訂單成功: 找到', orders.length, '筆訂單');
    
    return order.id;
    
  } catch (error) {
    console.error('❌ 訂單操作失敗:', error.message);
    throw error;
  }
}

async function testSessionOperations(userId) {
  console.log('\n🔐 測試 Session 操作...');
  
  try {
    // 創建 Session
    const sid = await db.createSession({
      user: { id: userId, email: 'test@example.com' },
      inventory: {},
      orders: [],
    });
    console.log('✅ 創建 Session 成功:', sid);
    
    // 獲取 Session
    const session = await db.getSession(sid);
    console.log('✅ 獲取 Session 成功:', session ? 'found' : 'not found');
    
    // 更新 Session
    await db.updateSession(sid, { testField: 'updated' });
    console.log('✅ 更新 Session 成功');
    
    // 刪除 Session
    await db.deleteSession(sid);
    console.log('✅ 刪除 Session 成功');
    
  } catch (error) {
    console.error('❌ Session 操作失敗:', error.message);
    throw error;
  }
}

async function testPrizeOperations(userId, orderId) {
  console.log('\n🎁 測試獎品操作...');
  
  try {
    // 創建獎品實例
    const prize = await db.createPrizeInstance({
      userId,
      lotterySetId: 'test-set-1',
      prizeId: 'prize-1',
      prizeName: '測試獎品',
      prizeGrade: 'A賞',
      orderId,
    });
    console.log('✅ 創建獎品成功:', prize.instanceId);
    
    // 查詢用戶獎品
    const prizes = await db.getUserPrizes(userId);
    console.log('✅ 查詢獎品成功: 找到', prizes.length, '個獎品');
    
    // 更新獎品狀態
    await db.updatePrizeStatus(prize.instanceId, 'SHIPPED');
    console.log('✅ 更新獎品狀態成功');
    
  } catch (error) {
    console.error('❌ 獎品操作失敗:', error.message);
    throw error;
  }
}

async function testTransactionOperations(userId) {
  console.log('\n💰 測試交易操作...');
  
  try {
    // 創建交易記錄
    const tx = await db.createTransaction({
      userId,
      type: 'DRAW',
      amount: -300,
      description: '測試抽獎',
    });
    console.log('✅ 創建交易成功:', tx.id);
    
    // 查詢用戶交易
    const transactions = await db.getUserTransactions(userId);
    console.log('✅ 查詢交易成功: 找到', transactions.length, '筆交易');
    
  } catch (error) {
    console.error('❌ 交易操作失敗:', error.message);
    throw error;
  }
}

async function testLotteryOperations() {
  console.log('\n🎰 測試抽獎狀態操作...');
  
  try {
    const setId = 'test-lottery-set';
    
    // 獲取抽獎狀態
    const state = await db.getLotteryState(setId);
    console.log('✅ 獲取抽獎狀態成功:', state.drawnTicketIndices.length, '個已抽籤號');
    
    // 標記籤號已抽出
    await db.markTicketsDrawn(setId, [1, 2, 3]);
    const updated = await db.getLotteryState(setId);
    console.log('✅ 標記籤號成功:', updated.drawnTicketIndices.length, '個已抽籤號');
    
  } catch (error) {
    console.error('❌ 抽獎操作失敗:', error.message);
    throw error;
  }
}

async function cleanup(userId) {
  console.log('\n🗑️  清理測試數據...');
  
  try {
    // 軟刪除用戶
    await db.deleteUser(userId);
    console.log('✅ 清理完成');
    
  } catch (error) {
    console.error('⚠️  清理失敗:', error.message);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🧪 Firestore 功能測試              ║');
  console.log('╚════════════════════════════════════════╝');
  
  let userId, orderId;
  
  try {
    // 執行所有測試
    userId = await testUserOperations();
    orderId = await testOrderOperations(userId);
    await testSessionOperations(userId);
    await testPrizeOperations(userId, orderId);
    await testTransactionOperations(userId);
    await testLotteryOperations();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ 所有測試通過！                  ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n🎉 Firestore 配置正確，所有功能正常工作！');
    
  } catch (error) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ❌ 測試失敗！                      ║');
    console.log('╚════════════════════════════════════════╝');
    console.error('\n錯誤詳情:', error);
    process.exit(1);
    
  } finally {
    // 清理測試數據
    if (userId) {
      await cleanup(userId);
    }
  }
}

// 執行測試
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
