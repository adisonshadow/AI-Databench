// AIDatabench Dark 主题配置
import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 主要颜色
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // 背景色
    colorBgContainer: '#1f1f1f',
    colorBgElevated: '#262626',
    colorBgLayout: '#141414',
    colorBgSpotlight: '#262626',
    
    // 边框和分割线
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
    colorSplit: '#303030',
    
    // 文字颜色
    colorText: '#ffffff',
    colorTextSecondary: '#a6a6a6',
    colorTextTertiary: '#8c8c8c',
    colorTextQuaternary: '#5c5c5c',
    colorTextPlaceholder: '#5c5c5c',
    
    // 边框圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    
    // 字体
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,
    
    // 线高
    lineHeight: 1.5,
    lineHeightLG: 1.5,
    lineHeightSM: 1.5,
    
    // 阴影
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Layout: {
      bodyBg: '#141414',
      headerBg: '#1f1f1f',
      siderBg: '#1f1f1f',
      triggerBg: '#262626',
      triggerColor: '#ffffff',
    },
    Card: {
      colorBgContainer: '#1f1f1f',
      colorBorderSecondary: '#303030',
      headerBg: '#262626',
    },
    Input: {
      colorBgContainer: '#262626',
      colorBorder: '#434343',
      colorText: '#ffffff',
      colorTextPlaceholder: '#8c8c8c',
      activeBorderColor: '#1890ff',
      hoverBorderColor: '#40a9ff',
    },
    Button: {
      defaultBg: '#262626',
      defaultBorderColor: '#434343',
      defaultColor: '#ffffff',
      defaultHoverBg: '#434343',
      defaultHoverBorderColor: '#1890ff',
      defaultHoverColor: '#ffffff',
      defaultActiveBg: '#1f1f1f',
      defaultActiveBorderColor: '#1890ff',
      defaultActiveColor: '#ffffff',
    },
    Modal: {
      contentBg: '#1f1f1f',
      headerBg: '#262626',
      titleColor: '#ffffff',
    },
    Table: {
      headerBg: '#262626',
      headerColor: '#ffffff',
      bodySortBg: '#1f1f1f',
      rowHoverBg: '#262626',
    },
    Form: {
      labelColor: '#ffffff',
      labelRequiredMarkColor: '#ff4d4f',
    },
    Select: {
      colorBgContainer: '#262626',
      colorBorder: '#434343',
      colorText: '#ffffff',
      optionSelectedBg: '#1890ff',
      optionActiveBg: '#262626',
    },
    DatePicker: {
      colorBgContainer: '#262626',
      colorBorder: '#434343',
      colorText: '#ffffff',
    },
    Menu: {
      darkItemBg: '#1f1f1f',
      darkSubMenuItemBg: '#1f1f1f',
      darkItemSelectedBg: '#1890ff',
      darkItemHoverBg: '#262626',
      darkItemColor: '#ffffff',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverColor: '#ffffff',
    },
    Breadcrumb: {
      itemColor: '#8c8c8c',
      lastItemColor: '#ffffff',
      linkColor: '#1890ff',
      linkHoverColor: '#40a9ff',
      separatorColor: '#5c5c5c',
    },
    Typography: {
      titleMarginBottom: '0.5em',
      titleMarginTop: '1.2em',
    },
    Divider: {
      colorSplit: '#303030',
    },
    Empty: {
      colorTextDescription: '#8c8c8c',
    },
    Alert: {
      colorInfoBg: '#111b26',
      colorInfoBorder: '#153450',
      colorSuccessBg: '#162312',
      colorSuccessBorder: '#274916',
      colorWarningBg: '#2b2111',
      colorWarningBorder: '#594214',
      colorErrorBg: '#2a1215',
      colorErrorBorder: '#58181c',
    },
    Tag: {
      defaultBg: '#262626',
      defaultColor: '#ffffff',
    },
    Tooltip: {
      colorBgSpotlight: '#262626',
      colorTextLightSolid: '#ffffff',
    },
    Popconfirm: {
      colorBgElevated: '#262626',
      colorText: '#ffffff',
    },
    Drawer: {
      colorBgElevated: '#1f1f1f',
      colorText: '#ffffff',
    },
    Tabs: {
      cardBg: '#262626',
      itemColor: '#8c8c8c',
      itemSelectedColor: '#1890ff',
      itemHoverColor: '#40a9ff',
      inkBarColor: '#1890ff',
    },
    Collapse: {
      headerBg: '#262626',
      contentBg: '#1f1f1f',
    },
    Radio: {
      buttonBg: '#262626',
      colorBorder: '#434343',
    },
    Checkbox: {
      colorBorder: '#434343',
    },
    Switch: {
      colorPrimary: '#1890ff',
      colorPrimaryHover: '#40a9ff',
    },
    Slider: {
      trackBg: '#1890ff',
      trackHoverBg: '#40a9ff',
      railBg: '#434343',
      railHoverBg: '#5c5c5c',
    },
    Progress: {
      defaultColor: '#1890ff',
      remainingColor: '#434343',
    },
    Spin: {
      colorPrimary: '#1890ff',
    },
    Anchor: {
      colorText: '#8c8c8c',
    },
    BackTop: {
      colorBgElevated: '#262626',
      colorText: '#ffffff',
    },
  },
};

export default darkTheme;