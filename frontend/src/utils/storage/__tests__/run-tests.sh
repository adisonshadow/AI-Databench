#!/bin/bash

# IndexedDB 存储系统测试运行脚本

echo "🚀 开始运行 IndexedDB 存储系统测试..."

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装测试依赖..."
    npm install --save-dev @testing-library/react @testing-library/react-hooks @types/jest fake-indexeddb jest jest-environment-jsdom ts-jest
fi

# 运行所有测试
echo "🧪 运行所有测试..."
npx jest src/utils/storage/__tests__ --config src/utils/storage/__tests__/package.json

# 运行特定测试
if [ "$1" = "db" ]; then
    echo "🗄️ 运行数据库测试..."
    npx jest src/utils/storage/__tests__/db.test.ts --config src/utils/storage/__tests__/package.json
elif [ "$1" = "storage" ]; then
    echo "💾 运行存储服务测试..."
    npx jest src/utils/storage/__tests__/storage.test.ts --config src/utils/storage/__tests__/package.json
elif [ "$1" = "events" ]; then
    echo "📡 运行事件系统测试..."
    npx jest src/utils/storage/__tests__/events.test.ts --config src/utils/storage/__tests__/package.json
elif [ "$1" = "hooks" ]; then
    echo "🪝 运行 React Hooks 测试..."
    npx jest src/utils/storage/__tests__/hooks.test.tsx --config src/utils/storage/__tests__/package.json
elif [ "$1" = "integration" ]; then
    echo "🔗 运行集成测试..."
    npx jest src/utils/storage/__tests__/integration.test.ts --config src/utils/storage/__tests__/package.json
elif [ "$1" = "coverage" ]; then
    echo "📊 运行测试覆盖率分析..."
    npx jest src/utils/storage/__tests__ --config src/utils/storage/__tests__/package.json --coverage
elif [ "$1" = "watch" ]; then
    echo "👀 运行监视模式测试..."
    npx jest src/utils/storage/__tests__ --config src/utils/storage/__tests__/package.json --watch
fi

echo "✅ 测试完成！"
