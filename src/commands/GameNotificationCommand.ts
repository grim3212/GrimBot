import { Command, Message, GuildStorage, GuildSettings, KeyedStorage, Util as YUtil } from 'yamdbf';
import { Collection, RichEmbed, Permissions, TextChannel } from 'discord.js';
import Constants from '../util/Constants';
import Util from '../util/Util';

export default class GameNotificationAddCommand extends Command {
  public constructor() {
    super({
      name: 'gn',
      desc: 'Use this to add a Game Notification for when a user starts a certain game.',
      usage: '<prefix>gn <Argument>',
      info: 'Argument information below...\u000d\u000d' +
      '*add                    : Adds a new notification for a game\u000d' +
      'on/off                  : Enable/disable game notifications\u000d'+
      'useWaitTime <true/false>: Enable/disable cool down for notifications\u000d'+
      'setWaitTime             : If use wait time is active then this is the amount in ms until a user can be sent another notification\u000d'+
      'setChannel              : Set game notification channel\u000d'+
      'clear <-a (clear all)>  : Clear a games notifications. If admin and you add -a, this will remove all game notifications\u000d'+
      'remove                  : Remove a notification for a game\u000d'+
      'lookup                  : Display notifications for a specific game\u000d'+
      'stats                   : Stats about all game notifications\u000d\u000d'+
      '*When creating the message you may use <game> and <user> and they will be replaced when the message is written.\u000d'+
      '*Most Arguments will walk you through the setup so you only need to follow the instructions.',
      guildOnly: true
    });
  }

  public async action(message: Message, args: string[]): Promise<any> {
    const guildStorage: GuildStorage = this.client.storage.guilds.get(message.guild.id);
    const guildSettings: GuildSettings = this.client.storage.guilds.get(message.guild.id).settings;

    // create confirmation filter
    const setFilter: any = (m: Message) => {
      if (m.author.id === message.author.id)
        return true;
    };

    switch (args[0]) {
      case 'add':
        // let the user know we're working
        message.channel.startTyping();
        //Get game name
        message.reply('What game would like to add a notification for? (-c to cancel)').then((gameNameMessage: Message) => {
          //Wait for game name
          message.channel.awaitMessages(setFilter, { max: 1, time: 40000 }).then((collected: Collection<string, Message>) => {
            let gameName: string = collected.first().content;
            let gameNameMessageResponse: Message = collected.first();

            if (gameName.toLowerCase() === '-c') {
              //Cancel action
              message.reply('Cancelling action.');
            } else {
              //Ask for message
              message.reply(`What would you like the message to say? (-c to cancel)`).then((notificationMessage: Message) => {
                //Wait for message
                message.channel.awaitMessages(setFilter, { max: 1, time: 40000 }).then(async (collected: Collection<string, Message>) => {
                  let notification: string = collected.first().content;
                  let notificationMessageResponse: Message = collected.first();

                  if (notification.toLowerCase() === '-c') {
                    //Cancel action
                    message.reply('Cancelling action.');
                  } else {
                    if (await guildStorage.exists(Constants.keyName + '.' + gameName.toLowerCase())) {
                      //Add a new message if we already have messages for the game
                      let notes: Array<string> = await guildStorage.get(Constants.keyName + '.' + gameName.toLowerCase());
                      notes.push(notification);

                      //Add a new notification
                      guildStorage.set(Constants.keyName + '.' + gameName.toLowerCase(), notes);

                    } else {
                      //Create and add message for game
                      guildStorage.set(Constants.keyName + '.' + gameName.toLowerCase(), new Array<string>(notification));
                    }


                    message.reply(`Message for ${gameName} set as '${notification}'`);

                    //Clean up all the messages
                    message.delete();
                    gameNameMessage.delete();
                    gameNameMessageResponse.delete();
                    notificationMessage.delete();
                    notificationMessageResponse.delete();
                  }
                }).catch(() => {
                  // display output
                  message.reply('There was no collected message that passed the filter within the time limit!');
                });
              });
            }
          }).catch(() => {
            // display output
            message.reply('There was no collected message that passed the filter within the time limit!');
          });
        });

        return message.channel.stopTyping();
      case 'setWaitTime':
        if (!args[1]) {
          return message.reply(`You must specify a wait time in milliseconds.`);
        }

        if (!Util.isNumeric(args[1])) {
          return message.reply(`You must specify a wait time in milliseconds. ${args[1]} is not valid!`);
        }

        let newWaitTime: number = Util.intVal(args[1]);
        await guildSettings.set(Constants.waitTimeName, newWaitTime);
        return message.reply(`Wait time set as ${newWaitTime}ms.`);
      case 'useWaitTime':
        if (!args[1]) {
          return message.reply(`You must specify if you want to use wait time (true or false).`);
        }

        let waitTimeString: string = args[1].toLowerCase();

        if (waitTimeString !== 'true' && waitTimeString !== 'false') {
          return message.reply(`You must specify if you want to use wait time (true or false). ${args[1]} is not valid!`);
        }

        let useWaitTime: boolean = waitTimeString === 'true' ? true : false;
        await guildSettings.set(Constants.useWaitTimeName, useWaitTime);

        if (useWaitTime) {
          return message.reply(`Use wait time is now turned on!`);
        } else {
          return message.reply(`Use wait time is now turned off!`);
        }
      case 'off':
        //Turn off game notifications
        await guildSettings.set(Constants.showNotificationName, false);

        return message.reply(`Game Notifications have been turned off!`);
      case 'on':
        //Turn on game notifications
        await guildSettings.set(Constants.showNotificationName, true);

        return message.reply(`Game Notifications have been turned on!`);
      case 'setChannel':
        // let the user know we're working
        message.channel.startTyping();

        //Only allow the channel to be a text channel
        if (message.channel.type === 'text') {
          await guildSettings.set(Constants.channelName, message.channel.id);
          message.reply(`Game Notification channel set as '${(<TextChannel>message.channel).name}' with id '${message.channel.id}'.`);
        } else {
          message.reply(`Game Notification channel cannot be set to a DM channel.`);
        }

        return message.channel.stopTyping();
      case 'clear':
        // let the user know we're working
        message.channel.startTyping();

        //Argument for wiping all notifications
        if (args[1] && args[1] === '-a') {

          //Only to be used by admins
          if (message.member.permissions.has(new Array(Permissions.FLAGS.ADMINISTRATOR, Permissions.FLAGS.MANAGE_GUILD))) {
            await guildStorage.remove(Constants.keyName);

            message.reply("Cleared all game notifications!! :(");
          } else {
            message.reply("You do not have permission to use the '-a' arg!");
          }
          return message.channel.stopTyping();
        }

        let gameNotifications = await guildStorage.get(Constants.keyName);
        let gameKeys: Array<string> = await Object.keys(gameNotifications);
        let gamesList: string = gameKeys[0];

        for (let i = 1; i < gameKeys.length; i++) {
          gamesList = gamesList + `\u000d` + gameKeys[i];
        }

        //Ask for message
        message.reply(`What game would you like to clear notifications from? (-c to cancel)\u000d\u000dCurrent games:\u000d` + gamesList).then((clearMessage: Message) => {
          //Wait for message
          message.channel.awaitMessages(setFilter, { max: 1, time: 40000 }).then(async (collected: Collection<string, Message>) => {
            let gameName: string = collected.first().content;
            let clearMessageResponse: Message = collected.first();

            if (gameName.toLowerCase() === '-c') {
              //Cancel action
              message.reply('Cancelling action.');
            } else {
              if (await guildStorage.exists(Constants.keyName + '.' + gameName.toLowerCase())) {
                let cleared: Array<string> = await guildStorage.get(Constants.keyName + '.' + gameName.toLowerCase());

                message.reply(`Cleared ${cleared.length} notifications for ${gameName}.`);
                //Delete all game notifcations
                guildStorage.remove(Constants.keyName + '.' + gameName.toLowerCase());
              } else {
                message.reply(`Game '${gameName}' could not be found!`);
              }

              //Clean up all the messages
              message.delete();
              clearMessage.delete();
              clearMessageResponse.delete();
            }
          }).catch(() => {
            // display output
            message.reply('There was no collected message that passed the filter within the time limit!');
          });
        });

        return message.channel.stopTyping();
      case 'stats':
        // let the user know we're working
        message.channel.startTyping();

        let games: Array<string> = Object.keys(await guildStorage.get(Constants.keyName));
        const widest: number = games.map(c => c.length).reduce((a, b) => Math.max(a, b));
        games = games.sort((a, b) => a < b ? -1 : 1);

        let notificationCount: number = 0;
        let detailedInfo: string = '';
        for (let i = 0; i < games.length; i++) {
          let notes: Array<string> = await guildStorage.get(Constants.keyName + '.' + games[i]);
          notificationCount += notes.length;

          detailedInfo = detailedInfo + `\u000d` + YUtil.padRight(games[i], widest + 1) + ": " + notes.length + ' notifications';
        }

        message.reply({
          embed: {
            "author": {
              "name": this.client.user.username,
              "icon_url": this.client.user.avatarURL
            },
            "description": "Currently **" + notificationCount + "** notifications are registered for **" + games.length + "** games.\n```ldif\n" + detailedInfo + "```",
            "color": 3447003,
            "timestamp": (new Date),
            "footer": {
              "text": "Generated"
            }
          }
        });

        return message.channel.stopTyping();
      case 'lookup':
        // let the user know we're working
        message.channel.startTyping();
        //Show all notifications for a specific game
        {
          let gameNotifications = await guildStorage.get(Constants.keyName);
          let gameKeys: Array<string> = await Object.keys(gameNotifications);

          //Get all games registered
          let gamesList: string = '';
          for (let i = 0; i < gameKeys.length; i++) {
            gamesList += `\u000d` + gameKeys[i];
          }

          //Ask for message
          message.reply(`What game would you like to see notifications for? (-c to cancel)\u000d\u000dCurrent games:` + gamesList).then((seeNotification: Message) => {
            //Wait for message
            message.channel.awaitMessages(setFilter, { max: 1, time: 40000 }).then(async (collected: Collection<string, Message>) => {
              let gameName: string = collected.first().content;
              let seeNotificationResponse: Message = collected.first();

              if (gameName.toLowerCase() === '-c') {
                //Cancel action
                message.reply('Cancelling action.');
              } else {
                if (await guildStorage.exists(Constants.keyName + '.' + gameName.toLowerCase())) {
                  //Get notifications found in storage
                  let notifications: Array<string> = await guildStorage.get(Constants.keyName + '.' + gameName.toLowerCase());

                  //Add in all notifications
                  let display: string = '';
                  for (let i = 0; i < notifications.length; i++) {
                    display += '\u000d' + (i + 1) + ' : ' + notifications[i];
                  }

                  //Print out using a RichEmbed
                  message.reply({
                    embed: {
                      "author": {
                        "name": this.client.user.username,
                        "icon_url": this.client.user.avatarURL
                      },
                      "description": "Currently **" + notifications.length + "** notifications are registered for **" + gameName + "**.\n```\n" + display + "```",
                      "color": 0x228B22,
                      "timestamp": (new Date),
                      "footer": {
                        "text": "Generated"
                      }
                    }
                  });
                } else {
                  message.reply(`Game '${gameName}' could not be found!`);
                }

                //Clean up all the messages
                message.delete();
                seeNotification.delete();
                seeNotificationResponse.delete();
              }

            }).catch(() => {
              // display output
              message.reply('There was no collected message that passed the filter within the time limit!');
            });
          });
        }
        return message.channel.stopTyping();
      case 'remove':
        // let the user know we're working
        message.channel.startTyping();
        //Remove a single notification for a game
        {
          let gameNotifications = await guildStorage.get(Constants.keyName);
          let gameKeys: Array<string> = await Object.keys(gameNotifications);

          //Get all games registered
          let gamesList: string = '';
          for (let i = 0; i < gameKeys.length; i++) {
            gamesList += `\u000d` + gameKeys[i];
          }

          //Ask for message
          message.reply(`What game would you like to remove a notification from? (-c to cancel)\u000d\u000dCurrent games:` + gamesList).then((seeNotification: Message) => {
            //Wait for message
            message.channel.awaitMessages(setFilter, { max: 1, time: 40000 }).then(async (collected: Collection<string, Message>) => {
              let gameName: string = collected.first().content;
              let seeNotificationResponse: Message = collected.first();

              if (gameName.toLowerCase() === '-c') {
                //Cancel action
                message.reply('Cancelling action.');
              } else {
                if (await guildStorage.exists(Constants.keyName + '.' + gameName.toLowerCase())) {
                  //Get notifications found in storage
                  let notifications: Array<string> = await guildStorage.get(Constants.keyName + '.' + gameName.toLowerCase());

                  //Add in all notifications
                  let display: string = '';
                  for (let i = 0; i < notifications.length; i++) {
                    display += '\u000d' + (i + 1) + ' : ' + notifications[i];
                  }

                  //Print out using a RichEmbed
                  message.reply("Type the number of the notification to remove... (-c to cancel)", {
                    embed: {
                      "author": {
                        "name": this.client.user.username,
                        "icon_url": this.client.user.avatarURL
                      },
                      "description": "Currently **" + notifications.length + "** notifications are registered for **" + gameName + "**.\n```\n" + display + "```",
                      "color": 0x228B22,
                      "timestamp": (new Date),
                      "footer": {
                        "text": "Generated"
                      }
                    }
                  }).then((numberMessage: Message) => {

                    message.channel.awaitMessages(setFilter, { max: 1, time: 40000 }).then(async (collected: Collection<string, Message>) => {
                      let notificationNum: string = collected.first().content
                      let numberResponse: Message = collected.first();

                      if (notificationNum.toLowerCase() === '-c') {
                        //Cancel action
                        message.reply('Cancelling action.');
                      } else {
                        if (!Util.isNumeric(notificationNum)) {
                          message.reply(`You must specify a number valid number from 1-${notifications.length}. ${notificationNum} is not valid!`);
                        } else {
                          let notifyNum: number = Util.intVal(notificationNum);

                          //Make sure number is in the correct range
                          if (notifyNum > 0 && notifyNum <= notifications.length) {
                            let removed: string = notifications[notifyNum - 1];

                            if (notifications.length === 1) {
                              //Remove since there would be no more notifications
                              guildStorage.remove(Constants.keyName + "." + gameName.toLowerCase());
                            } else {
                              //Delete out the entry by using Array.splice
                              notifications.splice(notifyNum - 1, 1);
                              guildStorage.set(Constants.keyName + "." + gameName.toLowerCase(), notifications);
                            }
                            //Give output to user about which message was deleted
                            message.reply(`Removed message ${notifyNum} from ${gameName}. (${removed})`);
                          } else {
                            message.reply(`Number cannot be negative or 0 and must be within the range 1-${notifications.length}. ${notificationNum} is not valid!`);
                          }
                        }
                      }

                      //Clean up all the messages
                      message.delete();
                      seeNotification.delete();
                      seeNotificationResponse.delete();
                      numberMessage.delete();
                      numberResponse.delete()
                    });
                  }).catch(() => {
                    // display output
                    message.reply('There was no collected message that passed the filter within the time limit!');
                  });
                } else {
                  message.reply(`Game '${gameName}' could not be found!`);
                }
              }
            }).catch(() => {
              // display output
              message.reply('There was no collected message that passed the filter within the time limit!');
            });
          });
        }
        return message.channel.stopTyping();
      default:
        return message.reply(`Invalid argument. See help for this command.`);
    }
  }
}
