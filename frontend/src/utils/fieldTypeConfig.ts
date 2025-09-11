/**
 * 字段类型配置工具
 * 根据设计文档实现数据类型与配置项之间的关系
 */

// 字段类型枚举
export enum FieldType {
  // 字符串类型
  VARCHAR = 'varchar',
  CHAR = 'char',
  TEXT = 'text',
  LONGTEXT = 'longtext',
  
  // 数字类型
  INT = 'int',
  BIGINT = 'bigint',
  DECIMAL = 'decimal',
  FLOAT = 'float',
  DOUBLE = 'double',
  
  // 日期时间类型
  DATE = 'date',
  DATETIME = 'datetime',
  TIMESTAMP = 'timestamp',
  TIME = 'time',
  
  // 布尔类型
  BOOLEAN = 'boolean',
  
  // 二进制类型
  BLOB = 'blob',
  LONGBLOB = 'longblob',
  
  // ADB 扩展类型
  ADB_MEDIA = 'adb-media',
  ADB_ENUM = 'adb-enum',
  ADB_AUTO_INCREMENT_ID = 'adb-auto-increment-id',
  ADB_GUID_ID = 'adb-guid-id',
  ADB_SNOWFLAKE_ID = 'adb-snowflake-id',
}

// 字段类型分类
export enum FieldCategory {
  STRING = 'string',
  NUMBER = 'number',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  BINARY = 'binary',
  ADB_EXTEND = 'adb-extend',
}

// 配置项类型
export interface FieldConfig {
  nullable: boolean;           // 可为空
  unique: boolean;            // 唯一约束
  primary: boolean;           // 主键
  default: boolean;           // 默认值
  length: boolean;            // 长度
  precision: boolean;         // 精度
  scale: boolean;             // 小数位
  mediaConfig: boolean;       // 媒体配置
  enumConfig: boolean;        // 枚举配置
  autoIncrementIdConfig: boolean; // 自增ID配置
  guidIdConfig: boolean;      // GUID ID配置
  snowflakeIdConfig: boolean; // 雪花ID配置
}

// 字段类型信息
export interface FieldTypeInfo {
  type: FieldType;
  label: string;
  category: FieldCategory;
  description: string;
  config: FieldConfig;
}

// 字段类型配置映射
export const FIELD_TYPE_CONFIGS: Record<FieldType, FieldTypeInfo> = {
  // 字符串类型
  [FieldType.VARCHAR]: {
    type: FieldType.VARCHAR,
    label: '变长字符串',
    category: FieldCategory.STRING,
    description: '可变长度的字符串，适合存储长度不固定的文本',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: true,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.CHAR]: {
    type: FieldType.CHAR,
    label: '定长字符串',
    category: FieldCategory.STRING,
    description: '固定长度的字符串，适合存储长度固定的文本',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: true,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.TEXT]: {
    type: FieldType.TEXT,
    label: '长文本',
    category: FieldCategory.STRING,
    description: '长文本类型，适合存储大量文本内容',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.LONGTEXT]: {
    type: FieldType.LONGTEXT,
    label: '超长文本',
    category: FieldCategory.STRING,
    description: '超长文本类型，适合存储大量文本内容',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },

  // 数字类型
  [FieldType.INT]: {
    type: FieldType.INT,
    label: '整数',
    category: FieldCategory.NUMBER,
    description: '32位整数类型',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.BIGINT]: {
    type: FieldType.BIGINT,
    label: '长整数',
    category: FieldCategory.NUMBER,
    description: '64位长整数类型',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.DECIMAL]: {
    type: FieldType.DECIMAL,
    label: '精确小数',
    category: FieldCategory.NUMBER,
    description: '精确小数类型，适合存储货币等需要精确计算的数值',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: false,
      precision: true,
      scale: true,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.FLOAT]: {
    type: FieldType.FLOAT,
    label: '浮点数',
    category: FieldCategory.NUMBER,
    description: '单精度浮点数类型',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: false,
      precision: true,
      scale: true,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.DOUBLE]: {
    type: FieldType.DOUBLE,
    label: '双精度浮点数',
    category: FieldCategory.NUMBER,
    description: '双精度浮点数类型',
    config: {
      nullable: true,
      unique: true,
      primary: true,
      default: true,
      length: false,
      precision: true,
      scale: true,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },

  // 日期时间类型
  [FieldType.DATE]: {
    type: FieldType.DATE,
    label: '日期',
    category: FieldCategory.DATETIME,
    description: '日期类型，只存储年月日',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.DATETIME]: {
    type: FieldType.DATETIME,
    label: '日期时间',
    category: FieldCategory.DATETIME,
    description: '日期时间类型，存储年月日时分秒',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.TIMESTAMP]: {
    type: FieldType.TIMESTAMP,
    label: '时间戳',
    category: FieldCategory.DATETIME,
    description: '时间戳类型，存储Unix时间戳',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.TIME]: {
    type: FieldType.TIME,
    label: '时间',
    category: FieldCategory.DATETIME,
    description: '时间类型，只存储时分秒',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },

  // 布尔类型
  [FieldType.BOOLEAN]: {
    type: FieldType.BOOLEAN,
    label: '布尔值',
    category: FieldCategory.BOOLEAN,
    description: '布尔类型，存储true/false值',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },

  // 二进制类型
  [FieldType.BLOB]: {
    type: FieldType.BLOB,
    label: '二进制大对象',
    category: FieldCategory.BINARY,
    description: '二进制大对象类型，适合存储二进制数据',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: false,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.LONGBLOB]: {
    type: FieldType.LONGBLOB,
    label: '长二进制大对象',
    category: FieldCategory.BINARY,
    description: '长二进制大对象类型，适合存储大量二进制数据',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: false,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },

  // ADB 扩展类型
  [FieldType.ADB_MEDIA]: {
    type: FieldType.ADB_MEDIA,
    label: 'ADB 媒体文件',
    category: FieldCategory.ADB_EXTEND,
    description: 'ADB扩展的媒体文件类型，支持图片、视频、音频等',
    config: {
      nullable: true,
      unique: false,
      primary: false,
      default: false,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: true,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.ADB_ENUM]: {
    type: FieldType.ADB_ENUM,
    label: 'ADB 枚举',
    category: FieldCategory.ADB_EXTEND,
    description: 'ADB扩展的枚举类型，支持多选模式',
    config: {
      nullable: true,
      unique: true,
      primary: false,
      default: true,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: true,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.ADB_AUTO_INCREMENT_ID]: {
    type: FieldType.ADB_AUTO_INCREMENT_ID,
    label: 'ADB 自增ID',
    category: FieldCategory.ADB_EXTEND,
    description: 'ADB扩展的自增ID类型，自动递增的整数主键',
    config: {
      nullable: false,
      unique: false,
      primary: false, // ID类型不显示主键选项，因为自动设置为主键
      default: false,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: true,
      guidIdConfig: false,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.ADB_GUID_ID]: {
    type: FieldType.ADB_GUID_ID,
    label: 'ADB GUID ID',
    category: FieldCategory.ADB_EXTEND,
    description: 'ADB扩展的GUID ID类型，全局唯一标识符',
    config: {
      nullable: false,
      unique: false,
      primary: false, // ID类型不显示主键选项，因为自动设置为主键
      default: false,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: true,
      snowflakeIdConfig: false,
    },
  },
  [FieldType.ADB_SNOWFLAKE_ID]: {
    type: FieldType.ADB_SNOWFLAKE_ID,
    label: 'ADB 雪花ID',
    category: FieldCategory.ADB_EXTEND,
    description: 'ADB扩展的雪花ID类型，分布式唯一标识符',
    config: {
      nullable: false,
      unique: false,
      primary: false, // ID类型不显示主键选项，因为自动设置为主键
      default: false,
      length: false,
      precision: false,
      scale: false,
      mediaConfig: false,
      enumConfig: false,
      autoIncrementIdConfig: false,
      guidIdConfig: false,
      snowflakeIdConfig: true,
    },
  },
};

// 默认值选项
export interface DefaultValueOption {
  value: string;
  label: string;
  description?: string;
}

// 获取字段类型信息
export function getFieldTypeInfo(type: FieldType): FieldTypeInfo {
  return FIELD_TYPE_CONFIGS[type];
}

// 获取字段类型配置
export function getFieldTypeConfig(type: FieldType): FieldConfig {
  return FIELD_TYPE_CONFIGS[type].config;
}

// 检查配置项是否应该显示
export function shouldShowConfig(type: FieldType, configKey: keyof FieldConfig): boolean {
  const config = getFieldTypeConfig(type);
  return config[configKey];
}

// 获取所有字段类型
export function getAllFieldTypes(): FieldTypeInfo[] {
  return Object.values(FIELD_TYPE_CONFIGS);
}

// 根据分类获取字段类型
export function getFieldTypesByCategory(category: FieldCategory): FieldTypeInfo[] {
  return getAllFieldTypes().filter(type => type.category === category);
}

// 获取TypeORM原生类型
export function getTypeORMNativeTypes(): FieldTypeInfo[] {
  return getAllFieldTypes().filter(type => type.category !== FieldCategory.ADB_EXTEND);
}

// 获取ADB扩展类型
export function getADBExtendTypes(): FieldTypeInfo[] {
  return getAllFieldTypes().filter(type => type.category === FieldCategory.ADB_EXTEND);
}

// 获取日期时间类型的默认值选项
export function getDateTimeDefaultValueOptions(): DefaultValueOption[] {
  return [
    { value: '', label: '空值', description: '不设置默认值' },
    { value: 'CURRENT_DATE', label: '当前日期', description: '自动设置为当前日期 (YYYY-MM-DD)' },
    { value: 'CURRENT_TIME', label: '当前时间', description: '自动设置为当前时间 (HH:MM:SS)' },
    { value: 'CURRENT_TIMESTAMP', label: '当前时间戳', description: '自动设置为当前日期时间 (YYYY-MM-DD HH:MM:SS)' },
    { value: 'NOW()', label: 'NOW()', description: 'MySQL函数，获取当前日期时间' },
    { value: 'GETDATE()', label: 'GETDATE()', description: 'SQL Server函数，获取当前日期时间' },
    { value: 'SYSDATE', label: 'SYSDATE', description: 'Oracle函数，获取当前日期时间' },
  ];
}

// 获取布尔类型的默认值选项
export function getBooleanDefaultValueOptions(): DefaultValueOption[] {
  return [
    { value: '', label: '空值', description: '不设置默认值' },
    { value: 'true', label: '真 (true)', description: '默认值为true' },
    { value: 'false', label: '假 (false)', description: '默认值为false' },
  ];
}

// 根据字段类型获取默认值选项
export function getDefaultValueOptions(type: FieldType): DefaultValueOption[] | null {
  const fieldInfo = getFieldTypeInfo(type);
  
  switch (fieldInfo.category) {
    case FieldCategory.DATETIME:
      return getDateTimeDefaultValueOptionsByType(type);
    case FieldCategory.BOOLEAN:
      return getBooleanDefaultValueOptions();
    case FieldCategory.STRING:
    case FieldCategory.NUMBER:
      return [
        { value: '', label: '空值', description: '不设置默认值' },
      ];
    default:
      return null;
  }
}

// 根据具体日期时间类型获取默认值选项
export function getDateTimeDefaultValueOptionsByType(type: FieldType): DefaultValueOption[] {
  switch (type) {
    case FieldType.DATE:
      return [
        { value: '', label: '空值', description: '不设置默认值' },
        { value: 'CURRENT_DATE', label: '当前日期', description: '自动设置为当前日期 (YYYY-MM-DD)' },
        { value: 'CURDATE()', label: 'CURDATE()', description: 'MySQL函数，获取当前日期' },
        { value: 'GETDATE()', label: 'GETDATE()', description: 'SQL Server函数，获取当前日期' },
        { value: 'SYSDATE', label: 'SYSDATE', description: 'Oracle函数，获取当前日期' },
      ];
    case FieldType.TIME:
      return [
        { value: '', label: '空值', description: '不设置默认值' },
        { value: 'CURRENT_TIME', label: '当前时间', description: '自动设置为当前时间 (HH:MM:SS)' },
        { value: 'CURTIME()', label: 'CURTIME()', description: 'MySQL函数，获取当前时间' },
        { value: 'GETDATE()', label: 'GETDATE()', description: 'SQL Server函数，获取当前时间' },
        { value: 'SYSDATE', label: 'SYSDATE', description: 'Oracle函数，获取当前时间' },
      ];
    case FieldType.DATETIME:
    case FieldType.TIMESTAMP:
      return [
        { value: '', label: '空值', description: '不设置默认值' },
        { value: 'CURRENT_TIMESTAMP', label: '当前时间戳', description: '自动设置为当前日期时间 (YYYY-MM-DD HH:MM:SS)' },
        { value: 'NOW()', label: 'NOW()', description: 'MySQL函数，获取当前日期时间' },
        { value: 'GETDATE()', label: 'GETDATE()', description: 'SQL Server函数，获取当前日期时间' },
        { value: 'SYSDATE', label: 'SYSDATE', description: 'Oracle函数，获取当前日期时间' },
        { value: 'CURRENT_TIMESTAMP()', label: 'CURRENT_TIMESTAMP()', description: 'MySQL函数，获取当前时间戳' },
      ];
    default:
      return getDateTimeDefaultValueOptions();
  }
}

// 检查字段类型是否适合作为主键
export function isSuitableForPrimaryKey(type: FieldType): boolean {
  const config = getFieldTypeConfig(type);
  return config.primary;
}

// 检查字段类型是否支持唯一约束
export function supportsUniqueConstraint(type: FieldType): boolean {
  const config = getFieldTypeConfig(type);
  return config.unique;
}

// 检查字段类型是否支持默认值
export function supportsDefaultValue(type: FieldType): boolean {
  const config = getFieldTypeConfig(type);
  return config.default;
}

// 检查字段类型是否需要长度配置
export function requiresLengthConfig(type: FieldType): boolean {
  const config = getFieldTypeConfig(type);
  return config.length;
}

// 检查字段类型是否需要精度配置
export function requiresPrecisionConfig(type: FieldType): boolean {
  const config = getFieldTypeConfig(type);
  return config.precision;
}

// 检查字段类型是否需要小数位配置
export function requiresScaleConfig(type: FieldType): boolean {
  const config = getFieldTypeConfig(type);
  return config.scale;
}

// 检查字段类型是否为ADB扩展类型
export function isADBExtendType(type: FieldType): boolean {
  const fieldInfo = getFieldTypeInfo(type);
  return fieldInfo.category === FieldCategory.ADB_EXTEND;
}

// 检查字段类型是否为ID类型
export function isIDType(type: FieldType): boolean {
  return [
    FieldType.ADB_AUTO_INCREMENT_ID,
    FieldType.ADB_GUID_ID,
    FieldType.ADB_SNOWFLAKE_ID,
  ].includes(type);
}

// 获取字段类型的智能提示
export function getFieldTypeHint(type: FieldType): string {
  const fieldInfo = getFieldTypeInfo(type);
  
  if (isIDType(type)) {
    return '此类型自动设置为主键，无需额外配置';
  }
  
  // if (fieldInfo.category === FieldCategory.DATETIME) {
  //   return '建议使用当前时间作为默认值';
  // }
  
  if (fieldInfo.category === FieldCategory.BINARY) {
    return '此类型不适合设置默认值';
  }
  
  if (fieldInfo.category === FieldCategory.ADB_EXTEND && type === FieldType.ADB_MEDIA) {
    return '此类型不适合设置唯一约束和默认值';
  }
  
  return '';
}

// 验证字段配置的合理性
export function validateFieldConfig(type: FieldType, config: Partial<FieldConfig>): string[] {
  const errors: string[] = [];
  const fieldConfig = getFieldTypeConfig(type);
  
  // 检查ID类型的特殊规则
  if (isIDType(type)) {
    if (config.nullable !== false) {
      errors.push('ID类型不能为空');
    }
    if (config.unique !== false) {
      errors.push('ID类型天然唯一，无需设置唯一约束');
    }
    if (config.default !== false) {
      errors.push('ID类型自动生成，无需设置默认值');
    }
  }
  
  // 检查长度配置
  if (config.length && !fieldConfig.length) {
    errors.push('此类型不支持长度配置');
  }
  
  // 检查精度配置
  if (config.precision && !fieldConfig.precision) {
    errors.push('此类型不支持精度配置');
  }
  
  // 检查小数位配置
  if (config.scale && !fieldConfig.scale) {
    errors.push('此类型不支持小数位配置');
  }
  
  return errors;
}
