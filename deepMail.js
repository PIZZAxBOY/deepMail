const fs = require('fs');
const fetch = require('node-fetch').default;
const readline = require('readline');

// DeepSeek API 配置
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

// 新增：多行输入，END 单独一行时结束
async function askMultiline(prompt, endMarker = 'END') {
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
  } catch (error) {
    console.error('错误：无法读取 prompt.txt 文件，请确保文件存在。', error.message);
    process.exit(1);
  }
}

// 加载配置
try {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  appConfig = JSON.parse(configContent);
  console.log('配置已加载');
} catch (error) {
  console.error('无法加载配置：', error.message);
  rl.close();
  process.exit(1);
}

const API_URL = appConfig.deepSeekAPI.API_URL;
const API_KEY = appConfig.deepSeekAPI.API_KEY;

// 发送 API 请求
async function sendRequest(messages) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.statusText}`);
    }

    const data = await response.json();
    console.log('API 响应：', data.choices[0].message.content.trim());
  } catch (error) {
    console.error('错误：发送请求失败：', error.message);
  }
}

// 主函数
async function main() {
  const fixedPrompt = readFixedPrompt();

  // 用多行输入替代单行 ask
  const emailBody = await askMultiline('请输入邮件内容', 'e');
  const direction = await askMultiline('请输入 Direction（e 结束）', 'e');

  const accumulatedPrompt = `Email:${emailBody}\nDirection:${direction}`;

  const messages = [
    { role: 'system', content: fixedPrompt },
    { role: 'user', content: accumulatedPrompt }
  ];

  await sendRequest(messages);
  console.log('END');
  rl.close();
}

main();