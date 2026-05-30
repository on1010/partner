const { REST, Routes } = require("discord.js");
const { readdirSync } = require("fs");
const { join } = require("path");

const TOKEN = "";
const CLIENT_ID = "1445793248302993499";

const commands = [];

const commandFiles = readdirSync(join(__dirname, "commands")).filter((f) => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(join(__dirname, "commands", file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Slash komutlar register edildi.");
})();