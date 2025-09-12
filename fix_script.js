const fs = require('fs');

// 读取文件内容
let content = fs.readFileSync('/Users/yanfang/dev/AIDatabench/frontend/src/components/FieldsManager/index.tsx', 'utf8');

// 查找截断的位置
const truncateIndex = content.indexOf('export default FieldsManager;');
if (truncateIndex !== -1) {
  // 截取到截断位置之前
  content = content.substring(0, truncateIndex);
  
  // 添加缺失的JSX结束标记
  content += `                showIcon
                style={{ marginBottom: 16 }}
              />
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default FieldsManager;
`;
  
  // 写回文件
  fs.writeFileSync('/Users/yanfang/dev/AIDatabench/frontend/src/components/FieldsManager/index.tsx', content);
}

console.log('File fixed');
