import { AIContextGenerator } from './AIContextGenerator';
import { AIResponseProcessor } from './AIResponseProcessor';
import type { AIProcessResult, AIBadge } from './AIResponseProcessor';

/**
 * AI 助手集成类
 * 提供完整的 AI 助手功能集成
 */
export class AIAssistantIntegration {
  private contextGenerator: AIContextGenerator;
  private responseProcessor: AIResponseProcessor;

  constructor() {
    this.contextGenerator = new AIContextGenerator();
    this.responseProcessor = new AIResponseProcessor();
  }

  /**
   * 生成发送给 AI 的完整提示词
   */
  public generateAIPrompt(userInput: string, mode: 'full' | 'simplified' | 'operation' = 'full'): string {
    switch (mode) {
      case 'full':
        return this.contextGenerator.generateContextPrompt(userInput);
      case 'simplified':
        return this.contextGenerator.generateSimplifiedContext(userInput);
      case 'operation':
        return this.contextGenerator.generateOperationContext('create_entity', userInput);
      default:
        return this.contextGenerator.generateContextPrompt(userInput);
    }
  }

  /**
   * 处理 AI 响应并生成前端显示内容
   */
  public async processAIResponse(response: string): Promise<AIProcessResult> {
    return await this.responseProcessor.processAIResponse(response);
  }

  /**
   * 生成 AI 上下文摘要（用于显示）
   */
  public generateContextSummary(): string {
    const context = this.contextGenerator['contextProvider'].getAIContext();
    
    return `
项目: ${context.projectInfo.name}
实体: ${context.projectInfo.entityCount} 个
枚举: ${context.projectInfo.enumCount} 个
关系: ${context.projectInfo.relationCount} 个
数据库: ${context.projectInfo.databaseType}
    `.trim();
  }

  /**
   * 检查用户输入是否需要特殊处理
   */
  public analyzeUserInput(userInput: string): InputAnalysis {
    const input = userInput.toLowerCase();
    
    // 检测操作类型
    let operationType: string | null = null;
    if (input.includes('创建') || input.includes('新建') || input.includes('添加')) {
      if (input.includes('实体') || input.includes('表')) {
        operationType = 'create_entity';
      } else if (input.includes('字段') || input.includes('列')) {
        operationType = 'create_field';
      } else if (input.includes('枚举')) {
        operationType = 'create_enum';
      } else if (input.includes('关系') || input.includes('关联')) {
        operationType = 'create_relation';
      }
    } else if (input.includes('修改') || input.includes('更新') || input.includes('编辑')) {
      if (input.includes('实体') || input.includes('表')) {
        operationType = 'update_entity';
      } else if (input.includes('字段') || input.includes('列')) {
        operationType = 'update_field';
      } else if (input.includes('枚举')) {
        operationType = 'update_enum';
      } else if (input.includes('关系') || input.includes('关联')) {
        operationType = 'update_relation';
      }
    } else if (input.includes('删除') || input.includes('移除')) {
      if (input.includes('实体') || input.includes('表')) {
        operationType = 'delete_entity';
      } else if (input.includes('字段') || input.includes('列')) {
        operationType = 'delete_field';
      } else if (input.includes('枚举')) {
        operationType = 'delete_enum';
      } else if (input.includes('关系') || input.includes('关联')) {
        operationType = 'delete_relation';
      }
    } else if (input.includes('分析') || input.includes('检查') || input.includes('评估')) {
      operationType = 'analysis';
    } else if (input.includes('优化') || input.includes('改进') || input.includes('建议')) {
      operationType = 'optimization';
    }

    // 检测复杂度
    const isComplex = input.length > 100 || 
                      input.includes('多个') || 
                      input.includes('批量') || 
                      input.includes('复杂');

    // 检测是否需要确认
    const requiresConfirmation = operationType && 
                                !operationType.includes('analysis') && 
                                !operationType.includes('optimization');

    return {
      operationType,
      isComplex,
      requiresConfirmation,
      suggestedMode: isComplex ? 'full' : 'simplified',
      confidence: operationType ? 0.8 : 0.3
    };
  }

  /**
   * 生成操作建议
   */
  public generateOperationSuggestions(): OperationSuggestion[] {
    return [
      {
        title: '创建用户实体',
        description: '创建一个包含基本用户信息的实体',
        prompt: '创建一个用户实体，包含用户名、邮箱、密码等字段',
        operationType: 'create_entity',
        icon: 'user'
      },
      {
        title: '创建订单状态枚举',
        description: '创建订单状态管理枚举',
        prompt: '创建一个订单状态枚举，包含待支付、已支付、处理中、已完成、已取消等状态',
        operationType: 'create_enum',
        icon: 'tag'
      },
      {
        title: '分析实体健壮性',
        description: '分析当前实体的设计健壮性',
        prompt: '分析当前项目中所有实体的健壮性，包括数据完整性、性能优化、安全性等方面',
        operationType: 'analysis',
        icon: 'analysis'
      },
      {
        title: '优化数据库设计',
        description: '提供数据库设计优化建议',
        prompt: '分析当前数据库设计并提供优化建议，包括索引优化、关系优化、性能提升等',
        operationType: 'optimization',
        icon: 'optimization'
      }
    ];
  }

  /**
   * 验证 AI 响应格式
   */
  public validateAIResponse(response: string): ValidationResult {
    try {
      // 尝试解析 JSON
      const data = JSON.parse(response);
      
      // 检查必需字段
      if (!data.operationType || !data.data) {
        return {
          isValid: false,
          errors: ['缺少必需字段: operationType 或 data']
        };
      }

      // 检查操作类型
      const validOperationTypes = [
        'create_entity', 'update_entity', 'delete_entity',
        'create_field', 'update_field', 'delete_field',
        'create_enum', 'update_enum', 'delete_enum',
        'create_relation', 'update_relation', 'delete_relation',
        'analysis', 'optimization'
      ];

      if (!validOperationTypes.includes(data.operationType)) {
        return {
          isValid: false,
          errors: [`无效的操作类型: ${data.operationType}`]
        };
      }

      return {
        isValid: true,
        errors: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['响应不是有效的 JSON 格式']
      };
    }
  }

  /**
   * 生成错误处理建议
   */
  public generateErrorHandlingSuggestions(error: string): string[] {
    const suggestions: string[] = [];

    if (error.includes('JSON')) {
      suggestions.push('请确保 AI 返回的是有效的 JSON 格式');
      suggestions.push('检查 JSON 语法是否正确');
    }

    if (error.includes('operationType')) {
      suggestions.push('请确保操作类型是有效的');
      suggestions.push('支持的操作类型: create_entity, update_entity, delete_entity 等');
    }

    if (error.includes('data')) {
      suggestions.push('请确保 data 字段包含有效的操作数据');
      suggestions.push('检查数据格式是否符合 ADB TypeORM 规范');
    }

    if (error.includes('重复')) {
      suggestions.push('请检查实体代码、表名或字段名是否重复');
      suggestions.push('使用唯一的标识符');
    }

    return suggestions;
  }
}

// 类型定义
export interface InputAnalysis {
  operationType: string | null;
  isComplex: boolean;
  requiresConfirmation: boolean;
  suggestedMode: 'full' | 'simplified' | 'operation';
  confidence: number;
}

export interface OperationSuggestion {
  title: string;
  description: string;
  prompt: string;
  operationType: string;
  icon: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 使用示例
export const createAIAssistantIntegration = (): AIAssistantIntegration => {
  return new AIAssistantIntegration();
};
