# 自定义 Learning Points 生成指南

本目录保存 AI 学习助手可直接读取的标准知识点包（LearningPointCatalog v1）。如果你想使用自己的教材版本、校本课程、补充专题或重新生成某个年级/学科的知识点，请按本文生成 JSON 文件并注册到 `manifest.json`。

## 1. 目录结构

```text
data/learning-points/
  manifest.json                 # 知识点包索引
  g01/ ... g09/                 # 年级目录：G01=一年级，G09=九年级
    math.default.json           # 数学默认版本
    chinese.default.json        # 语文默认版本
    english.default.json        # 英语默认版本
    math.人教版.json            # 示例：自定义教材版本
```

系统读取规则：

1. 根据 `grade + subject + version` 从 `manifest.json` 找文件。
2. 如果指定版本不存在，会回退同年级/同学科的 `default`。
3. H5 练习入口和 API 会直接使用这些 JSON 中的讲解、例题、常见错误、掌握标准和教学标签。

## 2. 支持的年级、学科和标签

年级代码：

- `G01` 一年级
- `G02` 二年级
- `G03` 三年级
- `G04` 四年级
- `G05` 五年级
- `G06` 六年级
- `G07` 七年级 / 初一
- `G08` 八年级 / 初二
- `G09` 九年级 / 初三

学科代码：

- `math` 数学
- `chinese` 语文
- `english` 英语

教学标签 `teachingTags` 可选值：

- `基础`：基础必会知识点
- `易错`：孩子经常出错、容易混淆
- `拔高`：拓展、综合、挑战类内容
- `常考`：考试或阶段测评高频内容

如果不写 `teachingTags`，系统会根据 `level`、`tags` 和常见错误数量自动派生基础标签；但建议自定义内容包显式填写，方便家长模式按标签过滤。

## 3. 单个 catalog 文件必须长什么样

每个 JSON 文件是一个完整 catalog，最外层结构如下：

```json
{
  "schemaVersion": "learning-point-catalog/v1",
  "catalogVersion": "2026.05.my-school-v1",
  "subject": { "code": "math", "name": "数学" },
  "grade": { "code": "G03", "name": "三年级" },
  "semester": "all",
  "textbook": {
    "version": "人教版",
    "name": "人教版三年级数学",
    "publisher": "人民教育出版社"
  },
  "generatedBy": {
    "agent": "learning",
    "promptVersion": "custom-v1"
  },
  "chapters": [],
  "updatedAt": "2026-05-13T00:00:00.000Z"
}
```

关键约束：

- `schemaVersion` 固定为 `learning-point-catalog/v1`。
- `generatedBy.agent` 固定为 `learning`。
- `semester` 可用 `1`、`2`、`all`。
- `chapters` 至少 1 个章节。
- 每个知识点必须包含讲解 `explanation` 和至少 1 道可直接给孩子做的例题 `examples`。

## 4. ID 命名规则

章节 ID：

```text
ch_{subject}_{gradeLower}_{chapterOrder3}
```

知识点 ID：

```text
kp_{subject}_{gradeLower}_{chapterOrder3}_{pointOrder3}
```

示例：

- `ch_math_g03_001`：三年级数学第 1 个章节
- `kp_math_g03_001_001`：三年级数学第 1 章第 1 个知识点
- `kp_chinese_g05_002_003`：五年级语文第 2 章第 3 个知识点

注意：ID 必须稳定。后续孩子练习记录、错题和掌握状态会依赖这些 ID 合并进度，不建议频繁改名或重排。

## 5. 知识点字段模板

一个知识点建议按下面结构生成：

```json
{
  "id": "kp_math_g03_001_001",
  "title": "万以内数的认识",
  "order": 1,
  "level": "foundation",
  "status": "active",
  "summary": "理解万以内数的组成、读写和大小比较，为后续多位数运算打基础。",
  "aliases": ["万以内数", "四位数认识"],
  "objectives": {
    "remember": ["记住个、十、百、千、万的数位顺序"],
    "understand": ["理解每个数位上的数字表示几个对应计数单位"],
    "apply": ["能读写万以内的数，并比较两个数的大小"]
  },
  "keyConcepts": ["数位", "计数单位", "读写数", "大小比较"],
  "prerequisites": ["百以内数的认识"],
  "relatedPoints": ["多位数加减法"],
  "commonMistakes": [
    {
      "type": "place_value_confusion",
      "description": "把数位和计数单位混淆，例如把 3050 读成三百五十。",
      "remediation": "先画数位表，把每个数字放到对应数位，再按数位读写。"
    }
  ],
  "explanation": {
    "why": "万以内数的认识能帮助孩子看懂更大的数量，是多位数加减法和生活计数的基础。",
    "howToLearn": "先用数位表拆数，再练习读数、写数和比较大小，最后回到生活数量中应用。",
    "steps": [
      "把数字从右往左依次放入个、十、百、千、万位。",
      "说出每个数位上的数字表示几个对应计数单位。",
      "读数或写数后，用数位表检查是否漏读 0 或多写 0。"
    ]
  },
  "examples": [
    {
      "question": "填空：3050 是由（ ）个千和（ ）个十组成的，读作（ ）。",
      "answer": "3，5，三千零五十。",
      "analysis": "3050 的千位是 3，表示 3 个千；十位是 5，表示 5 个十；百位和个位是 0，读数时中间有 0 要读“零”。",
      "difficulty": "easy",
      "type": "fill_blank"
    }
  ],
  "masteryCriteria": [
    "能正确读写万以内的数",
    "能说清每个数位上的数字含义",
    "能比较两个万以内数的大小并说明理由"
  ],
  "practiceProfile": {
    "recommendedQuestionTypes": ["single_choice", "fill_blank"],
    "difficultyRange": ["easy", "medium"],
    "minCorrectRateForMastery": 0.85
  },
  "tags": ["数与运算", "高频"],
  "teachingTags": ["基础", "常考"]
}
```

## 6. 内容质量要求

请不要只生成“看起来符合格式”的占位内容。H5 会直接把这些内容展示给孩子和家长，所以必须可读、可教、可练。

合格内容必须满足：

- `summary`：一句话说明这个知识点学什么、解决什么问题。
- `objectives`：分别写“记住 / 理解 / 应用”的可观察目标。
- `commonMistakes`：写真实容易错的点，并给出可执行订正方法。
- `explanation.why`：说明为什么要学，不要只重复标题。
- `explanation.howToLearn`：说明怎么学，不能写空泛鼓励语。
- `explanation.steps`：至少 2 条具体步骤，孩子照着能做。
- `examples.question`：必须是完整题干，可以直接作答。
- `examples.answer`：必须有明确答案。
- `examples.analysis`：必须能复盘思路。
- `masteryCriteria`：至少 3 条，描述达到什么程度算掌握。

不合格示例：

```json
{
  "question": "遇到一道关于分数的题，请认真思考。",
  "answer": "略",
  "analysis": "根据题意解答。"
}
```

合格示例：

```json
{
  "question": "把 3/4 和 5/8 通分后比较大小，哪个更大？",
  "answer": "3/4 更大。",
  "analysis": "3/4=6/8，6/8 大于 5/8，所以 3/4 更大。"
}
```

## 7. 推荐的 AI 生成提示词

你可以把下面提示词发给任意大模型生成自己的知识点包。建议一次只生成一个年级、一个学科、一个版本，便于检查和修正。

```text
你是一个中小学课程教研专家和结构化数据生成器。请为【三年级】【数学】【人教版】生成 LearningPointCatalog v1 JSON。

严格要求：
1. 只输出合法 JSON，不要输出 Markdown，不要解释。
2. schemaVersion 固定为 "learning-point-catalog/v1"。
3. subject.code 使用 "math"，grade.code 使用 "G03"。
4. generatedBy.agent 固定为 "learning"。
5. 章节 ID 格式：ch_math_g03_001、ch_math_g03_002 ...
6. 知识点 ID 格式：kp_math_g03_001_001、kp_math_g03_001_002 ...
7. 每个知识点必须包含：title、summary、order、level、status、aliases、objectives、keyConcepts、prerequisites、relatedPoints、commonMistakes、explanation、examples、masteryCriteria、practiceProfile、tags、teachingTags。
8. teachingTags 只能从 "基础"、"易错"、"拔高"、"常考" 中选择。
9. explanation 必须包含 why、howToLearn、steps，steps 至少 2 条。
10. examples 至少 1 道题，每题必须有可直接作答的 question、明确 answer、可复盘 analysis、difficulty、type。
11. 禁止生成占位题干，例如“读一段短文”“遇到一道关于……的题”“略”。
12. 数学题必须给出明确数字、条件、问题和计算/推理过程。
13. commonMistakes 至少 1 条，masteryCriteria 至少 3 条。
14. practiceProfile.recommendedQuestionTypes 只能使用 single_choice、fill_blank、short_answer、calculation、word_problem、reading_comprehension、sentence_making。
15. difficultyRange 只能使用 easy、medium、hard。
16. minCorrectRateForMastery 使用 0.8 到 0.9 之间的小数。

请覆盖该年级该学科的核心教材知识点，章节数量和知识点数量要适合真实教学使用，避免过少或过度拆分。
```

语文生成时，把 `subject.code` 改成 `chinese`，并要求例题提供具体字词、句子、短文或表达任务。

英语生成时，把 `subject.code` 改成 `english`，并要求例题提供具体单词、句型、语法填空、造句或对话场景。

## 8. 安装自己的知识点包

有两种方式。

### 方式 A：管理员页面上传

1. 登录管理员账号。
2. 进入 `我的 → 知识点包管理`。
3. 粘贴完整 catalog JSON。
4. 勾选“允许替换同年级/学科/版本的已有知识点包”。
5. 点击“上传并校验”。

上传成功后，系统会：

- 校验 JSON 是否符合 LearningPointCatalog v1。
- 写入 `data/learning-points/gXX/{subject}.{version}.json`。
- 更新 `data/learning-points/manifest.json`。

### 方式 B：手动提交文件

1. 把 JSON 文件放入对应年级目录，例如：

```text
data/learning-points/g03/math.人教版.json
```

2. 在 `manifest.json` 的 `files` 中加入索引：

```json
{
  "grade": "G03",
  "subject": "math",
  "version": "人教版",
  "path": "g03/math.人教版.json"
}
```

3. 确保 `updatedAt` 更新为当前时间。

## 9. 本地校验命令

生成或替换知识点包后，至少运行：

```bash
npm run typecheck
npm run test -- src/features/learning-points/loader.test.ts
```

如果改动较大，建议完整执行：

```bash
npm run lint
npm run test
npm run build
```

也可以用 API 抽查：

```bash
curl 'http://127.0.0.1:8080/api/learning-points?grade=G03&subject=math&version=人教版&view=points'
```

浏览器抽查：

```text
/h5/practice?childId=你的孩子ID
```

在家长模式下切换到对应年级、学科和教学标签，点击知识点，确认弹层能看到：

- 摘要
- 为什么学
- 怎么学
- 学习步骤
- 例题题干
- 参考答案
- 解析
- 常见错误
- 掌握标准

## 10. 常见问题

### Q1：我只想覆盖某个教材版本，不想改默认版本怎么办？

新建一个非 `default` 版本文件，例如 `math.人教版.json`，并在 manifest 中登记 `version: "人教版"`。请求这个版本时会优先使用它；没请求或找不到时仍回退 `default`。

### Q2：可以只写几个补充知识点吗？

可以，但一个 catalog 文件仍要是完整合法结构，至少包含 1 个章节和 1 个知识点。若用于真实教材版本，建议覆盖该年级/学科的核心知识点，避免练习入口内容过少。

### Q3：改了知识点标题会影响历史记录吗？

系统优先按 `knowledgePointId` 合并进度，其次才按标题合并。只要 ID 稳定，标题小幅修改影响较小；如果 ID 也改了，历史错题和掌握状态可能无法自动合并。

### Q4：为什么例题要求这么具体？

因为例题会直接展示在 H5 的“先理解再练习”弹层中。孩子和家长需要看到一题就能理解怎么做，占位题干会降低练习质量，也会影响 AI 出题参考。

### Q5：上传失败一般是什么原因？

常见原因：

- JSON 不是合法格式。
- ID 不符合 `kp_{subject}_{grade}_{chapter}_{point}` 规则。
- `generatedBy.agent` 不是 `learning`。
- 少了 `explanation`、`examples`、`masteryCriteria` 或 `practiceProfile`。
- `teachingTags` 写了不支持的值。
- `examples.type` 或 `practiceProfile.recommendedQuestionTypes` 使用了不支持的题型。

更多 schema 细节见 `../../docs/learning-point-catalog-v1.md`。
