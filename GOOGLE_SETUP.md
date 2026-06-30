# 团队共享备注和编辑 — Google 表格方案（无需 Vercel）

**员工不需要任何编程或技术操作。** 只需打开网站、输入访问码即可。  
**只需一个人（管理员）做一次约 15 分钟的设置。**

---

## 原理

- 网站仍放在 GitHub Pages（现在的链接）
- 备注和描述修改保存在 **Google 表格**（云端）
- 所有员工、所有浏览器看到的都是同一份数据
- 管理员还可以直接在 Google 表格里查看所有备注

---

## 管理员一次性设置（约 15 分钟）

### 第 1 步：创建 Google 表格

1. 打开 [Google Sheets](https://sheets.google.com)，新建空白表格
2. 命名为：`CPS Referral Staff Notes`
3. 创建两个工作表（底部标签页），分别命名为：
   - `Comments`
   - `Descriptions`

4. 在 **Comments** 第一行输入表头：

   | created_at | provider_id | author_name | body |
   |------------|-------------|-------------|------|

5. 在 **Descriptions** 第一行输入表头：

   | provider_id | description | updated_by | updated_at |
   |-------------|-------------|------------|------------|

### 第 2 步：添加 Apps Script

1. 在表格中点击 **扩展程序 → Apps Script**
2. 删除默认代码，打开本仓库文件 `scripts/google-apps-script.gs`，**全部复制粘贴**进去
3. 修改文件顶部的两个密码（发给员工用）：
   ```javascript
   const STAFF_PASSWORD = "你们自己的员工码";
   const EDITOR_PASSWORD = "你们自己的编辑码";
   ```
4. 点击 **保存**（项目可命名为 `CPS Referral API`）

### 第 3 步：部署为 Web 应用

1. 点击右上角 **部署 → 新建部署**
2. 类型选择 **Web 应用**
3. 设置：
   - 说明：CPS Referral API
   - 执行身份：**我**
   - 访问权限：**任何人**（这样网站才能连接，员工仍需要访问码才能写入）
4. 点击 **部署**，按提示授权 Google 账号
5. **复制 Web 应用 URL**（形如 `https://script.google.com/macros/s/...../exec`）

### 第 4 步：连接到网站

**重要：** 线上网站是从 **`gh-pages` 分支** 发布的，不是 `main`。  
请编辑 **`gh-pages` 分支** 里的 `assets/config.js`（路径与 `docs/assets/config.js` 相同内容）：

```javascript
window.APP_CONFIG = {
  googleScriptUrl: "粘贴上一步复制的 URL",
  apiBase: "",
};
```

在 GitHub 网页上：切换到 **`gh-pages` 分支** → 打开 `assets/config.js` → 编辑 → Commit。

保存后等待 1–2 分钟，然后 **强制刷新** 网页（Ctrl+Shift+R 或 Cmd+Shift+R）。

---

## 员工日常使用（零技术）

1. 打开：**https://qishi0314-hash.github.io/Referral/**
2. 点击 **Staff login**，输入管理员发给他们的访问码
3. 搜索 provider → 点击卡片
4. **员工码**：可添加备注（所有人可见）
5. **编辑码**：还可点击 Description 旁的 **Edit** 修改描述

换电脑、换浏览器、同事之间都会看到相同内容。

---

## 访问码说明

| 访问码 | 谁能拿到 | 能做什么 |
|--------|----------|----------|
| 员工码 | 所有 CPS staff | 添加 staff 备注 |
| 编辑码 | 负责人 / 少数管理员 | 修改描述 + 添加备注 |

密码只保存在 Google Apps Script 里（不在公开网页代码中）。

---

## 在 Google 表格里查看备注

打开 `CPS Referral Staff Notes` 表格 → **Comments** 标签页，可看到所有备注记录，方便备份或导出。

---

## 常见问题

**Q: 员工需要 Google 账号吗？**  
A: 不需要。只有设置表格的管理员需要 Google 账号。

**Q: 还需要 Vercel 吗？**  
A: 不需要。Google 表格就是云端数据库。

**Q: 数据安全吗？**  
A: 表格可设为仅管理员可编辑；网站通过访问码控制谁能写入。不要把编辑码发给所有员工。

**Q: 修改 config.js 后没生效？**  
A: 等 1–2 分钟，然后强制刷新页面（Ctrl+Shift+R）。
