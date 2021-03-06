const Discord = require("discord.js") 
const ytdl = require("ytdl-core");
const YouTube = require("discord-youtube-api");
const Genius = require("genius-lyrics");
const mongoose = require('mongoose')
const { inspect } = require('util');
const Paginator = require('./modules/paginator.js')

const client = new Discord.Client() 

const queue = new Map();

mongoose.connect(process.env.MONGODB,  { useNewUrlParser: true, useUnifiedTopology: true } )

const youtube = new YouTube(process.env.YOUTUBEKEY);

mongoose.connection.on('connecting', function () { console.log('MongoDB: Trying to connect to MongoDB');});
mongoose.connection.on('connected', function () { console.log('MongoDB: Successfully connected to MongoDB');});
mongoose.connection.on('error', function (err) { console.log('MongoDB: ERROR connecting to MongoDB' + ' - ' + err);  });
mongoose.connection.on('close', function (err) { console.log('MongoDB: Connection closed');});
mongoose.connection.on('reconnected', function () { console.log('MongoDB: Database link was reconnected');});
mongoose.connection.on('disconnected', function () { console.log('MongoDB: Connection ended');});

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag} | Online in ${client.guilds.cache.size} servers.`)
    client.user.setActivity("$help | Build 0.5.0 - Embed pagination is live!", {
        type: "PLAYING",
        //url: "https://www.twitch.tv/maestromusicbot"  
    });
})

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

//Get ID from URL function
function ytid(url) {
    var ID = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
        ID = url[2].split(/[^0-9a-z_\-]/i);
        ID = ID[0];
    }
    else {
        ID = url;
    }
    return ID;
}

const guildprefix = mongoose.model('guildprefix', new mongoose.Schema({
    serverid: String,
    prefix: String
}));
  
client.on("message", async message => {

    const prefixmap = await guildprefix.findOne({ serverid: message.guild.id }) || { prefix: "$" }
    let prefix = prefixmap.prefix

    if (message.author.bot) return;
    if (message.content.indexOf(prefix) !== 0) return;
    if (message.channel.type !== 'text') return;

    const talkedRecently = new Set();

    let args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
  
    const serverQueue = queue.get(message.guild.id);

    if(command == `ping`) {

        message.channel.send(`:ping_pong: Pong: ${client.ws.ping}ms!`)

    } else if (command == `prefix`) {

        const arg = message.content.split(' ').slice(1);
        const newprefix = arg.join(' ');

        const noperm = new Discord.MessageEmbed()
            .setColor('#FF665B')
            .setTitle('Missing permissions')
            .setDescription("You need ``Manage guild`` permission to use this command.")

        if(!newprefix) return message.channel.send("Current prefix is ``"+ prefix + "``")

        if(!message.member.hasPermission("MANAGE_GUILD")) return message.channel.send(noperm)

        const test = await guildprefix.findOne({ serverid: message.guild.id })

        if (test == null) {
            await new guildprefix({ serverid: message.guild.id, prefix: newprefix }).save();
        } else {
            await guildprefix.updateOne({ serverid: message.guild.id }, { prefix: newprefix });
        }

        const setprefix = await guildprefix.findOne({ serverid: message.guild.id })

        const prefixembed = new Discord.MessageEmbed()
            .setColor(`#0859C6`)
            .setTitle(`Successfully set prefix`)
            .setDescription("The new prefix is ``" + setprefix.prefix + "``")

        await message.channel.send(prefixembed)

    } else if (command == "play" || command == "p") {

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

    } else if (command == "pause") {

        const notplayingp = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`Not playing!`)
            .setDescription(`I'm not playing songs now.`)

        if(!serverQueue) return message.channel.send(notplayingp)

        const diffvcpause = new Discord.MessageEmbed()
            .setColor(`#FFA500`) 
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to pause music.`)

        if(message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcpause)

        const apaused = new Discord.MessageEmbed()
            .setColor("00ff00")
            .setTitle("Already paused!")

        if(serverQueue.playing == false) return message.channel.send(apaused)

        serverQueue.playing = false
        serverQueue.connection.dispatcher.pause()
        
        const pauseembed = new Discord.MessageEmbed()
            .setColor("00ff00")
            .setTitle("Paused!")

        message.channel.send(pauseembed)

    } else if (command == "resume") {

        const notplayingr = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`Not playing!`)
            .setDescription(`I'm not playing songs now.`)

        if(!serverQueue) return message.channel.send(notplayingr)

        const diffvcresume = new Discord.MessageEmbed()
            .setColor(`#FFA500`) 
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to resume music.`)

        if(message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcresume)

        const npause = new Discord.MessageEmbed()
            .setColor("00ff00")
            .setTitle("Not paused!")
        
        if(serverQueue.playing == true) return message.channel.send(npause)

        serverQueue.playing = true
        serverQueue.connection.dispatcher.resume()

        const resumeembed = new Discord.MessageEmbed()
            .setColor("00ff00")
            .setTitle("Resumed!")

        message.channel.send(resumeembed)

    } else if (command == "skip") {

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
            .setTitle(`Not playing!`)
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

    } else if (command == "volume" || command == "v") {

        const notplayingv = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`Not playing!`)
            .setDescription(`I'm not playing songs now.`)

        var argsb = message.content.split(" ")

        const diffvcv = new Discord.MessageEmbed()
          .setColor(`#FFA500`)
          .setTitle(`You are not in the same VC with me!`)
          .setDescription(`You have to be in the same VC with me to set volume.`)
     
        if (!serverQueue) return message.channel.send(notplayingv);
    
        if (!argsb[1]) {
            const volumeembed = new Discord.MessageEmbed()
                .setColor("#9932cc")
                .setTitle("Current volume: **" + serverQueue.volume + "/100**")

            return message.channel.send(volumeembed);
        }

        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcv)

        const invnumber = new Discord.MessageEmbed()
            .setColor('#FFA500')
            .setTitle('Invalid argument')
            .setDescription("Volume must be a number between 0 and 100!")


        if (isNaN(argsb[1])) return message.channel.send(invnumber)
        if (argsb[1] < 0 || argsb[1] > 100) return message.channel.send(invnumber)

        serverQueue.volume = parseInt(argsb[1]);
        serverQueue.connection.dispatcher.setVolumeLogarithmic(argsb[1] / 100);

        const set = new Discord.MessageEmbed()
            .setColor("00ff00")
            .setTitle(`Volume has been set to **${serverQueue.volume}/100**`)

        message.channel.send(set);

    } else if (command == "move" || command == "m") {
        
        const args = message.content.split(' ');
        const locbef = args[1]
        const locaft = args[2]

        const noqm = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`Not playing!`)
            .setDescription(`I have no song to move.`)
   
        const diffvcm = new Discord.MessageEmbed()
            .setColor(`#FFA500`)
            .setTitle(`You are not in the same VC with me!`)
            .setDescription(`You have to be in the same VC with me to move song.`)

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

        if(!serverQueue) return message.channel.send(noqm)

        if(message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
            return message.channel.send(diffvcm)

        if(locbef >= serverQueue.songs.length || locaft >= serverQueue.songs.length || locaft <= 0 || locbef <= 0 || !serverQueue.songs.length || !serverQueue.songs)
            return message.channel.send(invm)

        const moved = new Discord.MessageEmbed()
            .setColor(`00ff00`)
            .setTitle(`Moved song!`)
            .setDescription("Successfully moved `" + serverQueue.songs[locbef].title + "` in queue.")

        message.channel.send(moved) 

        await serverQueue.songs.move(locbef, locaft)

    } else if (command == `now` || command == `n` || command == `np` || command == `nowplaying`) {
 
        const nowembed = new Discord.MessageEmbed()
            .setColor(`#00ff00`)
            .setAuthor('Now playing 🎵', client.users.cache.get(`729484903476887672`).displayAvatarURL())
            .setThumbnail("http://i.ytimg.com/vi/" + ytid(serverQueue.songs[0].url) + "/maxresdefault.jpg")
            .setDescription(`[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})`)
            .setFooter(`Song duration: ${serverQueue.songs[0].length.toHHMMSS()}`)

        message.channel.send(nowembed)

    } else if (command == "lyrics" || command == "l") {

        const infol = new Discord.MessageEmbed() 
            .setColor(`#b19cd9`)
            .setTitle(`Lyrics command`)
            .setDescription(`Sends the lyrics of a song.`)
            .setFooter(`Usage: $lyrics [search word]`)

        const G = new Genius.Client(process.env.GENIUSKEY)

        const args = message.content.split(' ').slice(1); 
        const songname = args.join(' '); 

        if(!songname) { 
            return message.channel.send(infol)
        }
        
        const searchword = encodeURI(songname)

        message.channel.startTyping()

        G.tracks.search(searchword, {limit: 1})
        .then(results => {
            const result = results[0]
            const artist = result.artist.name
            const title = result.title
            result.lyrics()
                .then(async lyrics => {

                    try {

                        const pages = chunkSubstr(lyrics, 500)

                        const a = new Paginator([], { filter: (reaction, user) => user.id == message.author.id, timeout: 240000 }) 

                        for(var i=0 ; i<pages.length ; i++) {
                            a.add(new Discord.MessageEmbed().setColor('#00ff00').setTitle(`${artist} - ${title}`).setDescription(pages[i]).setFooter())
                        }
                        
                        a.setTransform((embed, index, total) => embed.setFooter(`Powered by Genius | Page ${index + 1} of ${total}`, "https://i.ibb.co/n1Ptnfb/Genius-logo.png")) 
                        
                        a.start(message.channel, message.author.id)

                    } catch (error) {
                        console.log(error)
                    }
                    
                }
            )
        }).catch(err => message.reply(err));

        message.channel.stopTyping()
 
    } else if (command == `help`) {

        const helpembed = new Discord.MessageEmbed()
            .setColor(`#1167b1`)
            .setTitle(`Command list`)
            .setDescription("``ping`` Gets bot ping.\n``prefix`` Sets bot prefix.\n``play`` Plays music.\n``volume`` Sets bot volume.\n``pause`` Pauses playback.\n``resume`` Resumes playback.\n``lyrics`` Searches for the lyrics of a song.\n``stop`` Stops playing music.\n``skip`` Skips music.\n``queue`` Displays queue.\n``now`` Displays song currently playing.\n``remove`` Removes song from queue.\n``move`` Moves song in queue.\n``help`` This command.\n``aliases`` View command aliases.")
            .setFooter("This server's prefix is " + prefix)

        message.channel.send(helpembed)

    } else if (command == `aliases`) {

        const aliases = new Discord.MessageEmbed()
            .setColor(`#1167b1`)
            .setTitle(`Command aliases`)
            .setDescription("``play`` - ``p``\n``lyrics`` - ``l``\n``volume`` - ``v``\n``join`` - ``summon``\n``queue`` - ``q``\n``now`` - ``n, np, nowplaying``\n``stop`` - ``disconnect, dc``\n``remove`` - ``r``\n``move`` - ``m``")
            .setFooter("This server's prefix is " + prefix)
        
        message.channel.send(aliases)

    } else if (command == 'eval') {
        if (message.author.id !== '611396886418685982') return;

        const args1 = message.content.split(' ').slice(1); 
        const evalcmd = args1.join(' '); 

        let evaled;

        try {
            evaled = await eval(`if (1>0) { ${evalcmd} }`);
            message.channel.send("```yaml\n" + 
            inspect(evaled)
            + "\n```").catch(error => {
                message.channel.send("Result too long, check logs.")
            });
            console.log("-- Inspection result --\n" + inspect(evaled) + "\n------------------------");
        }
        catch (error) {
            console.error(error);
            message.reply('An error occurred during evaluation.');
            message.channel.send("```" + error + "```").catch(error => { message.channel.send("Error too long, chack logs.")})
        }
    }
});

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
                title: songInfoa.videoDetails.title || null,
                url: videosearched.url || null,
                length: songInfoa.videoDetails.lengthSeconds || null
            };
        } catch (error) {
            message.channel.send("Error while playing music. Try playing with a link.")
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
                .setThumbnail("http://i.ytimg.com/vi/" + ytid(link) + "/maxresdefault.jpg")
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
                title: songInfo.videoDetails.title,
                url: "https://youtube.com" + songInfo.url,
                length: songInfo.videoDetails.lengthSeconds
            };

        } catch (error) {
            message.channel.send("Failed to get video info.")
            console.log(error)
            song = {
                title: null,
                url: video,
                length: null
            };
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
            .setThumbnail("http://i.ytimg.com/vi/" + ytid(linka) + "/maxresdefault.jpg")
            .setDescription(`[${song.title}](${linka})`)
            .setFooter(`Song duration: ${song.length.toHHMMSS()}`)
        message.channel.send(addedsong);
        
        return;
    }}
}

function skip(message, serverQueue) {

    const nosongskip = new Discord.MessageEmbed()
        .setColor('#FFA500')
        .setTitle('No song anymore!')
        .setDescription('There is no song that I can skip.')

    const diffvcskip = new Discord.MessageEmbed()
        .setColor(`#FFA500`)
        .setTitle(`You are not in the same VC with me!`)
        .setDescription(`You have to be in the same VC with me to skip music.`)

    if(!message.member.voice.channel || message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
        return message.channel.send(diffvcskip)
    if (!serverQueue) return message.channel.send(nosongskip);

    serverQueue.songs.shift(); 
    message.react("⏭️") 
    play(message.guild, serverQueue.songs[0]);
} 

function stop(message, serverQueue) {
    
    const diffvcstop = new Discord.MessageEmbed()
        .setColor(`#FFA500`) 
        .setTitle(`You are not in the same VC with me!`)
        .setDescription(`You have to be in the same VC with me to disconnect me.`)

    if(!message.member.voice.channel || message.member.voice.channel && message.guild.me.voice.channel && message.member.voice.channel != message.guild.me.voice.channel) 
        return message.channel.send(diffvcstop)

    if (!serverQueue) {
        message.member.voice.channel.leave()
    } else {
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
        message.member.voice.channel.leave()
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
        .play(ytdl(song.url, { filter: 'audioonly', type: 'opus' }))
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
        .setThumbnail("http://i.ytimg.com/vi/" + ytid(linkb) + "/maxresdefault.jpg")
        .setDescription(`[${song.title}](${linkb})`)
        .setFooter("Song duration: " + song.length.toHHMMSS())

    serverQueue.textChannel.send(playing);

}

client.login(process.env.TOKEN)
