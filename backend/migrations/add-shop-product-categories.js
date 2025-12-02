/**
 * 數據遷移腳本：為商城商品添加分類
 * 
 * 功能：
 * 1. 檢查所有商城商品
 * 2. 為沒有 categoryId 的商品添加默認分類
 * 3. 顯示遷移統計
 */

const admin = require('firebase-admin');
const path = require('path');

// 初始化 Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTIONS = {
  SHOP_PRODUCTS: 'shopProducts',
  CATEGORIES: 'categories'
};

// 默認分類 ID（如果沒有找到合適的分類）
const DEFAULT_CATEGORY_ID = 'other';

async function migrateShopProductCategories() {
  console.log('========================================');
  console.log('開始遷移商城商品分類...');
  console.log('========================================\n');

  try {
    // 1. 獲取所有分類
    console.log('📂 正在讀取分類列表...');
    const categoriesSnapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
    const categories = [];
    categoriesSnapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    console.log(`✅ 找到 ${categories.length} 個分類\n`);

    // 顯示分類列表
    if (categories.length > 0) {
      console.log('可用分類：');
      categories.forEach(cat => {
        console.log(`  - ${cat.id}: ${cat.name}`);
      });
      console.log('');
    }

    // 2. 獲取所有商城商品
    console.log('🛍️  正在讀取商城商品...');
    const productsSnapshot = await db.collection(COLLECTIONS.SHOP_PRODUCTS).get();
    console.log(`✅ 找到 ${productsSnapshot.size} 個商品\n`);

    if (productsSnapshot.empty) {
      console.log('⚠️  沒有找到任何商城商品');
      return;
    }

    // 3. 統計和遷移
    let totalProducts = 0;
    let productsWithCategory = 0;
    let productsNeedMigration = 0;
    let migrationSuccess = 0;
    let migrationFailed = 0;

    const batch = db.batch();
    const updates = [];

    for (const doc of productsSnapshot.docs) {
      totalProducts++;
      const product = doc.data();
      const productId = doc.id;

      if (product.categoryId) {
        productsWithCategory++;
        console.log(`✓ ${productId}: 已有分類 (${product.categoryId})`);
      } else {
        productsNeedMigration++;
        
        // 選擇默認分類
        let selectedCategoryId = DEFAULT_CATEGORY_ID;
        
        // 如果有分類，使用第一個分類
        if (categories.length > 0) {
          selectedCategoryId = categories[0].id;
        }

        console.log(`⚠ ${productId}: 缺少分類，將設置為 "${selectedCategoryId}"`);
        
        // 添加到批次更新
        const docRef = db.collection(COLLECTIONS.SHOP_PRODUCTS).doc(productId);
        batch.update(docRef, {
          categoryId: selectedCategoryId,
          updatedAt: new Date().toISOString()
        });

        updates.push({
          id: productId,
          title: product.title || '未命名',
          categoryId: selectedCategoryId
        });
      }
    }

    // 4. 執行批次更新
    if (updates.length > 0) {
      console.log(`\n📝 正在更新 ${updates.length} 個商品...`);
      
      try {
        await batch.commit();
        migrationSuccess = updates.length;
        console.log('✅ 批次更新成功！\n');
      } catch (error) {
        migrationFailed = updates.length;
        console.error('❌ 批次更新失敗:', error.message);
        throw error;
      }
    }

    // 5. 顯示統計結果
    console.log('\n========================================');
    console.log('遷移完成統計：');
    console.log('========================================');
    console.log(`總商品數：${totalProducts}`);
    console.log(`已有分類：${productsWithCategory}`);
    console.log(`需要遷移：${productsNeedMigration}`);
    console.log(`遷移成功：${migrationSuccess}`);
    console.log(`遷移失敗：${migrationFailed}`);
    console.log('========================================\n');

    // 6. 顯示更新詳情
    if (updates.length > 0) {
      console.log('已更新的商品：');
      updates.forEach(update => {
        console.log(`  - ${update.id}: "${update.title}" → 分類: ${update.categoryId}`);
      });
      console.log('');
    }

    // 7. 提示後續操作
    if (migrationSuccess > 0) {
      console.log('⚠️  重要提示：');
      console.log('   這些商品已被設置為默認分類，請在後台管理中手動調整為正確的分類。');
      console.log('');
    }

    console.log('✅ 遷移腳本執行完成！');

  } catch (error) {
    console.error('\n❌ 遷移過程中發生錯誤:', error);
    throw error;
  }
}

// 執行遷移
migrateShopProductCategories()
  .then(() => {
    console.log('\n🎉 所有操作完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 遷移失敗:', error);
    process.exit(1);
  });
