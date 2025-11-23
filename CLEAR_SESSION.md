# 🔧 清除旧 Session 并重新测试

## 问题
浏览器中可能保存着旧的无效 sessionId，导致持续出现 401 错误。

## 解决方案：清除并重新登录

### 方法 1：使用 DevTools Console（推荐）

1. 访问：https://ichiban-frontend-248630813908.us-central1.run.app
2. 按 F12 打开 DevTools
3. 切换到 **Console** 标签
4. 复制粘贴并执行以下命令：

```javascript
// 清除旧的 sessionId
localStorage.removeItem('sessionId');
console.log('✅ sessionId 已清除');

// 重新加载页面
location.reload();
```

### 方法 2：手动清除 Application Storage

1. 按 F12 打开 DevTools
2. 切换到 **Application** 标签
3. 左侧找到 **Local Storage**
4. 展开并点击网站域名
5. 找到 `sessionId` 项
6. 右键删除
7. 刷新页面（Ctrl+Shift+R）

### 方法 3：清除所有浏览器数据（最彻底）

1. 按 Ctrl+Shift+Delete 打开清除浏览数据对话框
2. 选择「Cookie 和其他网站数据」
3. 时间范围选择「过去 1 小时」
4. 点击「清除数据」
5. 重新访问网站

---

## 🎯 完整测试步骤

清除后请按以下步骤测试：

```
1. 确认已清除 sessionId（Console 显示 ✅ sessionId 已清除）
2. 页面自动刷新
3. 点击「登入/註冊」按钮
4. 输入测试账号：
   - 帐号：123123@aaa
   - 密码：123123
5. 点击「登入」

预期结果：
✅ 登入成功
✅ 显示：测试达人
✅ 显示：2,000 P
✅ Console 没有 401 错误
✅ Console 显示：[AuthStore] ✅ Session ID saved to localStorage
✅ 页面显示 4 个抽奖商品
✅ 不会被自动登出
```

---

## 🐛 如果仍然出现 401 错误

请在 Console 中执行以下诊断脚本：

```javascript
// 🔍 诊断脚本
console.log('=== Session 诊断 ===');

// 1. 检查 localStorage
const sessionId = localStorage.getItem('sessionId');
console.log('1. localStorage sessionId:', sessionId || '❌ 不存在');

// 2. 如果存在，手动测试 API
if (sessionId) {
    fetch('https://ichiban-backend-new-248630813908.us-central1.run.app/api/auth/session', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${sessionId}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('2. API Status:', response.status);
        if (response.status === 401) {
            console.log('❌ Session 无效，请重新登录');
            localStorage.removeItem('sessionId');
            location.reload();
        } else if (response.status === 200) {
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            console.log('✅ Session 有效！');
            console.log('用户:', data.user?.username);
            console.log('点数:', data.user?.points);
        }
    })
    .catch(error => {
        console.error('❌ 请求失败:', error);
    });
} else {
    console.log('❌ 没有 sessionId，请先登录');
}
```

---

## 📊 预期的正确日志

成功登录后，Console 应该显示：

```
[AuthStore] Calling login API...
[AuthStore] Login response received
[AuthStore] ✅ Session ID saved to localStorage: abc123...
[AuthStore] Setting authenticated state for user: 测试达人
[AuthStore] ✅ Login successful

[Layout] Route changed to: /
[Layout] Just checked 0s ago, skipping  ← 防抖生效
```

**不应该出现：**
- ❌ 401 Unauthorized
- ❌ Session expired or invalid
- ❌ checkSession failed
- ❌ clearing state

---

## 🎉 测试成功标志

1. ✅ 登入后右上角显示「测试达人 | 2,000 P」
2. ✅ Console 没有红色错误
3. ✅ 刷新页面（F5）仍保持登入
4. ✅ 可以看到 4 个抽奖商品
5. ✅ 点击商品可以查看详情
6. ✅ 可以进行储值操作

如果所有这些都正常，说明修复完全成功！🚀
