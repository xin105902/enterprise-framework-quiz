# 企业框架技术刷题网页

这是一个纯静态刷题网页，可以直接部署到 GitHub Pages。

## GitHub Pages 发布

1. 在 GitHub 新建一个公开仓库，例如 `enterprise-framework-quiz`。
2. 把本目录中的所有文件上传到仓库根目录：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `questions.js`
   - `.nojekyll`
3. 打开仓库的 `Settings`。
4. 进入 `Pages`。
5. `Build and deployment` 选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. 保存后等待 1-2 分钟。
7. GitHub 会生成访问地址，通常是：

```text
https://你的用户名.github.io/enterprise-framework-quiz/
```

手机打开这个网址即可使用。

## 说明

- 不需要服务器和数据库。
- 刷题记录、错题和收藏保存在浏览器本地。
- 如果换手机或清理浏览器数据，学习记录会消失。
