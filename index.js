const Discord = require("discord.js")
const ytdl = require("ytdl-core");
const YouTube = require("discord-youtube-api");
const Genius = require("genius-lyrics");

const client = new Discord.Client() 

const queue = new Map();

const youtube = new YouTube(process.env.YOUTUBEKEY);

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag} | Online in ${client.guilds.cache.size} servers.`)
    client.user.setActivity("$help | Build 0.4.6 - Got the links!", {
        type: "PLAYING",
        //url: "https://www.twitch.tv/maestromusicbot"  
    });
})

var prefix = "$" 

//Element moving function
Array.prototype.move = function (from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
}; 
 
//Seconds to time string function
String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

//String splitting function
function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }
  
    return chunks
}
  
client.on("message", async message => {

    if (message.author.bot) return;
    if (message.content.indexOf(prefix) !== 0) return;
    if (message.channel.type !== 'text') return;

    const talkedRecently = new Set();

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
  
    const serverQueue = queue.get(message.guild.id);

    if(command == `ping`) {
        message.channel.send(`Pong: ${client.ws.ping}ms!`)
        return;
    } else if (command.startsWith(`play`) || command.startsWith(`p`)) {

        if(message.author.id == "611396886418685982") {
            execute(message, serverQueue);
            return;
        } else {
            if (talkedRecently.has(message.author.id)) return message.reply("You can use this command once every 10 seconds.")
            talkedRecently.add(message.author.id);
            setTimeout(() => {
                talkedRecently.delete(message.author.id);
            }, 10000);
    
            execute(message, serverQueue);
            return;
        }

    } else if (command.startsWith(`skip`)) {
        skip(message, serverQueue);
        return;
    } else if (command == `stop` || command == `disconnect` || command == `dc`) {
        stop(message, serverQueue);
    } else if (command == `join` || command == `summon`) {

        const novcjoin = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to make me join.")

        if (!message.member.voice.channel) return message.channel.send(novcjoin);
        message.member.voice.channel.join()
        message.react(`✅`)
        
    } else if (command == `remove` || command == `r`) {

        const novcr = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to remove song.")

        const diffvcr = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to remove song.`)

        const noqr = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`No queue!`)
            .setDescription(`I have no song to remove.`)
        
        const invr = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You provided an invalid song number!`)
            .setDescription(`Please give me a valid song number.`)
            .setFooter(`Type $q to view song number.`)

        const infor = new Discord.MessageEmbed()
            .setColor(`#b19cd9`)
            .setTitle(`Remove command`)
            .setDescription(`Removes a song from queue.`)
            .setFooter(`Usage: $remove [song number]`)

        const args1 = message.content.split(' ').slice(1); 
        const amount = args1.join(' '); 

        if(!amount) return message.channel.send(infor)

        if(!serverQueue) return message.channel.send(noqr)

        if(!message.member.voice.channel) return message.channel.send(novcr)

        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcr)

        if(isNaN(amount) || amount >= serverQueue.songs.length ||  amount <= 0 ) return message.channel.send(invr)

        const removed = new Discord.MessageEmbed()
            .setColor(`00ff00`)
            .setTitle(`Removed song!`)
            .setDescription("Successfully removed `" + serverQueue.songs[amount].title + "` from queue.")

        await serverQueue.songs.splice(amount, 1)

        message.channel.send(removed)

    } else if (command == `queue`|| command == `q`) {

        if(!serverQueue) {
            const notplayingqueue = new Discord.MessageEmbed()
                .setColor(`#FFA500`)
                .setTitle(`Not playing!`)
                .setDescription(`I'm not playing songs now.`)
            message.channel.send(notplayingqueue)
            return;
        } else if ( serverQueue.songs == [] ) {
            const notplayingqueuea = new Discord.MessageEmbed()
                .setColor(`#FFA500`)
                .setTitle(`Not playing!`)
                .setDescription(`I'm not playing songs now.`)
            message.channel.send(notplayingqueuea)
            return;
        }

        var songsarray = [];
        for (var i = 0; i < serverQueue.songs.length; i++) {
            songsarray.push(serverQueue.songs[i].title);
        }

        if(songsarray.length > 0) {
            
            for (var j = 0; j < 1; j++) {
                songsarray[j] = ":play_pause: ``" + songsarray[j] + "``\n"
            }
            for (var i = 1; i < songsarray.length; i++) {
                songsarray[i] = "**" + (i) + ".** ``"+ songsarray[i] + "``";
            }
            const queueembed = new Discord.MessageEmbed()
                .setColor(`#00ff00`)
                .setTitle(`Queue`)
                .setDescription(`${songsarray.join("\n")}`)
                .setTimestamp()
            message.channel.send(queueembed);
        }

    } else if (command.startsWith('volume') || command.startsWith('v')) {

        var argsb = message.content.split(" ")

        if (!serverQueue) return message.channel.send("Not playing");
    
        if (!argsb[1]) return message.channel.send(`Current Volume: **${serverQueue.volume}/100**`);
        if (isNaN(argsb[1])) return message.channel.send("Please input a volume between 0 and 100 only!")
        if (argsb[1] < 0 || args[1] > 100) return message.channel.send("Please input a volume between 0 and 100 only!")
        serverQueue.volume = parseInt(argsb[1]);
        serverQueue.connection.setVolumeLogarithmic(argsb[1] / 100);

        message.channel.send(`Volume has now been set to **${serverQueue.volume}/100**`);

    } else if (command.startsWith(`move`) || command.startsWith(`m`)) {
        
        const args = message.content.split(' ');
        const locbef = args[1]
        const locaft = args[2]

        const infom = new Discord.MessageEmbed()
            .setColor(`#b19cd9`)
            .setTitle(`Move command`)
            .setDescription(`Changes song location in queue.`)
            .setFooter(`Usage: $move [song number] [wanted location]`)

        const invm = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You provided an invalid song number!`)
            .setDescription(`Please give me a valid song number.`)
            .setFooter(`Type $q to view song number.`)

        if(!locbef || !locaft) return message.channel.send(infom)

        if(!serverQueue || locbef >= serverQueue.songs.length || locaft >= serverQueue.songs.length || locaft <= 0 || locbef <= 0 || !serverQueue.songs.length || !serverQueue.songs)
            return message.channel.send(invm)

        const moved = new Discord.MessageEmbed()
            .setColor(`00ff00`)
            .setTitle(`Moved song!`)
            .setDescription("Successfully moved `" + serverQueue.songs[locbef].title + "` in queue.")

        message.channel.send(moved) 

        await serverQueue.songs.move(locbef, locaft)

    } else if (command == `now` || command == `n` || command == `np`) {
 
        const nowembed = new Discord.MessageEmbed()
            .setColor(`#00ff00`)
            .setAuthor('Now playing 🎵', client.users.cache.get(`729484903476887672`).displayAvatarURL())
            .setDescription(`[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})`)
            .setFooter(`Song duration: ${serverQueue.songs[0].length.toHHMMSS()}`)

        message.channel.send(nowembed)

    } else if (command.startsWith(`lyrics`) || command.startsWith(`l`)) {

        message.channel.startTyping()

        const infol = new Discord.MessageEmbed() 
            .setColor(`#b19cd9`)
            .setTitle(`Lyrics command`)
            .setDescription(`Sends the lyrics of a song.`)
            .setFooter(`Usage: &lyrics [search word]`)

        const G = new Genius.Client(process.env.GENIUSKEY)

        const args = message.content.split(' ').slice(1); 
        const songname = args.join(' '); 

        if(!songname) { 
            message.channel.send(infol)
            return message.channel.stopTyping()
        }
        
        const searchword = encodeURI(songname)

        G.tracks.search(searchword, {limit: 1})
        .then(results => {
            const result = results[0]
            const artist = result.artist.name
            const title = result.title
            result.lyrics()
            .then(lyrics => {
                var parts = chunkSubstr(lyrics, 1930)

                if(parts.length > 7) {
                    const longlyrics = new Discord.MessageEmbed()
                        .setColor(`#00ff00`)
                        .setTitle(`${artist} - ${title}`)
                        .setDescription(`Click [here](${result.url}) too check the lyrics!\nSince the lyrics are too long, I provided a link instead.`)
                        .setFooter(`Powered by Genius`, `https://i.ibb.co/n1Ptnfb/59-598221-genius-lyrics-logo-transparent-clipart.png`)

                    message.channel.send(longlyrics)
                    return message.channel.stopTyping()
                }

                for(var i = 0; i < 1; i++) {
                    var lyricsembed = new Discord.MessageEmbed()
                        .setColor(`#00ff00`)
                        .setTitle(`${artist} - ${title}`)
                        .setDescription(parts[i])
                        .setFooter(`Powered by Genius | Page ${i + 1} of ${parts.length}`, `https://i.ibb.co/n1Ptnfb/59-598221-genius-lyrics-logo-transparent-clipart.png`)
                    message.channel.send(lyricsembed)
                    }

                for(var j = 1; j < parts.length; j++) {
                    var lyricsembed = new Discord.MessageEmbed()
                        .setColor(`#00ff00`)
                        .setDescription(parts[j])
                        .setFooter(`Powered by Genius | Page ${j + 1} of ${parts.length}`, `https://i.ibb.co/n1Ptnfb/59-598221-genius-lyrics-logo-transparent-clipart.png`)
                    message.channel.send(lyricsembed)
                    }
                }
            )
        }).catch(err => message.reply(err));

        message.channel.stopTyping()
 
    } else if (command.startsWith(`help`)) {

        const helpembed = new Discord.MessageEmbed()
            .setColor(`#1167b1`)
            .setTitle(`Command list`)
            .setDescription("``$ping`` Gets bot ping.\n``$play`` Plays music.\n``$lyrics`` Searches for the lyrics of a song.\n``$stop`` Stops playing music.\n``$skip`` Skips music.\n``$queue`` Displays queue.\n``$remove`` Removes song from queue.\n``$move`` Moves song in queue.\n``$help`` This command.\n``$aliases`` View command aliases.")
        message.channel.send(helpembed)

    } else if (command == `aliases`) {

        const aliases = new Discord.MessageEmbed()
            .setColor(`#1167b1`)
            .setTitle(`Command aliases`)
            .setDescription("``$play`` - ``$p``\n``$lyrics`` - ``$l``\n``$join`` - ``$summon``\n``$queue`` - ``$q``\n``$stop`` - ``$disconnect, $dc``\n``$remove`` - ``$r``\n``$move`` - ``$m``")
        message.channel.send(aliases)

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

            const args = message.content.split(' ').slice(1); 
            const video = args.join(' '); 

        if(!video) {
            const nosongembed = new Discord.MessageEmbed()
                .setColor(`#b19cd9`)
                .setTitle(`Play command`)
                .setDescription(`Plays a song from youtube.`)
                .setFooter(`Usage: $play [youtube link or search word]`)
            message.channel.send(nosongembed)
            return
        }
    
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send(novc);

        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvc)

        if(ytdl.validateURL(video) == false) {

            var keyword = encodeURI(video)
            const videosearched = await youtube.searchVideos(keyword);

            let songyt = {
                title: null,
                url: null,
                length: null
            };
            
            try {
                const songInfoa = await ytdl.getInfo(videosearched.url);
                songyt = {
                    title: songInfoa.title,
                    url: videosearched.url,
                    length: songInfoa.length_seconds
                };
            } catch (error) {
                message.channel.send("Error while playing music.")
                message.channel.send(error)
                console.log(error)
            }
  
            if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 50,
                playing: true
            };
        
            queue.set(message.guild.id, queueContruct);

            queueContruct.songs.push(songyt);

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

            const link = songyt.url
            
            serverQueue.songs.push(songyt);
            const addedsong = new Discord.MessageEmbed()
                .setColor('#00ff00')
                .setAuthor('Song added! 🎵', client.users.cache.get(`729484903476887672`).displayAvatarURL())
                .setDescription(`[${songyt.title}](${link})`)
                .setFooter(`Song duration: ${songyt.length.toHHMMSS()}`)
            message.channel.send(addedsong)

            return;
        } 

        } else {

            let song = {
                title: null,
                url: null,
                length: null
            };

            try {
        
                const songInfo = await ytdl.getInfo(video);
                song = {
                    title: songInfo.title,
                    url: "https://youtube.com" + songInfo.url,
                    length: songInfo.length_seconds
                };

            } catch (error) {
                message.channel.send("Error while playing music.")
                message.channel.send(error)
                console.log(error)
            }
    
            if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 50,
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

            const linka = song.url

            serverQueue.songs.push(song);
            const addedsong = new Discord.MessageEmbed()
                .setColor('#00ff00')
                .setAuthor('Song added! 🎵', client.users.cache.get(`729484903476887672`).displayAvatarURL())
                .setDescription(`[${song.title}](${linka})`)
                .setFooter(`Song duration: ${song.length.toHHMMSS()}`)
            message.channel.send(addedsong);
            return;
        }}
    }
  
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
        message.react("⏭️") 
        play(message.guild, serverQueue.songs[0]);
    } 
    
    function stop(message, serverQueue) {
        const novcstop = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Join a voice channel first!')
            .setDescription("You have to be in a voice channel to disconnect me.")

        const diffvcstop = new Discord.MessageEmbed()
            .setColor(`#FFA500`) 
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to disconnect me.`)

        if (!message.member.voice.channel) return message.channel.send(novcstop);

        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcstop)

        if (!serverQueue) {
            message.member.voice.channel.leave()
        } else {
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end();
        }
        
        message.react(`👋`) 
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

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 100);

    const linkb = song.url

    const playing = new Discord.MessageEmbed()
        .setColor('#00ff00')
        .setAuthor('Playing music! 🎶', client.users.cache.get(`729484903476887672`).displayAvatarURL())
        .setDescription(`[${song.title}](${linkb})`)
        .setFooter("Song duration: " + song.length.toHHMMSS())

    serverQueue.textChannel.send(playing);

}

client.login(process.env.TOKEN)
