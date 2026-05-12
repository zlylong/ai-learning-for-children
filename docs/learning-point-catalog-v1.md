# LearningPointCatalog v1

`data/learning-points` 保存系统可直接读取的标准学习要点文件。用于 `agent: learning` 生成和维护小学一至六年级语文、数学、英语知识点，并供 H5/API 在无数据库或无孩子错题记录时实时读取。

## 文件布局

```text
data/learning-points/
  manifest.json
  g01/ ... g06/
    chinese.default.json
    math.default.json
    english.default.json
```

当前已覆盖 `g01` 到 `g06` 的默认文件；教材版本文件命名为 `{subject}.{version}.json`，如 `math.人教版.json`。系统会优先查请求版本，找不到时回退 `default`。

## 读取 API

- `GET /api/learning-points?grade=G01&subject=math&version=default`：返回完整 catalog。
- `GET /api/learning-points?grade=一年级&subject=数学&view=points`：返回扁平知识点列表。
- `GET /api/children/[id]/knowledge-points?subject=math`：优先返回孩子的学习状态；如果孩子暂无 `ChildKnowledgePoint`，回退读取该孩子年级/教材版本对应的标准学习要点。
- `GET /api/children/[id]/knowledge-points?grade=三年级&subject=math`：H5 知识点练习使用的年级覆盖模式，按指定年级读取标准学习要点，并尽量按 `knowledgePointId`/`knowledgePointText` 合并孩子已有掌握状态。

## agent: learning 输出要求

生成文件时必须只输出合法 JSON，并满足 `src/features/learning-points/schema.ts` 的 Zod 约束：

1. `schemaVersion` 固定为 `learning-point-catalog/v1`。
2. `subject.code` 只能是 `chinese`、`math`、`english`。
3. `grade.code` 只能是 `G01` 到 `G06`。
4. `id` 使用稳定格式：`kp_{subject}_{grade}_{chapterOrder}_{pointOrder}`，例如 `kp_math_g03_001_001`。
5. 每个知识点必须包含 `summary`、`objectives`、`commonMistakes`、`explanation`、`examples`、`masteryCriteria`、`practiceProfile`。
6. `explanation` 用于 H5 端“先理解再练习”的知识点讲解，必须包含：
   - `why`：为什么学这个知识点。
   - `howToLearn`：建议学习方法。
   - `steps`：至少 2 条可执行学习步骤。
7. `examples` 至少 1 道例题，每题必须包含 `question`、`answer`、`analysis`，并标注 `difficulty` 与 `type`。题型只能使用系统允许题型：`single_choice`、`fill_blank`、`short_answer`、`calculation`、`word_problem`、`reading_comprehension`、`sentence_making`。
8. `commonMistakes` 至少 1 条，`masteryCriteria` 至少 3 条。
9. `recommendedQuestionTypes` 只能使用系统允许题型：`single_choice`、`fill_blank`、`short_answer`、`calculation`、`word_problem`、`reading_comprehension`、`sentence_making`。

## H5 展示约定

- `GET /api/learning-points?...&view=points` 和 `GET /api/children/[id]/knowledge-points?...` 的扁平列表会保留 `explanation`、`examples`、`keyConcepts`、`commonMistakes`、`masteryCriteria`。
- `/h5/practice` 是唯一知识点练习入口：所有知识点列表会展示摘要与关键概念标签；点击推荐练习或任一知识点都会打开底部讲解弹层，完整展示摘要、为什么学、怎么学、学习步骤、关键概念、例题解析、常见错误与掌握标准，底部按钮再进入练习生成。
- `/h5/practice` 支持 `childId`、`knowledgePointId`、`knowledgePoint` 查询参数，用于孩子档案、错题卡等入口直达指定孩子/知识点；旧路径 `/h5/children/[id]/practice/new` 只保留兼容重定向，不再维护独立页面。
- 若孩子已有 `ChildKnowledgePoint` 掌握状态，API 会把状态/正确数/错题数合并进 catalog 行，但讲解和例题仍以标准 catalog 为准。

## 数据库映射建议

当前 `KnowledgePoint.id` 是数据库 cuid。批量导入时建议后续新增 `KnowledgePoint.externalId` 唯一字段，用来保存 catalog 中的稳定 `kp_*` ID，避免重复导入或同名知识点冲突。

## 当前覆盖范围

本仓库已内置 `agent: learning` 生成的小学一至六年级默认学习要点，共计 364 个：

- G01 math: 19 个知识点
- G01 chinese: 22 个知识点
- G01 english: 14 个知识点
- G02 math: 22 个知识点
- G02 chinese: 22 个知识点
- G02 english: 15 个知识点
- G03 math: 21 个知识点
- G03 chinese: 21 个知识点
- G03 english: 15 个知识点
- G04 math: 23 个知识点
- G04 chinese: 21 个知识点
- G04 english: 15 个知识点
- G05 math: 30 个知识点
- G05 chinese: 22 个知识点
- G05 english: 15 个知识点
- G06 math: 29 个知识点
- G06 chinese: 22 个知识点
- G06 english: 16 个知识点
