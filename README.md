# Lab1 Phase 1：SVG 编辑器（CLI）

Git 仓库地址：**https://github.com/Wuyh11/lab1_Phase1_SVG**

最终版本标签：[`final`](https://github.com/Wuyh11/lab1_Phase1_SVG/tree/final)。

本项目按照 `phase_cli_1.md` 实现：TypeScript 面向对象、六种内置图形、Composite 分组、Command 撤销重做、SVG 文件读写和交互式命令行。架构方案、过程记录、一致性自查、质量保证说明见仓库中的 [`doc/README.md`](https://github.com/Wuyh11/lab1_Phase1_SVG/blob/final/doc/README.md)。

## 安装和运行

需要 Node.js 20.6 或更高版本及 npm。

```sh
git clone git@github.com:Wuyh11/lab1_Phase1_SVG.git
cd lab1_Phase1_SVG
git checkout final
npm ci
npm run cli
```

交互提示符为 `svg>`，输入 `help` 查看所有命令，Ctrl+D 结束输入。

```text
init 800 600
create g node
create rect r 120 100 160 60 #4a90d9 in node
create text label 155 135 "开始" in node
move node 0 100
undo
tree
save demo.svg
```

## 验证和示例

```sh
npm run check
npm run build
npm start < examples/flowchart.commands
```

`npm run check` 执行严格类型检查及自动化测试，覆盖全部作业命令、失败原子性、历史边界、SVG 往返、真实 CLI 进程和架构依赖。`examples/flowchart.svg` 是实际 CLI 生成的示例，`examples/flowchart.transcript.txt` 保存回放输出；`examples/other.svg` 是作业中的外部 SVG 示例。

## 提交说明

向课程平台上传本文件 `README.md`。仓库内保留分阶段提交，并在最终提交打 `final` 标签。仓库已公开，评阅者可直接访问。
