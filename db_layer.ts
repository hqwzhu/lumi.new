import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

// Initial DB structure
const INITIAL_DB = {
  users: [
    {
      uid: "admin-uid",
      username: "admin",
      password: "admin123",
      role: "admin",
      balance: 1000,
      createdAt: new Date().toISOString()
    },
    {
      uid: "user-admin-uid",
      username: "maoxiansheng946@gmail.com",
      password: "admin123",
      role: "admin",
      balance: 1000,
      createdAt: new Date().toISOString()
    }
  ],
  agents: [],
  interactions: [],
  founderVision: "LumiAI 旨在构建一个去中心化的智能协议。我们追求空间存在感、边缘计算与数据主权。通过分布式节点，每一个用户都能拥有真正属于自己的、可进化的数字生命。",
  marketplaceSkills: [
    { id: "skill-1", name: "财务报表分析 LoRA", author: "LumiNode_01", price: 50, description: "针对企业财务报表的深度微调权重，支持自动化对账与异常检测。", category: "Finance" },
    { id: "skill-2", name: "创意剧本创作 LoRA", author: "CreativeMind", price: 30, description: "专注于科幻与悬疑风格的剧本创作，具备极强的逻辑连贯性。", category: "Creative" },
    { id: "skill-3", name: "医疗辅助诊断 LoRA", author: "HealthGuard", price: 100, description: "基于公开医疗数据集微调，辅助识别常见病症与用药建议。", category: "Medical" }
  ],
  skills: [
    { id: "vision", name: "Vision Core", description: "Advanced image recognition and spatial awareness." },
    { id: "logic", name: "Logic Engine", description: "Complex reasoning and mathematical problem solving." },
    { id: "empathy", name: "Empathy Module", description: "Emotional intelligence and nuanced conversation." }
  ]
};

export function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2));
      return INITIAL_DB;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Database Read Error:", error);
    return INITIAL_DB;
  }
}

export function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Database Write Error:", error);
  }
}

// Future SQLite migration placeholder
// export async function query(sql: string, params: any[]) { ... }
