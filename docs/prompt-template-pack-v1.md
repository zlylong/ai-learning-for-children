# PromptTemplatePack v1

提示词包让错题诊断、专项练习、月度错题卷的提示词像 Learning Points 一样可运营、可替换、可校验。

## 管理入口

管理员登录后进入：

- `/h5/profile/prompt-templates`：查看当前生效提示词包、复制内置默认包、上传自定义包。
- `GET /api/prompt-templates`：返回当前包摘要和内置默认包。
- `POST /api/prompt-templates`：上传自定义包，需要管理员权限。

自定义包保存到 `.data/prompt-templates/active.json`，不进入 Git。删除该文件会回退到内置默认提示词。

## Schema

```json
{
  "schemaVersion": "prompt-template-pack/v1",
  "packVersion": "custom-2026-05-14",
  "locale": "zh-CN",
  "templates": [
    {
      "id": "generate-practice-questions",
      "name": "Learning Point 专项练习生成",
      "description": "围绕自定义 Learning Point 生成专项练习题。",
      "task": "practice-generation",
      "systemRole": "你是面向中小学学生的 AI 练习题老师。",
      "objective": "生成贴合指定 Learning Point 的练习题。",
      "variables": [
        { "name": "knowledgePointTitle", "description": "目标 Learning Point 标题", "required": true }
      ],
      "learningPointMode": {
        "enabled": true,
        "maxPoints": 3,
        "includeFields": ["title", "summary", "keyConcepts", "commonMistakes", "examples"],
        "fallbackInstruction": "如果没有 Learning Point 详情，也必须紧扣 knowledgePointTitle。"
      },
      "rules": ["只返回严格 JSON，不要输出 Markdown。"],
      "outputContract": "{ \"questions\": [] }"
    }
  ],
  "updatedAt": "2026-05-14T00:00:00.000Z"
}
```

## 必须包含的模板 ID

系统内置模板覆盖以下三类 AI 功能；自定义包可替换其中任意模板，未提供的模板会回退到内置默认模板。

- `analyze-wrong-questions`：错题诊断与 Learning Points 归因。
- `generate-practice-questions`：Learning Point 专项练习生成。
- `generate-monthly-wrong-set-exam`：月度错题复习卷生成。

## Learning Point 模式

`learningPointMode` 控制提示词渲染时注入哪些 Learning Points 字段：

- `enabled`：是否注入 Learning Points 上下文。
- `maxPoints`：最多注入几个点，防止 prompt 过长。
- `includeFields`：可选 `title`、`summary`、`objectives`、`keyConcepts`、`commonMistakes`、`explanation`、`examples`、`masteryCriteria`、`practiceProfile`、`teachingTags`。
- `fallbackInstruction`：无匹配知识点或无法判断时的兜底规则。

## 校验原则

- 输出契约仍由业务 Zod schema 做最终校验，提示词包不能绕过结果校验。
- AI 模型仍通过“模型档案 + 功能路由”选择；提示词包只控制 prompt 内容。
- 上传包只写 `.data/prompt-templates/active.json`，生产环境如需审计可把包内容纳入外部配置管理。
