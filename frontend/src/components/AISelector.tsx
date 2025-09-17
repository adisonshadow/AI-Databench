import React from 'react';
import { AIModelSelect, AIProvider } from 'ai-model-application-suite';
import 'ai-model-application-suite/core.css';

interface AISelectorProps {
  style?: React.CSSProperties;
  onChange?: (modelId: string) => void;
}

const AISelector: React.FC<AISelectorProps> = ({ style, onChange }) => {
  const handleModelChange = (modelId: string) => {
    if (onChange) {
      onChange(modelId);
    }
  };

  return (
    <AIModelSelect
      mode="select"
      theme="dark"
      style={{ width: 150, ...style }}
      onModelChange={handleModelChange}
      placeholder="选择AI模型"
      showAddButton={true}
      allowDelete={true}
      supportedProviders={[
        AIProvider.OPENAI,
        AIProvider.DEEPSEEK,
        AIProvider.ANTHROPIC,
        AIProvider.GOOGLE,
        AIProvider.VOLCENGINE
      ]}
    />
  );
};

export default AISelector;