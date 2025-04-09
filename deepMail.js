const fs = require('fs');
const fetch = require('node-fetch').default;
const readline = require('readline');

// DeepSeek API 配置
const CONFIG_PATH = './config.json';
let appConfig;

// 创建 readline 接口（要在用到 rl.close() 之前就声明好）
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

try {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  // 用全局 JSON.parse，而不是 config.JSON.parse
  appConfig = JSON.parse(configContent);
  console.log('配置已加载');
} catch (error) {
  console.error('无法加载配置：', error.message);
  rl.close();
  process.exit(1);
}

const API_URL = appConfig.deepSeekAPI.API_URL;
const API_KEY = appConfig.deepSeekAPI.API_KEY;

// 把 rl.question 包装成 Promise 方便用 async/await
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer));
  });
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
  let accumulatedPrompt = '';

  // 循环收集用户的 prompt
  while (true) {
    const userPrompt = await ask('请输入您的 prompt：');
    if (!accumulatedPrompt) {
      accumulatedPrompt = `Email:${userPrompt}`;
    } else {
      accumulatedPrompt += ` Direction:${userPrompt}`;
    }

    const more = await ask('是否要添加额外的 prompt？(y/n)：');
    if (more.trim().toLowerCase() !== 'y') {
      break;
    }
  }

  // 在用户不再添加时，一次性发送请求
  const messages = [
    { role: 'system', content: fixedPrompt },
    { role: 'user', content: accumulatedPrompt }
  ];
  await sendRequest(messages);

  console.log('退出程序。');
  rl.close();
}

main();
