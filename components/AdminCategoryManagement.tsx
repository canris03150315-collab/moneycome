import React, { useState, useEffect } from 'react';
import type { Category } from '../types';

interface AdminCategoryManagementProps {
    categories: Category[];
    onSaveCategory: (categories: Category[]) => void;
}

const CategoryItem: React.FC<{
    category: Category;
    onUpdate: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onAddChild: (parentId: string) => void;
    level: number;
}> = ({ category, onUpdate, onDelete, onAddChild, level }) => {
    return (
        <div style={{ marginLeft: `${level * 20}px` }} className="mt-2">
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={category.name}
                    onChange={(e) => onUpdate(category.id, e.target.value)}
                    className="flex-grow border border-gray-300 rounded-md py-1 px-2 text-sm"
                />
                <button onClick={() => onAddChild(category.id)} className="text-xs text-blue-500 hover:text-blue-700">新增子分類</button>
                <button onClick={() => onDelete(category.id)} className="text-xs text-red-500 hover:text-red-700">刪除</button>
            </div>
            {category.children.map(child => (
                <CategoryItem
                    key={child.id}
                    category={child}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onAddChild={onAddChild}
                    level={level + 1}
                />
            ))}
        </div>
    );
};

export const AdminCategoryManagement: React.FC<AdminCategoryManagementProps> = ({ categories, onSaveCategory }) => {
    const [localCategories, setLocalCategories] = useState<Category[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLocalCategories(JSON.parse(JSON.stringify(categories))); // Deep copy
        setIsDirty(false);
    }, [categories]);

    useEffect(() => {
        if (JSON.stringify(localCategories) !== JSON.stringify(categories)) {
            setIsDirty(true);
        } else {
            setIsDirty(false);
        }
    }, [localCategories, categories]);

    const handleSave = () => {
        onSaveCategory(localCategories);
        setIsDirty(false);
    };

    const findAndMutate = (cats: Category[], id: string, action: (cats: Category[], index: number) => void): Category[] => {
        const newCats = [...cats];
        for (let i = 0; i < newCats.length; i++) {
            if (newCats[i].id === id) {
                action(newCats, i);
                return newCats;
            }
            if (newCats[i].children.length > 0) {
                const updatedChildren = findAndMutate(newCats[i].children, id, action);
                if (updatedChildren !== newCats[i].children) {
                    newCats[i] = { ...newCats[i], children: updatedChildren };
                    return newCats;
                }
            }
        }
        return cats;
    };
    
    const updateCategoryName = (id: string, name: string) => {
        const action = (cats: Category[], index: number) => {
            cats[index] = { ...cats[index], name };
        };
        setLocalCategories(prev => findAndMutate(prev, id, action));
    };

    const deleteCategory = (id: string) => {
        const action = (cats: Category[], index: number) => {
            cats.splice(index, 1);
        };
        setLocalCategories(prev => findAndMutate(prev, id, action));
    };
    
    const addChildCategory = (parentId: string) => {
        const newCategory: Category = {
            id: `cat-${Date.now()}`,
            name: '新子分類',
            children: [],
        };
        const action = (cats: Category[], index: number) => {
            cats[index] = { ...cats[index], children: [...cats[index].children, newCategory] };
        };
        setLocalCategories(prev => findAndMutate(prev, parentId, action));
    };
    
    const addTopLevelCategory = () => {
        const newCategory: Category = {
            id: `cat-${Date.now()}`,
            name: '新分類',
            children: [],
        };
        setLocalCategories([...localCategories, newCategory]);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">分類管理</h2>
            
            <div>
                {localCategories.map(cat => (
                    <CategoryItem
                        key={cat.id}
                        category={cat}
                        onUpdate={updateCategoryName}
                        onDelete={deleteCategory}
                        onAddChild={addChildCategory}
                        level={0}
                    />
                ))}
            </div>

            <button onClick={addTopLevelCategory} className="mt-4 text-black hover:text-gray-700 text-sm font-semibold">
                + 新增頂層分類
            </button>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="bg-black text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    儲存分類
                </button>
            </div>
        </div>
    );
};