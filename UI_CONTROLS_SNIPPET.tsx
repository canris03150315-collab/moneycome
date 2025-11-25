// ==========================================
// UI 控件代碼片段
// ==========================================
// 這段代碼應該插入到 ProfilePage.tsx 的 InventoryView 組件中
// 位置：在 return 語句內，) : ( 之後，<div className="grid..."> 之前
// ==========================================

<>
    {/* 篩選和排序控件 */}
    {selectionMode === 'none' && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 狀態篩選 */}
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="ALL">全部狀態</option>
                    <option value="AVAILABLE">可用</option>
                    <option value="RECYCLED">已回收</option>
                    <option value="SHIPPED">運送中/已送達</option>
                    <option value="PICKUP">待自取/已取貨</option>
                </select>

                {/* 等級篩選 */}
                <select 
                    value={filterGrade} 
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="ALL">全部等級</option>
                    {availableGrades.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                    ))}
                </select>

                {/* 活動篩選 */}
                <select 
                    value={filterLottery} 
                    onChange={(e) => setFilterLottery(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="ALL">全部活動</option>
                    {lotterySets.map(set => (
                        <option key={set.id} value={set.id}>{set.title}</option>
                    ))}
                </select>

                {/* 排序 */}
                <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as 'grade' | 'date')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="date">最新獲得</option>
                    <option value="grade">等級排序</option>
                </select>
            </div>

            {/* 搜尋框 */}
            <input 
                type="text"
                placeholder="搜尋獎品名稱或等級..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* 統計資訊 */}
            <div className="text-sm text-gray-600">
                顯示 <span className="font-semibold text-gray-800">{displayedPrizes.length}</span> / <span className="font-semibold text-gray-800">{processedPrizes.length}</span> 件獎品
                {(filterStatus !== 'AVAILABLE' || filterGrade !== 'ALL' || filterLottery !== 'ALL' || searchQuery) && (
                    <span className="ml-2 text-blue-600">(已篩選，共 {allPrizes.length} 件)</span>
                )}
            </div>
        </div>
    )}

    {selectionMode !== 'none' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ 選擇模式中，篩選功能已停用
        </div>
    )}

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
