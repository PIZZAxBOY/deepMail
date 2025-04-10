// app.js
const fs = require('fs');
const { OpenAI } = require('openai');
const readline = require('readline');

// 配置文件路径
const CONFIG_PATH = './config.json';
let appConfig;

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 把 rl.question 包装成 Promise
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer));
  });
}

// 多行输入，END 单独一行时结束
async function askMultiline(prompt, endMarker = 'e') {
  console.log(`${prompt}（输入 ${endMarker} 单独一行以结束）`);
  const lines = [];
  while (true) {
    const line = await ask('');
    if (line === endMarker) break;
    lines.push(line);
  }
  return lines.join('\n');
}

// 读取固定 prompt
function readFixedPrompt() {
  try {
    return fs.readFileSync('prompt.txt', 'utf8').trim();
  } catch (err) {
    console.error('错误：无法读取 prompt.txt，请确保文件存在。', err.message);
    process.exit(1);
  }
}

// 加载配置
try {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  appConfig = JSON.parse(raw);
  console.log('配置已加载');
} catch (err) {
  console.error('无法加载配置：', err.message);
  process.exit(1);
}

// 从配置中取值
const { API_URL, API_KEY } = appConfig.deepSeekAPI;

// 初始化 OpenAI 客户端，指定 baseURL 为 DeepSeek
const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: API_URL,  // 去掉路径，只保留主机部分
});

// 发送请求
async function sendRequest(messages) {
  try {
    const resp = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      max_tokens: 300,
      temperature: 1.7,
    });
    const reply = resp.choices[0].message.content.trim();
    console.log('API 响应：\n', reply);
  } catch (err) {
    console.error('错误：请求失败：', err.message);
  }
}

// 主流程
async function main() {
  const fixedPrompt = readFixedPrompt();

  const emailBody = await askMultiline('请输入邮件内容', 'e');
  const direction = await askMultiline('请输入 Direction', 'e');

  const accumulatedPrompt = `Email:\n${emailBody}\n\nDirection:\n${direction}`;

  const messages = [
    { role: 'system', content: fixedPrompt },
    { role: 'user', content: accumulatedPrompt }
  ];

  await sendRequest(messages);

  console.log('END');
  rl.close();
}

main();
