# Lab1：SVG 编辑器

仓库地址：[Wuyh11/lab1_Phase1_SVG](https://github.com/Wuyh11/lab1_Phase1_SVG)

这是 Lab1 第一阶段的作业，用 TypeScript 写了一个命令行 SVG 编辑器。可以创建矩形、圆、椭圆、线条和文字，也可以把图形放进分组，整体移动、缩放，或者撤销之前的操作。编辑后的图形保存为 SVG 文件，可以直接用浏览器打开。

这次作业的设计和实现用了 Codex 辅助。[项目文档](doc/README.md)记录了模块划分、设计模式、几次修改和测试情况。

## 运行

需要 Node.js 20.6 及以上版本。

```sh
git clone https://github.com/Wuyh11/lab1_Phase1_SVG.git
cd lab1_Phase1_SVG
npm ci
npm run cli
```

启动后会出现 `svg>` 提示符。输入 `help` 查看命令，按 Ctrl+D 退出。想查看本次提交的版本，可以先执行 `git checkout final`。

下面这组命令会画一个写着“开始”的蓝色矩形：

```text
init 800 600
create g node
create rect r 120 100 160 60 #4a90d9 in node
create text label 155 135 "开始" in node
set label fill white
move node 0 100
undo
tree
save demo.svg
```

`node` 把矩形和文字放在一起，移动时两者会一起移动。`undo` 撤销这次移动，最后的 `save` 会把图形写到当前目录的 `demo.svg`。

## 示例和测试

`examples/flowchart.commands` 是完整的两节点流程图示例，可以一次执行其中的命令：

```sh
npm run cli < examples/flowchart.commands
```

生成的文件是 `examples/flowchart.svg`，运行输出在 `examples/flowchart.transcript.txt`。`examples/other.svg` 则是题目给出的读取示例，其中有一个矩形没有 id，可以用来检查自动补 id 的行为。

类型检查、测试和编译分别这样运行：

```sh
npm run check
npm run build
```

目前 39 项测试通过。编译完成后也可以用 `npm start` 启动，不再从 TypeScript 源码运行。

本次提交的标签为 [`final`](https://github.com/Wuyh11/lab1_Phase1_SVG/tree/final)，仓库已公开。
