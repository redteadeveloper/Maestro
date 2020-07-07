const Discord = require("discord.js")
const ytdl = require("ytdl-core");

const client = new Discord.Client()

const queue = new Map();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity("YouTube", {type: "WATCHING"});
})

client.once("reconnecting", () => {
    console.log("Reconnecting!");
  });
  
client.once("disconnect", () => {
    console.log("Disconnect!");
});

var prefix = "="
  
client.on("message", async message => {

    if (message.author.bot) return;
    if (message.content.indexOf(prefix) !== 0) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
  
    const serverQueue = queue.get(message.guild.id);
  
    if (command.startsWith(`play`)) {
        execute(message, serverQueue);
        return;
    } else if (command.startsWith(`skip`)) {
        skip(message, serverQueue);
        return;
    } else if (command.startsWith(`stop`)) {
        stop(message, serverQueue);
    } else if (command.startsWith(`help`)) {
        const helpembed = new Discord.MessageEmbed()
            .setColor(`#1520a6`)
            .setTitle(`**Command list**`)
            .setDescription("``=play``: Plays music.\n``=stop``: Stops playing music.\n``=skip``: Skips music.\n``=help``: This command.")
        message.channel.send(helpembed)
    }
    });

    const novc = new Discord.MessageEmbed()
        .setColor('#00ff00')
        .setTitle('Join a voice channel first!')
        .setDescription('You need to be in a voice channel to play music.')
  
    async function execute(message, serverQueue) {
        const args = message.content.split(" ");
    
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send(novc);
    
        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url
        };
  
        if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
    
        queue.set(message.guild.id, queueContruct);
    
        queueContruct.songs.push(song);
    
        try {
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }

    } else {
        serverQueue.songs.push(song);
        const addedsong = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setTitle('Song added!')
            .setDescription(`**${song.title}** has been added to the queue!`)
        return message.channel.send(addedsong);
    }}
  
    function skip(message, serverQueue) {

        const novcskip = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to skip the music.")

        const nosongskip = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setTitle('No song anymore!')
            .setDescription('There is no song that I can skip.')

        if (!message.member.voice.channel) return message.channel.send(novcskip);
        if (!serverQueue) return message.channel.send(nosongskip);
        serverQueue.connection.dispatcher.end();
    }
    
    function stop(message, serverQueue) {
        const novcstop = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to stop the music.")
        if (!message.member.voice.channel) return message.channel.send(novcstop);
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
  
    function play(guild, song) {
        const serverQueue = queue.get(guild.id);
        if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
  
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        dispatcher.on("finish", () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    const playing = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setTitle('Playing music!')
            .setDescription(`Playing **${song.title}** Now! :notes:`)
    serverQueue.textChannel.send(playing);

}

client.login(process.env.TOKEN)