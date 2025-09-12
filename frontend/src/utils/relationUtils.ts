// 使用crypto.randomUUID()替代uuid包
import type { 
  Relation, 
  RelationCreateConfig, 
  RelationValidationResult, 
  RelationValidationError,
  RelationValidationWarning,
  RelationConflict,
  RelationSuggestion,
  ADBEntity,
  Project
} from '@/types/storage';
import { RelationType, CascadeType } from '@/types/storage';

/**
 * 关系管理工具类
 */
export class RelationUtils {
  
  /**
   * 创建新关系
   */
  static createRelation(config: RelationCreateConfig, project: Project): Relation {
    const fromEntity = project.schema.entities[config.fromEntityId];
    const toEntity = project.schema.entities[config.toEntityId];
    
    if (!fromEntity || !toEntity) {
      throw new Error('源实体或目标实体不存在');
    }

    const relation: Relation = {
      id: crypto.randomUUID(),
      type: config.type,
      name: config.name,
      inverseName: config.inverseName,
      from: {
        entityId: config.fromEntityId,
        entityName: fromEntity.entityInfo.label || fromEntity.entityInfo.code,
      },
      to: {
        entityId: config.toEntityId,
        entityName: toEntity.entityInfo.label || toEntity.entityInfo.code,
      },
      config: {
        cascade: config.config?.cascade ?? false,
        onDelete: config.config?.onDelete ?? CascadeType.RESTRICT,
        onUpdate: config.config?.onUpdate ?? CascadeType.RESTRICT,
        nullable: config.config?.nullable ?? true,
        eager: config.config?.eager ?? false,
        lazy: config.config?.lazy ?? true,
      },
      joinTable: config.joinTable ? {
        name: config.joinTable.name || this.generateJoinTableName(config.fromEntityId, config.toEntityId),
        joinColumn: config.joinTable.joinColumn || this.generateJoinColumnName(config.fromEntityId),
        inverseJoinColumn: config.joinTable.inverseJoinColumn || this.generateJoinColumnName(config.toEntityId),
      } : undefined,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user', // TODO: 从用户上下文获取
        description: config.description,
        tags: config.tags || [],
      },
    };

    return relation;
  }

  /**
   * 验证关系
   */
  static validateRelation(relation: Relation, project: Project): RelationValidationResult {
    const errors: RelationValidationError[] = [];
    const warnings: RelationValidationWarning[] = [];

    // 验证实体存在性
    const fromEntity = project.schema.entities[relation.from.entityId];
    const toEntity = project.schema.entities[relation.to.entityId];

    if (!fromEntity) {
      errors.push({
        code: 'ENTITY_NOT_FOUND',
        message: `源实体 ${relation.from.entityName} 不存在`,
        field: 'from.entityId',
        severity: 'error',
      });
    }

    if (!toEntity) {
      errors.push({
        code: 'ENTITY_NOT_FOUND',
        message: `目标实体 ${relation.to.entityName} 不存在`,
        field: 'to.entityId',
        severity: 'error',
      });
    }

    // 验证关系名称
    if (!relation.name || relation.name.trim() === '') {
      errors.push({
        code: 'INVALID_NAME',
        message: '关系名称不能为空',
        field: 'name',
        severity: 'error',
      });
    }

    // 验证关系类型特定规则
    this.validateRelationTypeSpecific(relation, project, errors, warnings);

    // 验证多对多关系配置
    if (relation.type === RelationType.MANY_TO_MANY) {
      this.validateManyToManyRelation(relation, project, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证关系类型特定规则
   */
  private static validateRelationTypeSpecific(
    relation: Relation,
    project: Project,
    errors: RelationValidationError[],
    warnings: RelationValidationWarning[]
  ): void {
    const fromEntity = project.schema.entities[relation.from.entityId];
    const toEntity = project.schema.entities[relation.to.entityId];

    if (!fromEntity || !toEntity) return;

    switch (relation.type) {
      case RelationType.ONE_TO_ONE:
        // 一对一关系：检查是否已有其他一对一关系
        const existingOneToOne = project.schema.relations.filter(r => 
          r.type === RelationType.ONE_TO_ONE && 
          (r.from.entityId === relation.from.entityId || r.to.entityId === relation.from.entityId)
        );
        if (existingOneToOne.length > 0) {
          warnings.push({
            code: 'MULTIPLE_ONE_TO_ONE',
            message: '该实体已存在一对一关系，建议检查设计',
            suggestion: '考虑使用一对多关系或重新设计实体结构',
          });
        }
        break;

      case RelationType.ONE_TO_MANY:
      case RelationType.MANY_TO_ONE:
        // 一对多/多对一关系：检查外键字段类型
        if (relation.from.fieldId && relation.to.fieldId) {
          this.validateForeignKeyTypes(relation, project, errors);
        }
        break;

      case RelationType.MANY_TO_MANY:
        // 多对多关系：检查中间表名称冲突
        if (relation.joinTable) {
          this.validateJoinTableName(relation, project, errors);
        }
        break;
    }
  }

  /**
   * 验证外键字段类型
   */
  private static validateForeignKeyTypes(
    relation: Relation,
    project: Project,
    errors: RelationValidationError[]
  ): void {
    const fromEntity = project.schema.entities[relation.from.entityId];
    const toEntity = project.schema.entities[relation.to.entityId];

    if (!fromEntity || !toEntity) return;

    // 这里需要根据实际的字段类型进行验证
    // 暂时跳过具体实现，因为需要了解字段类型结构
  }

  /**
   * 验证多对多关系
   */
  private static validateManyToManyRelation(
    relation: Relation,
    project: Project,
    errors: RelationValidationError[],
    warnings: RelationValidationWarning[]
  ): void {
    if (!relation.joinTable) {
      errors.push({
        code: 'MISSING_JOIN_TABLE',
        message: '多对多关系必须配置中间表',
        field: 'joinTable',
        severity: 'error',
      });
      return;
    }

    // 验证中间表名称
    if (!relation.joinTable.name || relation.joinTable.name.trim() === '') {
      errors.push({
        code: 'INVALID_JOIN_TABLE_NAME',
        message: '中间表名称不能为空',
        field: 'joinTable.name',
        severity: 'error',
      });
    }

    // 验证连接列名称
    if (!relation.joinTable.joinColumn || relation.joinTable.joinColumn.trim() === '') {
      errors.push({
        code: 'INVALID_JOIN_COLUMN',
        message: '连接列名称不能为空',
        field: 'joinTable.joinColumn',
        severity: 'error',
      });
    }

    if (!relation.joinTable.inverseJoinColumn || relation.joinTable.inverseJoinColumn.trim() === '') {
      errors.push({
        code: 'INVALID_INVERSE_JOIN_COLUMN',
        message: '反向连接列名称不能为空',
        field: 'joinTable.inverseJoinColumn',
        severity: 'error',
      });
    }
  }

  /**
   * 验证中间表名称
   */
  private static validateJoinTableName(
    relation: Relation,
    project: Project,
    errors: RelationValidationError[]
  ): void {
    if (!relation.joinTable) return;

    // 检查是否与现有表名冲突
    const existingTables = Object.values(project.schema.entities).map(e => e.entityInfo.tableName);
    if (existingTables.includes(relation.joinTable.name)) {
      errors.push({
        code: 'JOIN_TABLE_NAME_CONFLICT',
        message: `中间表名称 "${relation.joinTable.name}" 与现有表名冲突`,
        field: 'joinTable.name',
        severity: 'error',
      });
    }

    // 检查是否与其他中间表名冲突
    const existingJoinTables = project.schema.relations
      .filter(r => r.type === RelationType.MANY_TO_MANY && r.joinTable)
      .map(r => r.joinTable!.name);
    
    if (existingJoinTables.includes(relation.joinTable.name)) {
      errors.push({
        code: 'JOIN_TABLE_NAME_CONFLICT',
        message: `中间表名称 "${relation.joinTable.name}" 已被其他关系使用`,
        field: 'joinTable.name',
        severity: 'error',
      });
    }
  }

  /**
   * 检查关系冲突
   */
  static checkConflicts(relation: Relation, existingRelations: Relation[]): RelationConflict[] {
    const conflicts: RelationConflict[] = [];

    // 检查重复关系
    const duplicateRelation = existingRelations.find(r => 
      r.from.entityId === relation.from.entityId &&
      r.to.entityId === relation.to.entityId &&
      r.type === relation.type &&
      r.id !== relation.id
    );

    if (duplicateRelation) {
      conflicts.push({
        type: 'duplicate',
        message: `已存在相同的关系：${relation.from.entityName} → ${relation.to.entityName}`,
        conflictingRelation: duplicateRelation,
        suggestion: '请使用不同的关系名称或检查是否重复创建',
      });
    }

    // 检查循环依赖
    if (this.hasCircularDependency(relation, existingRelations)) {
      conflicts.push({
        type: 'circular',
        message: '检测到循环依赖关系',
        suggestion: '请重新设计关系结构，避免循环依赖',
      });
    }

    // 检查命名冲突
    const namingConflict = existingRelations.find(r => 
      r.name === relation.name && r.id !== relation.id
    );

    if (namingConflict) {
      conflicts.push({
        type: 'naming',
        message: `关系名称 "${relation.name}" 已被使用`,
        conflictingRelation: namingConflict,
        suggestion: '请使用不同的关系名称',
      });
    }

    return conflicts;
  }

  /**
   * 检查循环依赖
   */
  private static hasCircularDependency(relation: Relation, existingRelations: Relation[]): boolean {
    // 简化的循环依赖检测
    // 实际实现需要更复杂的图算法
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (entityId: string): boolean => {
      if (stack.has(entityId)) return true; // 发现循环
      if (visited.has(entityId)) return false;

      visited.add(entityId);
      stack.add(entityId);

      const outgoingRelations = existingRelations.filter(r => 
        r.from.entityId === entityId && r.id !== relation.id
      );

      for (const rel of outgoingRelations) {
        if (dfs(rel.to.entityId)) return true;
      }

      stack.delete(entityId);
      return false;
    };

    return dfs(relation.from.entityId);
  }

  /**
   * 生成关系代码
   */
  static generateRelationCode(relation: Relation): string {
    const { type, name, inverseName, from, to, config, joinTable } = relation;

    let code = '';

    switch (type) {
      case RelationType.ONE_TO_ONE:
        code = `@OneToOne(() => ${to.entityName}${inverseName ? `, ${to.entityName} => ${to.entityName}.${inverseName}` : ''})
@JoinColumn()
${name}: ${to.entityName};`;
        break;

      case RelationType.ONE_TO_MANY:
        code = `@OneToMany(() => ${to.entityName}, ${to.entityName.toLowerCase()} => ${to.entityName.toLowerCase()}.${inverseName || 'parent'})
${name}: ${to.entityName}[];`;
        break;

      case RelationType.MANY_TO_ONE:
        code = `@ManyToOne(() => ${to.entityName}${inverseName ? `, ${to.entityName} => ${to.entityName}.${inverseName}` : ''})
@JoinColumn()
${name}: ${to.entityName};`;
        break;

      case RelationType.MANY_TO_MANY:
        code = `@ManyToMany(() => ${to.entityName}, ${to.entityName.toLowerCase()} => ${to.entityName.toLowerCase()}.${inverseName || 'parents'})
@JoinTable({
  name: '${joinTable?.name || 'relation_table'}',
  joinColumn: { name: '${joinTable?.joinColumn || 'from_id'}' },
  inverseJoinColumn: { name: '${joinTable?.inverseJoinColumn || 'to_id'}' }
})
${name}: ${to.entityName}[];`;
        break;
    }

    // 添加级联配置
    if (config.cascade) {
      code = code.replace('@OneToOne', '@OneToOne(() => ' + to.entityName + ', { cascade: true })');
      code = code.replace('@OneToMany', '@OneToMany(() => ' + to.entityName + ', { cascade: true })');
      code = code.replace('@ManyToOne', '@ManyToOne(() => ' + to.entityName + ', { cascade: true })');
      code = code.replace('@ManyToMany', '@ManyToMany(() => ' + to.entityName + ', { cascade: true })');
    }

    return code;
  }

  /**
   * 获取关系建议
   */
  static getRelationSuggestions(entities: ADBEntity[]): RelationSuggestion[] {
    const suggestions: RelationSuggestion[] = [];

    // 基于实体名称的智能建议
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        const name1 = entity1.entityInfo.label || entity1.entityInfo.code;
        const name2 = entity2.entityInfo.label || entity2.entityInfo.code;

        // 检查常见的命名模式
        if (this.isRelatedByName(name1, name2)) {
          suggestions.push({
            type: RelationType.ONE_TO_MANY,
            fromEntityId: entity1.entityInfo.id,
            toEntityId: entity2.entityInfo.id,
            confidence: 0.8,
            reason: `实体名称 "${name1}" 和 "${name2}" 存在关联性`,
            suggestedName: this.generateRelationName(name1, name2),
            suggestedInverseName: this.generateInverseRelationName(name1, name2),
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 检查实体名称是否相关
   */
  private static isRelatedByName(name1: string, name2: string): boolean {
    const commonPatterns = [
      /user|member/i,
      /order|purchase/i,
      /product|item/i,
      /category|type/i,
      /role|permission/i,
      /post|article/i,
      /comment|reply/i,
    ];

    return commonPatterns.some(pattern => 
      pattern.test(name1) && pattern.test(name2)
    );
  }

  /**
   * 生成关系名称
   */
  private static generateRelationName(fromName: string, toName: string): string {
    // 简化的命名生成逻辑
    const fromLower = fromName.toLowerCase();
    const toLower = toName.toLowerCase();
    
    if (fromLower.includes('user') && toLower.includes('order')) {
      return 'orders';
    }
    if (fromLower.includes('user') && toLower.includes('role')) {
      return 'roles';
    }
    if (fromLower.includes('product') && toLower.includes('category')) {
      return 'categories';
    }
    
    return `${toLower}s`;
  }

  /**
   * 生成反向关系名称
   */
  private static generateInverseRelationName(fromName: string, toName: string): string {
    const fromLower = fromName.toLowerCase();
    const toLower = toName.toLowerCase();
    
    if (fromLower.includes('user') && toLower.includes('order')) {
      return 'user';
    }
    if (fromLower.includes('user') && toLower.includes('role')) {
      return 'users';
    }
    if (fromLower.includes('product') && toLower.includes('category')) {
      return 'products';
    }
    
    return fromLower;
  }

  /**
   * 生成中间表名称
   */
  private static generateJoinTableName(fromEntityId: string, toEntityId: string): string {
    // 简化的中间表命名逻辑
    return `relation_${fromEntityId}_${toEntityId}`.replace(/-/g, '_');
  }

  /**
   * 生成连接列名称
   */
  private static generateJoinColumnName(entityId: string): string {
    return `${entityId}_id`;
  }

  /**
   * 获取关系类型显示名称
   */
  static getRelationTypeDisplayName(type: RelationType): string {
    const displayNames = {
      [RelationType.ONE_TO_ONE]: '一对一',
      [RelationType.ONE_TO_MANY]: '一对多',
      [RelationType.MANY_TO_ONE]: '多对一',
      [RelationType.MANY_TO_MANY]: '多对多',
    };
    return displayNames[type];
  }

  /**
   * 获取级联操作显示名称
   */
  static getCascadeTypeDisplayName(type: CascadeType): string {
    const displayNames = {
      [CascadeType.CASCADE]: '级联',
      [CascadeType.SET_NULL]: '设为空',
      [CascadeType.RESTRICT]: '限制',
      [CascadeType.NO_ACTION]: '无操作',
    };
    return displayNames[type];
  }
}
