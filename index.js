const Discord = require("discord.js")
const ytdl = require("ytdl-core");

const client = new Discord.Client()

const queue = new Map();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity("songs | =help", {type: "PLAYING"});
})

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
    } else if (command == `queue`) {

        if(!serverQueue) {
            const notplayingqueue = new Discord.MessageEmbed()
                .setColor(`#FFA500`)
                .setTitle(`Not playing!`)
                .setDescription(`I'm not playing songs now.`)
            message.channel.send(notplayingqueue)
            return;
        }

        var songsarray = [];
        for (var i = 0; i < serverQueue.songs.length; i++) {
            songsarray.push(serverQueue.songs[i].title);
        }

        if(songsarray.length > 0) {
            if(songsarray.length === 1){
                message.channel.send("**Queue**\n**Playing:** " + songsarray[0]);
            } else {
                var firstSong = songsarray[0];
                for (var i = 0; i < songsarray.length; i++) {
                    songsarray[i] = "**" + (i+1) + ". **"+ songsarray[i];
                }
                message.channel.send("**Queue**\n**Playing:** " + firstSong + "\n\n" + songsarray.join("\n"));
                }
        } else { 
            message.channel.send("No songs queued") 
        }

    } else if (command.startsWith(`help`)) {
        const helpembed = new Discord.MessageEmbed()
            .setColor(`#1167b1`)
            .setTitle(`**Command list**`)
            .setDescription("``=play`` Plays music.\n``=stop`` Stops playing music.\n``=skip`` Skips music.\n``=help`` This command.")
        message.channel.send(helpembed)
    }});

    async function execute(message, serverQueue) {

        const novc = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Join a voice channel first!')
            .setDescription('You need to be in a voice channel to play music.')
    
        const diffvc = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same vc with me to play music.`)

        const args = message.content.split(" ");

        if(!args) {
            const nosongembed = new Discord.MessageEmbed()
                .setColor(`#b19cd9`)
                .setTitle(`Play command`)
                .setDescription(`Usage: =play [youtube link]`)
            message.channel.send(nosongembed)
            return
        }
    
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send(novc);

        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvc)

        if(ytdl.validateURL(args[1]) == false) {
            const wronglink = new Discord.MessageEmbed()
                .setColor(`#FFA500`)
                .setTitle(`Provide a valid YouTube link!`)
                .setDescription(`The link you provided is not valid.`)
            message.channel.send(wronglink)
            return
        }
    
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
            .setDescription("``" + song.title + "`` has been added to the queue!")
        return message.channel.send(addedsong);
    }}
  
    function skip(message, serverQueue) {

        const novcskip = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to skip music.")

        const nosongskip = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('No song anymore!')
            .setDescription('There is no song that I can skip.')

        const diffvcskip = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to skip music.`)

        if (!message.member.voice.channel) return message.channel.send(novcskip);
        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcskip)
        if (!serverQueue) return message.channel.send(nosongskip);

        serverQueue.songs.shift();
        play(message.guild, serverQueue.songs[0]);
    } 
    
    function stop(message, serverQueue) {
        const novcstop = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to stop the music.")

        const diffvcstop = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to stop music.`)

        if (!message.member.voice.channel) return message.channel.send(novcstop);
        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcstop)
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
        .play(ytdl(song.url, { filter: 'audioonly' }))
        dispatcher.on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    const playing = new Discord.MessageEmbed()
            .setColor('#00ff00')
            .setTitle('Playing music!')
            .setDescription("Playing ``" + song.title + "`` now! :notes:")
    serverQueue.textChannel.send(playing);

}

client.login(process.env.TOKEN)