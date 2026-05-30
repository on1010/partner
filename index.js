const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const { join } = require("path");

const TOKEN = "";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commandFiles = readdirSync(join(__dirname, "commands")).filter((f) => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(join(__dirname, "commands", file));
  client.commands.set(command.data.name, command);
}

const eventFiles = readdirSync(join(__dirname, "events")).filter((f) => f.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(join(__dirname, "events", file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(TOKEN);