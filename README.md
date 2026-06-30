# CPS Referral Directory

大学心理咨询中心（CPS）校外转介资源搜索网站 — **可直接通过网址访问，无需本地运行。**

## 在线访问（一步开启）

代码已全部准备好。您只需在 GitHub 上**开启一次 Pages**（约 30 秒）：

1. 打开 **[仓库 Settings → Pages](https://github.com/qishi0314-hash/Referral/settings/pages)**
2. **Build and deployment → Source** 选择 **Deploy from a branch**
3. **Branch** 选 `gh-pages`，文件夹选 `/ (root)`，点击 **Save**

完成后网站地址为：

### **https://qishi0314-hash.github.io/Referral/**

无需安装任何软件，员工用浏览器直接打开即可。

### 功能

- 按保险、专长、面对面/远程、低费用等条件搜索
- 每个 provider 一条记录（已去重）
- 查看联系方式、网站、地址、治疗方式等
- 员工登录后可添加备注；设置 Google 表格同步后**全团队、所有浏览器共享**
- **编辑码**可修改 provider 描述（需开启云端同步，见下方）

---

## 团队共享备注（推荐：Google 表格，无需 Vercel）

**员工零技术操作** — 只需打开网站、输入访问码。  
**管理员一次性设置约 15 分钟** — 不需要 Vercel、不需要写代码。

详细步骤见 **[docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md)**（中文图文说明）。

简要流程：

1. 管理员创建 Google 表格，粘贴 `scripts/google-apps-script.gs` 并部署为 Web 应用
2. 把 Web 应用 URL 填入 `docs/assets/config.js` 的 `googleScriptUrl`
3. 推送到 GitHub，等 Pages 更新

之后所有 staff 在不同电脑、不同浏览器里看到的备注和描述修改都是同一份。

| 访问码 | 权限 |
|--------|------|
| 员工码 | 添加 staff 备注 |
| 编辑码 | 修改描述 + 添加备注 |

密码建议只写在 Google Apps Script 里（不要公开在网页代码中）。

---

## 备选：Vercel 完整版（需一定技术操作）

如需使用 Turso 数据库而非 Google 表格，可部署 Next.js 完整版（约 5 分钟，需会操作 Vercel）：

### 1. 创建 Turso 数据库（免费）

```bash
# 安装 Turso CLI: https://docs.turso.tech/cli
turso auth signup
turso db create fordham-referral
turso db show fordham-referral --url
turso db tokens create fordham-referral
```

### 2. 部署到 Vercel

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
2. **Import** 本仓库 `Referral`
3. 在 Environment Variables 中添加：
   - `STAFF_PASSWORD` — 员工码（仅添加备注）
   - `EDITOR_PASSWORD` — 编辑码（修改描述并保存到数据库）
   - `TURSO_DATABASE_URL` — 上一步的数据库 URL
   - `TURSO_AUTH_TOKEN` — 上一步的 token
4. 点击 **Deploy**

部署完成后会得到类似 `https://fordham-referral.vercel.app` 的网址。

### 3. 连接静态页（可选）

若希望 GitHub Pages 静态页使用 Vercel 后端，编辑 `docs/assets/config.js`：

```js
window.APP_CONFIG = {
  googleScriptUrl: "",
  apiBase: "https://your-app.vercel.app",
};
```

**大多数团队更推荐上方的 Google 表格方案**，无需 Vercel。

---

## 本地开发（可选）

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 数据更新

从更新的 spreadsheet PDF 重新导入：

```bash
pip install pypdf
npm run extract
npm run db:reset   # 仅本地 SQLite
```

## 项目结构

| 路径 | 说明 |
|------|------|
| `docs/` | GitHub Pages 静态网站（公开访问） |
| `docs/GOOGLE_SETUP.md` | Google 表格团队同步设置指南（推荐） |
| `scripts/google-apps-script.gs` | Google Apps Script 后端代码 |
| `src/` | Next.js 完整应用（可选 Vercel 部署） |
| `data/providers.seed.json` | 去重后的 provider 数据 |

## 员工使用说明

1. 打开网站，用左侧筛选器按学生保险和需求搜索
2. 点击 provider 卡片查看详情和网站链接
3. **Staff login** 输入员工码添加备注；输入编辑码可修改描述并保存
