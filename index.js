import fs from 'fs';
import axios from 'axios';
import yaml from 'yaml';
import chalk from 'chalk';

class DiscordBot {
    constructor(token) {
        this.baseUrl = "https://discord.com/api/v9";
        this.headers = { 'Authorization': token };
        this.username = this.getUsername();
    }

    async getUsername() {
        const response = await axios.get(`${this.baseUrl}/users/@me`, { headers: this.headers });
        return `${response.data.username}#${response.data.discriminator}`;
    }

    async sendMessage(channelId, message) {
        const payload = { content: message };
        const response = await axios.post(`${this.baseUrl}/channels/${channelId}/messages`, payload, { headers: this.headers });
        return response.data;
    }
}

async function loadConfig(filePath = 'config.yaml') {
    const file = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(file);
}

function loadMessages(filePath = 'chat.txt') {
    const msgFile = fs.readFileSync(filePath, 'utf8');
    return msgFile.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

async function main() {
    const config = await loadConfig();
    const messages = loadMessages();

    if (!config.token) {
        console.error(chalk.red("[ERROR] No bot token provided in config.yaml!"));
        process.exit(1);
    }

    if (!config.channel_id) {
        console.error(chalk.red("[ERROR] No channel ID provided in config.yaml!"));
        process.exit(1);
    }

    if (!messages.length) {
        console.error(chalk.red("[ERROR] No messages found in chat.txt!"));
        process.exit(1);
    }

    const tokenDelay = config.token_delay || 5;
    const messageDelay = config.message_delay || 2;
    const restartDelay = config.restart_delay || 10;

    while (true) {
        for (const token of config.token) {
            try {
                const bot = new DiscordBot(token);
                const username = await bot.username;

                for (const channel of config.channel_id) {
                    const customMessage = messages[Math.floor(Math.random() * messages.length)];
                    const response = await bot.sendMessage(channel, customMessage);

                    if (response.content) {
                        console.log(chalk.green(`[INFO] [${username}] => Sent to Channel ${channel}: ${customMessage}`));
                    }

                    await new Promise(resolve => setTimeout(resolve, messageDelay * 1000));
                }

                console.log(chalk.yellow(`[INFO] Waiting for ${tokenDelay} seconds before processing the next token...`));
                await new Promise(resolve => setTimeout(resolve, tokenDelay * 1000));

            } catch (error) {
                console.error(chalk.red(`[CRITICAL ERROR] Skipping token due to error: ${error.name}: ${error.message}`));
            }
        }

        console.log(chalk.yellow(`[INFO] Waiting for ${restartDelay} seconds before restarting...`));
        await new Promise(resolve => setTimeout(resolve, restartDelay * 1000));
    }
}

main().catch(error => {
    console.error(chalk.red(`[CRITICAL ERROR] ${error.name}: ${error.message}`));
});
