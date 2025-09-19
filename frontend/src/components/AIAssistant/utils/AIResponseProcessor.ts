import type { Project } from '@/types/storage';
import { StorageService } from '@/stores/storage';

/**
 * AI 响应处理器
 * 负责处理 AI 返回的 JSON 数据，识别操作类型，并触发相应的前端操作
 */
export class AIResponseProcessor {
  private currentProject: Project | null = null;

  constructor() {
    this.loadCurrentProject();
  }

  /**
   * 加载当前项目
   */
  private loadCurrentProject(): void {
    const activeProjectId = StorageService.getActiveProject();
    if (activeProjectId) {
      this.currentProject = StorageService.getProject(activeProjectId);
    }
  }

  /**
   * 处理 AI 响应
   */
  public async processAIResponse(response: string): Promise<AIProcessResult> {
    try {
      // 尝试解析 JSON 响应
      const aiData = this.parseAIResponse(response);
      
      if (!aiData) {
        return {
          type: 'text',
          content: response,
          badges: []
        };
      }

      // 验证操作类型
      const operationType = this.validateOperationType(aiData.operationType);
      
      // 处理操作数据
      const processedData = await this.processOperationData(operationType, aiData);
      
      // 生成 badge 信息
      const badges = this.generateBadges(operationType, processedData);
      
      return {
        type: 'operation',
        content: response,
        badges,
        operationData: processedData,
        requiresConfirmation: aiData.requiresConfirmation || false
      };

    } catch (error) {
      console.error('AI 响应处理失败:', error);
      return {
        type: 'error',
        content: response,
        badges: [{
          type: 'error',
          text: '解析失败',
          color: '#ff4d4f'
        }],
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 解析 AI 响应
   */
  private parseAIResponse(response: string): AIResponseData | null {
    try {
      console.log('🔍 开始解析 AI 响应:', response.substring(0, 200) + '...');
      
      // 尝试从 adb-typeorm 代码块中提取 JSON 数据
      // const adbTypeormMatch = response.match(/```adb-typeorm\s*([\s\S]*?)\s*```/);
      const adbTypeormMatch = response.match(/```adb-typeorm\n([\s\S]*?)\n```/);
      console.log('🔍 adb-typeorm 匹配结果:', adbTypeormMatch ? '匹配成功' : '匹配失败');
      if (adbTypeormMatch) {
        console.log('🔍 提取的 JSON 数据:', adbTypeormMatch[1].substring(0, 100) + '...');
        const parsed = JSON.parse(adbTypeormMatch[1]);
        console.log('🔍 解析后的数据:', parsed);
        return parsed;
      }

      // 尝试从 adb-json 代码块中提取 JSON 数据
      const adbJsonMatch = response.match(/```adb-json\s*([\s\S]*?)\s*```/);
      console.log('🔍 adb-json 匹配结果:', adbJsonMatch ? '匹配成功' : '匹配失败');
      if (adbJsonMatch) {
        const parsed = JSON.parse(adbJsonMatch[1]);
        console.log('🔍 解析后的数据:', parsed);
        return parsed;
      }

      // 尝试从普通 json 代码块中提取 JSON 数据
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      console.log('🔍 json 匹配结果:', jsonMatch ? '匹配成功' : '匹配失败');
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        console.log('🔍 解析后的数据:', parsed);
        return parsed;
      }

      // 尝试直接解析整个响应
      try {
        const parsed = JSON.parse(response);
        if (this.isValidAIResponseData(parsed)) {
          console.log('🔍 直接解析成功:', parsed);
          return parsed;
        }
      } catch (e) {
        console.log('🔍 直接解析失败:', e);
      }

      console.log('❌ 所有解析方法都失败了');
      return null;
    } catch (error) {
      console.error('❌ parseAIResponse 发生错误:', error);
      return null;
    }
  }

  /**
   * 验证是否为有效的 AI 响应数据
   */
  private isValidAIResponseData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.operationType === 'string' &&
      typeof data.data === 'object'
    );
  }

  /**
   * 验证操作类型
   */
  private validateOperationType(operationType: string): AIOperationType {
    const validTypes: AIOperationType[] = [
      'create_entity', 'update_entity', 'delete_entity',
      'create_field', 'update_field', 'delete_field',
      'create_enum', 'update_enum', 'delete_enum',
      'create_relation', 'update_relation', 'delete_relation',
      'analysis', 'optimization'
    ];

    if (validTypes.includes(operationType as AIOperationType)) {
      return operationType as AIOperationType;
    }

    throw new Error(`无效的操作类型: ${operationType}`);
  }

  /**
   * 处理操作数据
   */
  private async processOperationData(
    operationType: AIOperationType,
    aiData: AIResponseData
  ): Promise<ProcessedOperationData> {
    // 获取操作数据，支持两种格式：entityData 或 data
    const operationData = aiData.entityData || aiData.data;
    console.log('🔍 processOperationData - 操作数据:', operationData);
    
    switch (operationType) {
      case 'create_entity':
        return this.processCreateEntity(operationData);
      case 'update_entity':
        return this.processUpdateEntity(operationData);
      case 'delete_entity':
        return this.processDeleteEntity(operationData);
      case 'create_field':
        return this.processCreateField(operationData);
      case 'update_field':
        return this.processUpdateField(operationData);
      case 'delete_field':
        return this.processDeleteField(operationData);
      case 'create_enum':
        return this.processCreateEnum(operationData);
      case 'update_enum':
        return this.processUpdateEnum(operationData);
      case 'delete_enum':
        return this.processDeleteEnum(operationData);
      case 'create_relation':
        return this.processCreateRelation(operationData);
      case 'update_relation':
        return this.processUpdateRelation(operationData);
      case 'delete_relation':
        return this.processDeleteRelation(operationData);
      case 'analysis':
        return this.processAnalysis(operationData);
      case 'optimization':
        return this.processOptimization(operationData);
      default:
        throw new Error(`不支持的操作类型: ${operationType}`);
    }
  }

  /**
   * 生成 Badge 信息
   */
  private generateBadges(
    operationType: AIOperationType,
    processedData: ProcessedOperationData
  ): AIBadge[] {
    const badges: AIBadge[] = [];

    // 根据操作类型生成主要 badge
    switch (operationType) {
      case 'create_entity':
        badges.push({
          type: 'success',
          text: '新建实体',
          color: '#52c41a',
          icon: 'plus-circle'
        });
        break;
      case 'update_entity':
        badges.push({
          type: 'warning',
          text: '修改实体',
          color: '#faad14',
          icon: 'edit'
        });
        break;
      case 'delete_entity':
        badges.push({
          type: 'error',
          text: '删除实体',
          color: '#ff4d4f',
          icon: 'delete'
        });
        break;
      case 'create_field':
        badges.push({
          type: 'success',
          text: '新建字段',
          color: '#52c41a',
          icon: 'plus'
        });
        break;
      case 'update_field':
        badges.push({
          type: 'warning',
          text: '修改字段',
          color: '#faad14',
          icon: 'edit'
        });
        break;
      case 'delete_field':
        badges.push({
          type: 'error',
          text: '删除字段',
          color: '#ff4d4f',
          icon: 'delete'
        });
        break;
      case 'create_enum':
        badges.push({
          type: 'success',
          text: '新建枚举',
          color: '#52c41a',
          icon: 'plus-circle'
        });
        break;
      case 'update_enum':
        badges.push({
          type: 'warning',
          text: '修改枚举',
          color: '#faad14',
          icon: 'edit'
        });
        break;
      case 'delete_enum':
        badges.push({
          type: 'error',
          text: '删除枚举',
          color: '#ff4d4f',
          icon: 'delete'
        });
        break;
      case 'create_relation':
        badges.push({
          type: 'success',
          text: '新建关系',
          color: '#52c41a',
          icon: 'link'
        });
        break;
      case 'update_relation':
        badges.push({
          type: 'warning',
          text: '修改关系',
          color: '#faad14',
          icon: 'edit'
        });
        break;
      case 'delete_relation':
        badges.push({
          type: 'error',
          text: '删除关系',
          color: '#ff4d4f',
          icon: 'delete'
        });
        break;
      case 'analysis':
        badges.push({
          type: 'info',
          text: '分析建议',
          color: '#1890ff',
          icon: 'analysis'
        });
        break;
      case 'optimization':
        badges.push({
          type: 'info',
          text: '优化建议',
          color: '#1890ff',
          icon: 'optimization'
        });
        break;
    }

    // 添加确认状态 badge
    if (processedData.requiresConfirmation) {
      badges.push({
        type: 'warning',
        text: '需要确认',
        color: '#faad14',
        icon: 'exclamation-circle'
      });
    }

    // 添加影响分析 badge
    if (processedData.impact && processedData.impact.level !== 'low') {
      badges.push({
        type: processedData.impact.level === 'high' ? 'error' : 'warning',
        text: `${processedData.impact.level === 'high' ? '高' : '中'}影响`,
        color: processedData.impact.level === 'high' ? '#ff4d4f' : '#faad14',
        icon: 'warning'
      });
    }

    return badges;
  }

  // 具体的操作处理方法
  private processCreateEntity(data: any): ProcessedOperationData {
    return {
      operationType: 'create_entity',
      entityData: data,
      impact: this.analyzeEntityImpact(data),
      requiresConfirmation: true
    };
  }

  private processUpdateEntity(data: any): ProcessedOperationData {
    return {
      operationType: 'update_entity',
      entityData: data,
      impact: this.analyzeEntityImpact(data),
      requiresConfirmation: true
    };
  }

  private processDeleteEntity(data: any): ProcessedOperationData {
    return {
      operationType: 'delete_entity',
      entityData: data,
      impact: { level: 'high', description: '删除实体将影响所有相关字段和关系' },
      requiresConfirmation: true
    };
  }

  private processCreateField(data: any): ProcessedOperationData {
    return {
      operationType: 'create_field',
      fieldData: data,
      impact: this.analyzeFieldImpact(data),
      requiresConfirmation: true
    };
  }

  private processUpdateField(data: any): ProcessedOperationData {
    return {
      operationType: 'update_field',
      fieldData: data,
      impact: this.analyzeFieldImpact(data),
      requiresConfirmation: true
    };
  }

  private processDeleteField(data: any): ProcessedOperationData {
    return {
      operationType: 'delete_field',
      fieldData: data,
      impact: { level: 'medium', description: '删除字段可能影响相关查询和关系' },
      requiresConfirmation: true
    };
  }

  private processCreateEnum(data: any): ProcessedOperationData {
    return {
      operationType: 'create_enum',
      enumData: data,
      impact: { level: 'low', description: '创建新枚举不会影响现有数据' },
      requiresConfirmation: false
    };
  }

  private processUpdateEnum(data: any): ProcessedOperationData {
    return {
      operationType: 'update_enum',
      enumData: data,
      impact: { level: 'medium', description: '修改枚举可能影响使用该枚举的字段' },
      requiresConfirmation: true
    };
  }

  private processDeleteEnum(data: any): ProcessedOperationData {
    return {
      operationType: 'delete_enum',
      enumData: data,
      impact: { level: 'high', description: '删除枚举将影响所有使用该枚举的字段' },
      requiresConfirmation: true
    };
  }

  private processCreateRelation(data: any): ProcessedOperationData {
    return {
      operationType: 'create_relation',
      relationData: data,
      impact: { level: 'medium', description: '创建关系将影响实体间的数据关联' },
      requiresConfirmation: true
    };
  }

  private processUpdateRelation(data: any): ProcessedOperationData {
    return {
      operationType: 'update_relation',
      relationData: data,
      impact: { level: 'medium', description: '修改关系可能影响数据查询和关联' },
      requiresConfirmation: true
    };
  }

  private processDeleteRelation(data: any): ProcessedOperationData {
    return {
      operationType: 'delete_relation',
      relationData: data,
      impact: { level: 'medium', description: '删除关系将断开实体间的关联' },
      requiresConfirmation: true
    };
  }

  private processAnalysis(data: any): ProcessedOperationData {
    return {
      operationType: 'analysis',
      analysisData: data,
      impact: { level: 'low', description: '分析操作不会修改项目数据' },
      requiresConfirmation: false
    };
  }

  private processOptimization(data: any): ProcessedOperationData {
    return {
      operationType: 'optimization',
      optimizationData: data,
      impact: { level: 'medium', description: '优化建议可能涉及结构调整' },
      requiresConfirmation: true
    };
  }

  // 影响分析方法
  private analyzeEntityImpact(data: any): ImpactAnalysis {
    // 简单的实体影响分析
    return {
      level: 'medium',
      description: '实体操作可能影响数据库结构和相关查询'
    };
  }

  private analyzeFieldImpact(data: any): ImpactAnalysis {
    // 简单的字段影响分析
    return {
      level: 'low',
      description: '字段操作影响相对较小'
    };
  }
}

// 类型定义
export type AIOperationType = 
  | 'create_entity' | 'update_entity' | 'delete_entity'
  | 'create_field' | 'update_field' | 'delete_field'
  | 'create_enum' | 'update_enum' | 'delete_enum'
  | 'create_relation' | 'update_relation' | 'delete_relation'
  | 'analysis' | 'optimization';

export interface AIResponseData {
  operationType: string;
  data: any;
  description?: string;
  impact?: any;
  requiresConfirmation?: boolean;
}

export interface AIProcessResult {
  type: 'text' | 'operation' | 'error';
  content: string;
  badges: AIBadge[];
  operationData?: ProcessedOperationData;
  requiresConfirmation?: boolean;
  error?: string;
}

export interface AIBadge {
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  color?: string;
  icon?: string;
}

export interface ProcessedOperationData {
  operationType: AIOperationType;
  entityData?: any;
  fieldData?: any;
  enumData?: any;
  relationData?: any;
  analysisData?: any;
  optimizationData?: any;
  impact: ImpactAnalysis;
  requiresConfirmation: boolean;
}

export interface ImpactAnalysis {
  level: 'low' | 'medium' | 'high';
  description: string;
}
