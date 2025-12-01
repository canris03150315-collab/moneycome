/**
 * 列出所有用戶
 */

require('dotenv').config();
const db = require('../db/firestore');

async function listUsers() {
  try {
    console.log('[LIST] Fetching all users...');
    
    const usersSnapshot = await db.firestore
      .collection('USERS')
      .get();
    
    console.log(`[LIST] Found ${usersSnapshot.size} users:\n`);
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      console.log('---');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Username:', user.username);
      console.log('Role:', user.role || 'N/A');
      console.log('Roles:', user.roles || 'N/A');
      console.log('Points:', user.points || 0);
    });
    
    console.log('\n[LIST] Done!');
    process.exit(0);
  } catch (error) {
    console.error('[LIST] Error:', error);
    process.exit(1);
  }
}

listUsers();
