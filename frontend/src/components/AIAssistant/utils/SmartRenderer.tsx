import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { withChartCode, ChartType, Line, Bar, Pie, Column, Area, Scatter, Radar, Histogram, DualAxes } from '@antv/gpt-vis';
import type { BubbleProps } from '@ant-design/x';

// @ts-ignore
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 创建支持图表的代码块组件
const CodeBlock = withChartCode({
  components: { 
    [ChartType.Line]: Line, 
    [ChartType.Bar]: Bar, 
    [ChartType.Pie]: Pie, 
    [ChartType.Column]: Column, 
    [ChartType.Area]: Area, 
    [ChartType.Scatter]: Scatter, 
    [ChartType.Radar]: Radar, 
    [ChartType.Histogram]: Histogram, 
    [ChartType.DualAxes]: DualAxes 
  },
});

// 自定义代码块组件 - 支持图表和带header的代码高亮
const CustomCodeBlock: React.FC<any> = (props) => {
  const { children, className, node, ...rest } = props;
  const [copied, setCopied] = useState(false);
  
  // 检查是否是图表代码块
  if (className === 'language-vis-chart') {
    // console.log("🔍 GPTVis", children);
    // 直接使用 withChartCode 创建的组件来处理图表
    const ChartCodeBlock = CodeBlock as any;
    return (
      <div style={{ 
        minWidth: '600px',
        // minHeight: '600px',
        width: '100%',
        margin: '16px 0'
      }}>
        <ChartCodeBlock {...props} />
      </div>
    );
  }
  
  // 检查是否是带语言标识的代码块
  const match = /language-(\w+)/.exec(className || '');
  if (match) {
    const language = match[1];
    const codeContent = String(children).replace(/\n$/, '');
    
    // 特殊处理 adb-typeorm 和 adb-json 代码块
    const isADBCodeBlock = language === 'adb-typeorm' || language === 'adb-json';
    
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(codeContent);
        setCopied(true);
        message.success('代码已复制到剪贴板');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        message.error('复制失败');
      }
    };
    
    return (
      <div style={{ margin: '16px 0' }}>
        {/* 代码块Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: isADBCodeBlock ? '#1890ff' : '#1e1e1e',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          borderBottom: '1px solid #333',
          fontSize: '12px',
          color: isADBCodeBlock ? '#fff' : '#ccc'
        }}>
          <span style={{ 
            textTransform: 'uppercase', 
            fontWeight: '500',
            color: '#fff'
          }}>
            {isADBCodeBlock ? 'ADB TypeORM' : language}
          </span>
          <Button
            type="text"
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
            style={{
              color: copied ? '#52c41a' : '#ccc',
              padding: '4px 8px',
              height: 'auto',
              minHeight: 'auto'
            }}
          >
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
        
        {/* 代码内容 */}
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          children={codeContent}
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px'
          }}
        />
      </div>
    );
  }
  
  // 普通代码块
  return (
    <code {...rest} className={className}>
      {children}
    </code>
  );
};

// 智能渲染器 - 结合 GPTVis 和代码块渲染
export const SmartRenderer: BubbleProps['messageRender'] = (content) => {  
  return (
    <div>
      <Markdown 
        remarkPlugins={[remarkGfm]} 
        components={{ 
          code: CustomCodeBlock
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

// 导出组件供外部使用
export { CustomCodeBlock, CodeBlock };
