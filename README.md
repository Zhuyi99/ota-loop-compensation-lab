# OTA 环路补偿实验室

一个基于浏览器的 Type II / Type III OTA 环路补偿交互工具。拖动 R、C 与 gm 参数后，补偿器波特图、零极点位置、完整环路响应和稳定裕量会实时更新。

## 功能

- Type II 与 Type III OTA 的精确复数传递函数计算
- 标准控制工程相位与 SLVA662 文档相位切换
- 当前/基准曲线叠加，以及零极点来源标记
- 可编辑的功率级 DC 增益、一阶零极点和带 Q 的二阶零极点
- 完整环路交越频率、相位裕量和增益裕量
- 参数本地保存、响应式布局和 GitHub Pages 静态部署

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
pnpm install
pnpm dev
```

浏览器访问终端显示的本地地址。

## 验证与构建

```bash
pnpm test
pnpm build
pnpm preview
```

生产文件输出在 `dist/`。Vite 使用相对资源路径，因此构建结果既可本地静态托管，也可部署到 GitHub Pages。

## GitHub Pages

仓库内已包含 `.github/workflows/deploy-pages.yml`。将项目推送到 GitHub 后，在仓库 Settings → Pages 中选择 **GitHub Actions** 作为来源；后续推送到 `main` 会自动构建并发布。

## 模型范围

补偿器模型依据 Texas Instruments 应用报告 *Demystifying Type II and Type III Compensators Using Op-Amp and OTA for DC/DC Converters*（SLVA662）的式 (12) 和式 (42)。

当前版本采用理想小信号模型，不包含 OTA 输出限幅、输出电阻、器件容差、温漂、寄生参数或蒙特卡洛分析。功率级演示预设仅用于展示交互能力，并非附件中的设计参数。

## 开源组件

项目使用 React、Vite、Plotly.js 与 react-plotly.js。许可证信息见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
