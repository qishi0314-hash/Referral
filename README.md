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
- 员工登录后可添加备注（静态页为浏览器本地保存；完整版为团队共享）
- **编辑码**可修改 provider 描述并保存到数据库（需部署 Vercel 完整版）

---

## 完整版（员工共享备注 + 在线编辑）

如需**所有员工共享同一份备注**、在线更新 provider 状态，请部署到 Vercel（约 5 分钟）：

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

### 3. 更新静态页 API 地址（可选）

若希望 GitHub Pages 静态页也使用云端备注，编辑 `docs/assets/config.js`：

```js
window.APP_CONFIG = {
  apiBase: "https://your-app.vercel.app",
  staffPassword: "fordham-cps-staff",
};
```

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
| `src/` | Next.js 完整应用（Vercel 部署） |
| `data/providers.seed.json` | 去重后的 provider 数据 |

## 员工使用说明

1. 打开网站，用左侧筛选器按学生保险和需求搜索
2. 点击 provider 卡片查看详情和网站链接
3. **Staff login** 输入员工码添加备注；输入编辑码可修改描述并保存
