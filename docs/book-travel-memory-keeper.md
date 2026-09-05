# 穿书记忆整理产出

本文记录穿书「记忆整理员」的产出契约：模型返回什么、程序保存什么、下一轮谁会读到。对应实现已落地，不是草案。

玩法本身（入场、回合、和聊天/冒险的差别）见 [book-travel-gameplay.md](./book-travel-gameplay.md)（含「冒险与穿书：基本差异」）。根目录 `DESIGN.md` / `PRODUCT.md` 被 `.gitignore` 忽略，本文件放在 `docs/`，可进仓库。

## 是否引擎共有

**不是。** MuseAI 里有三套互不调用的「记忆」机制，记忆整理员只属于穿书。

| 机制 | 归属 | 谁在用 | 产出 |
| --- | --- | --- | --- |
| 上下文压缩 | Agent 引擎（`start_chat_completion_stream`） | 伴侣聊天、文字冒险 | 一段摘要，替换会话早期消息 |
| 封存记忆 | 角色卡写回（`analyze_character_memory`） | 伴侣、冒险，用户手动点封存 | 关系三件套 + 关键事件 |
| **记忆整理员** | 穿书流水线（`summarize_book_travel_memory`） | **仅穿书** | `summary` + 选择/冲突/偏离 |

穿书不走 Agent 循环，没有上下文压缩，也不把结果写回角色卡。规划师、写手、分类器读的是穿书 `state` 里的剧情账本。

**对当前穿书够用吗？** 够支撑现有玩法：换场后压缩长线、把选择和未决冲突回喂下一轮、进度快照能存下来。还不是通用记忆框架——同场插节拍不整理、开场第一场不跑、没有利益归属、不回写角色卡。伴侣/冒险不能直接套这套 JSON。

## 问题

记忆整理员（`memory-keeper`）一直被要求输出四项：

| 模型 JSON 字段 | 含义 |
| --- | --- |
| `summary` | 可继续游玩的长线摘要 |
| `keyChoices` | 当前仍有效的用户关键选择 |
| `unresolvedConflicts` | 当前仍未解决的冲突 |
| `divergenceFromOutline` | 相对原大纲的偏离说明 |

此前前端只把 `summary` 写入 `summaryMemory`。后三项算完即丢，规划师和写手下一轮看不到。

## 产出契约

模型必须只输出 JSON，不要 Markdown 代码块。`keyChoices` 与 `unresolvedConflicts` 是**完整替换列表**，不是本轮增量。已解决的冲突不得再出现在 `unresolvedConflicts`。

```json
{
  "summary": "林晚转入沈府正厅，替嫁局尚未拆穿。",
  "keyChoices": [
    "主动去正厅见沈家人",
    "收下红头盖而未当场揭穿"
  ],
  "unresolvedConflicts": [
    "替嫁真相未明",
    "沈霜仍在试探"
  ],
  "divergenceFromOutline": "用户主动进入正厅，偏离原书回避路线。"
}
```

解析时同时接受 camelCase 与 snake_case（`summary_memory`、`key_choices` 等）。缺省字段保持上一轮值；只有模型给出该键时才覆盖。空字符串和空白数组项会被丢掉。

前端类型：

```ts
interface BookTravelPlotMemory {
  summaryMemory: string;
  keyChoices: string[];
  unresolvedConflicts: string[];
  divergenceFromOutline: string;
}
```

Rust 侧结构体为 `BookTravelMemorySummary`（`summary` / `key_choices` / `unresolved_conflicts` / `divergence_from_outline`，序列化为 camelCase）。

## 何时写入

换场（`change-scene`）写手完成后：

1. 规划师 `endingStatus` 不是 `none` / `active` → 走结局裁判，**不再**跑记忆整理。
2. 否则异步调用 `summarize_book_travel_memory`，解析结果后 `updatePlotMemory`。

同场插节拍（`insert-beat`）不跑记忆整理。开场第一场写完也不跑；账本从第一次换场开始积累。

## 保存位置

四项都在 `BookTravelSnapshot` 里，随「保存进度」写入 `savedProgresses[].snapshot`，落在 `~/Documents/MuseAI/config/book-travel-store.json`。

旧存档没有这三键时，加载会落到空数组 / 空字符串，不报错。

## 谁会读

每次请求的 `state` 都会带上当前账本：

| 角色 | 如何读到 |
| --- | --- |
| 行动分类器 | `state` 原样序列化 |
| 剧情规划师 | 同上；后端额外要求必须延续未决冲突、不得遗忘关键选择 |
| 场景写手 | `build_scene_writer_call` 白名单显式带上这四项（写手会重建 state，漏写即丢失） |
| 记忆整理员 | 读上一轮账本，再输出完整替换列表 |
| 结局裁判 | 读当前账本，再输出 `userKeyChoices` / `characterOutcomes` 等结局字段 |

HUD「旅程」栏展示：未决冲突、关键选择、偏离原大纲。空值不显示。

## 和其它记忆层的关系

| 层 | 作用 | 记忆整理会不会改 |
| --- | --- | --- |
| `assembledWorldModel` | 装配时冻结的世界模型 | 否 |
| `stableMemory` | 稳定规则；写手补丁会被 Rust 丢掉 | 否 |
| `volatileMemory` | 写手 `volatileMemoryPatch` 合并 | 否 |
| `currentState` + 场景/节拍 | 规划师 `stateChanges`、节拍正文 | 否 |
| **剧情账本（本文）** | 选择 / 未决冲突 / 偏离 / 摘要 | **是，完整替换** |
| 角色卡 `keyEvents` 等 | 伴侣/冒险封存记忆 | 否，穿书不回写角色卡 |

这不是人物利益账本（谁得到、谁失去），也不是 NPC 关系图。未决冲突已是可查询状态；利益归属仍靠模型即兴 JSON。

## 代码

| 文件 | 职责 |
| --- | --- |
| `src/utils/bookTravelMemory.ts` | 解析与归一化 |
| `src/stores/useBookTravelStore.ts` | `updatePlotMemory`、快照字段 |
| `src/pages/Story.tsx` | 换场后写入；各角色 `state` 注入 |
| `src/utils/bookTravelHud.ts` | 旅程栏展示 |
| `src-tauri/src/book_travel.rs` | 规划师/整理员指令；写手白名单 |
| `src/stores/useSettingsStore.ts` | 默认系统提示词 |

测试：`src/__tests__/book-travel-memory.test.ts`、`book-travel-store.test.ts`、`book-travel-hud-model.test.ts`、`story-book-travel-mode.test.tsx`。

若设置页仍是旧的记忆整理提示词，点一次「恢复默认」。即使用户没改提示词，后端 user prompt 里也会带上完整替换列表的约束。
