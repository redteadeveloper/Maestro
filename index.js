const Discord = require("discord.js")
const client = new Discord.Client()

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity("YT | =help", {type: "WATCHING"});
})

client.on("message", msg => {
    if (msg.content === "ping") {
        msg.reply("Pong!")
    }
})

client.login("YOUR_TOKEN")