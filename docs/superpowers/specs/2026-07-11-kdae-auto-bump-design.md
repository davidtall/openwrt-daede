# kdae 自动更新设计

## 目标

当 `olicesx/dae:kdae` 出现新提交时，`auto-bump` workflow 必须将其视为上游更新，更新性能优化基线对应的固定 commit，并执行现有的源码组装和 SDK 编译门禁。组装 workflow 继续把固定的 `daeuniverse/dae:main` commit 合并到这个性能优化基线上。

## 更新检测与版本固定

`auto-bump.yml` 将读取 `olicesx/dae:kdae` 当前最新 commit，并保存到 `core_new`。

无更新判断将增加以下条件：`core_new` 必须与 `CORE_COMMIT` 相同。当两者不同时，检测步骤将通过 `core` output 输出新 commit，staging 步骤随后更新 `ci/pins.env` 中的 `CORE_COMMIT`。

kdae commit 的提交日期也会参与公共版本号 `DAE_VERSION` 和 `DAED_VERSION` 的计算。这样即使只有 kdae 更新，生成的版本日期也能反映所有被跟踪组件中的最新提交日期。

## 构建流程

现有镜像同步流程保持不变：

1. 强制把 `olicesx/dae:kdae` 同步到 `kenzok8/dae:kdae`。
2. assemble workflow 从 `kenzok8/dae` 获取新固定的 `CORE_COMMIT`。
3. 在临时源码目录中，把来自 `daeuniverse/dae` 的 `CORE_UPSTREAM_COMMIT` 合并到性能优化基线。
4. 继续执行现有的源码组装和 SDK 编译门禁，决定是否允许把 `auto-bump-staging` 推进到 `main`。

合并结果不会推送到任何 dae fork，只存在于组装后的源码产物中。

## 失败处理

如果更新后的 kdae 基线与固定的官方 dae commit 发生冲突，现有的 `git merge` 命令会失败。workflow 将在推进 `auto-bump-staging` 到 `main` 之前停止，因此不会改变当前正式版本。

## 验证方式

静态 workflow 检查需要确认：

- 从 `olicesx/dae` 的 `kdae` 分支查询最新 commit；
- 无更新条件会比较该 commit 与 `CORE_COMMIT`；
- detect 步骤会输出该 commit；
- staging 步骤会把该 commit 写回 `ci/pins.env`；
- kdae commit 日期参与版本号选择。

另外还会解析修改后的 YAML，检查语法错误。
