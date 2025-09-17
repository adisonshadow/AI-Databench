
import type { AIModelConfig } from 'ai-model-application-suite';

/**
 * 根据 localStorage 的 ai-model-configs-selected 和 ai-model-configs 获取当前选中的 AI 模型配置
 * @returns 当前选中的 AI 模型配置，如果没有选中则返回 null
 */
const getSelectedAIModelConfig = (): AIModelConfig | null => {
    try {
        // 获取选中的模型ID
        const selectedModelId = localStorage.getItem('ai-model-configs-selected');
        
        // 获取所有配置
        const configsStr = localStorage.getItem('ai-model-configs');
        
        if (!selectedModelId || !configsStr) {
            return null;
        }
        
        // 解析配置数组
        const configs: AIModelConfig[] = JSON.parse(configsStr);
        
        if (!Array.isArray(configs)) {
            console.warn('ai-model-configs 不是有效的数组格式');
            return null;
        }
        
        // 查找匹配的配置
        const selectedConfig = configs.find(config => config.id === selectedModelId);
        
        if (!selectedConfig) {
            console.warn(`未找到ID为 ${selectedModelId} 的AI模型配置`);
            return null;
        }
        
        return selectedConfig;
    } catch (error) {
        console.error('获取AI模型配置失败:', error);
        return null;
    }
};

/**
 * 获取所有可用的AI模型配置
 * @returns AI模型配置数组
 */
const getAllAIModelConfigs = (): AIModelConfig[] => {
    try {
        const configsStr = localStorage.getItem('ai-model-configs');
        
        if (!configsStr) {
            return [];
        }
        
        const configs: AIModelConfig[] = JSON.parse(configsStr);
        
        if (!Array.isArray(configs)) {
            console.warn('ai-model-configs 不是有效的数组格式');
            return [];
        }
        
        return configs;
    } catch (error) {
        console.error('获取AI模型配置列表失败:', error);
        return [];
    }
};

/**
 * 检查是否有可用的AI模型配置
 * @returns 是否有可用的配置
 */
const hasAIModelConfigs = (): boolean => {
    return getAllAIModelConfigs().length > 0;
};

export { 
    getSelectedAIModelConfig, 
    getAllAIModelConfigs, 
    hasAIModelConfigs 
};