# Bilibili Ambilight (哔哩哔哩流光溢彩)

> 为哔哩哔哩（Bilibili）视频播放带来沉浸式氛围流光溢彩（Ambient Light）照明效果！

无需额外物理灯带或硬件设备，直接在您的浏览器中将视频画面的光晕自然扩展至四周，打造极致的影院级视听氛围。

---

## ✨ 核心特性

- **沉浸式流光效果**：基于 WebGL 硬件加速实时采样视频边缘色彩，将光晕柔和渲染到画面外围。
- **极简现代化 UI**：暗色石墨质感设计，纯净精练，直观易用。
- **无遮挡、不突兀**：完全适配哔哩哔哩页面布局与暗黑/明亮模式，不影响弹幕、评论区与播放器交互。
- **智能黑边规避**：支持自动检测并裁剪 21:9 宽屏及上下/左右黑边，确保光效精准贴合视频画面内容。
- **防冲突快捷键**：
  - 播放视频时，按键盘 <kbd>L</kbd> 键（Light / 流光）即可快速开关流光溢彩，与 B 站原生播放快捷键零冲突。
- **丰富个性化调节**：
  - 扩散范围（Spread）
  - 边缘模糊度（Blur）
  - 发光亮度（Brightness）
  - 对比度与色彩饱和度（Contrast / Saturation / Vibrance）
  - 最大帧率限制（30 / 60 / 无限制）与渲染分辨率配置

---

## 📥 安装与使用

### 方式一：加载已解压的扩展程序（推荐，最稳定）
1. 打开 Chrome、Edge 或基于 Chromium 的浏览器，在地址栏输入：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. 打开右上角的 **“开发者模式”**（Developer mode）开关。
3. 点击 **“加载已解压的扩展程序”**（Load unpacked），选择项目中的 `dist` 文件夹即可完成安装。

### 方式二：使用 CRX 安装包
1. 打开浏览器扩展管理页面（`chrome://extensions/`），开启 **“开发者模式”**。
2. 将 `releases/bilibili-ambilight.crx` 直接拖入扩展管理页面完成安装。

---

## 🛠️ 本地开发与构建

### 环境要求
- Node.js (推荐 LTS 版本，Node 20+)
- npm

### 快速开始
1. 克隆代码库：
   ```bash
   git clone https://github.com/woodsilence/bilibili-ambilight.git
   cd bilibili-ambilight
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 编译构建：
   ```bash
   npm run build
   ```
   构建输出生成在 `/dist` 目录中。
4. 一键打包发布（生成 `.crx` 和 `.zip`）：
   ```bash
   npm run pack
   ```
   打包文件将生成在 `/releases` 目录中。

---

## 📄 开源许可

本项目遵循 [ISC 许可证](LICENSE)。
