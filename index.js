const Discord = require("discord.js")
const client = new Discord.Client()

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity("YouTube", {type: "WATCHING"});
})

var prefix = "="

client.on("message", msg => {
    if (msg.content == prefix + "ping") {
        msg.reply("Pong!")
    }
})

client.login("NzI5NDg0OTAzNDc2ODg3Njcy.XwJofA.cBtX9WIzfN05MZF3rP44ZYELaRE")