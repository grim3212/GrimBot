import { Client, ListenerUtil, GuildStorage, GuildSettings, Time, Difference } from 'yamdbf';
import { Presence, Game, GuildMember, Channel, TextChannel } from 'discord.js';
import Constants from './util/Constants';
import Util from './util/Util';
const config: any = require('../config.json');
const { once, on } = ListenerUtil;
const path = require('path');

class GrimBot extends Client {
  public constructor() {
    super({
      token: config.token,
      owner: config.owner,
      statusText: 'try @mention help',
      readyText: 'GrimBot is locked and loaded',
      commandsDir: path.join(__dirname, 'commands'),
      pause: true
    });
  }

  @once('pause')
  private async _onPause(): Promise<void> {
    await this.setDefaultSetting('prefix', '?');
    await this.setDefaultSetting(Constants.showNotificationName, true);
    await this.setDefaultSetting(Constants.useWaitTimeName, false);
    await this.setDefaultSetting(Constants.waitTimeName, 300000);
    this.continue();
  }

  @once('disconnect')
  private _onDisconnect(): void {
    process.exit();
  }

  @once('clientReady')
  private _onClientReady(): void {
    console.log(`Client ready! Serving ${this.guilds.size} guilds with ${this.users.size} users on ${this.channels.size} channels.`);

    for (let i = 0; i < this.users.size; i++) {
      console.log(this.users.array()[i].username + '-' + this.users.array()[i].id);
    }
  }

  @on('presenceUpdate')
  private async _onPresenceUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const guildSettings: GuildSettings = this.storage.guilds.get(newMember.guild.id).settings;


    if (await guildSettings.get(Constants.showNotificationName)) {
      let channelId: string = await guildSettings.get(Constants.channelName);
      if (channelId && this.channels.has(channelId)) {
        if ((!oldMember.presence.game || (oldMember.presence.game && newMember.presence.game && oldMember.presence.game.name !== newMember.presence.game.name)) && (newMember.presence.game && newMember.presence.game.name)) {
          if (await guildSettings.get(Constants.useWaitTimeName)) {
            let waitTime: number = await guildSettings.get(Constants.waitTimeName);
            const guildStorage: GuildStorage = this.storage.guilds.get(newMember.guild.id);

            if (await guildStorage.exists(Constants.lastNotificationName + '.' + newMember.id)) {
              let oldTime: number = await guildStorage.get(Constants.lastNotificationName + '.' + newMember.id);
              let currentTime: number = new Date().getTime();
              //Check if the current time has passed the wait time
              if ((currentTime - oldTime) >= waitTime) {
                await this._tryShowGameNotification(oldMember, newMember, true, channelId);
              } else {
                let waitedDif: Difference = Time.difference(currentTime, oldTime);
                let waitDif: Difference = Time.difference(oldTime + waitTime, currentTime);

                console.log(`Not enough time has passed! Must wait ${waitDif.toSimplifiedString()} more. Waited  ${waitedDif.toSimplifiedString()}.`);
              }
            } else {
              await this._tryShowGameNotification(oldMember, newMember, true, channelId);
            }
          } else {
            await this._tryShowGameNotification(oldMember, newMember, false, channelId);
          }
        }
      } else {
        console.log(`'No channel found with id '${channelId}'.`)
      }
    }
  }

  private async _tryShowGameNotification(oldMember: GuildMember, newMember: GuildMember, waitTime: boolean, channelId: string): Promise<void> {
    const key: string = `${Constants.keyName}.${newMember.presence.game.name.toLowerCase()}`;
    const guildStorage: GuildStorage = this.storage.guilds.get(newMember.guild.id);
    let sending: Array<string> = await guildStorage.get(key);

    if (sending) {
      //Get random message
      let message: string = sending[Util.randInt(0, sending.length - 1)];
      let channel: Channel = this.channels.get(channelId);

      if (channel.type) {
        //Change on channel type in case of being set to a different channel
        if (channel.type === 'text') {
          (<TextChannel>channel).send(message.replace('<game>', `${newMember.presence.game.name}`).replace('<user>', `<@${newMember.id}>`));
        } else {
          //Somehow the channel is not a text channel
          console.log(`Channel type can only be 'text', DM channels are not allowed.`);
        }
      }

      //Set the wait time
      if (waitTime)
        guildStorage.set(Constants.lastNotificationName + '.' + newMember.id, new Date().getTime());
    }
  }
}
const gBot: GrimBot = new GrimBot();
gBot.start();

process.on('unhandledRejection', (err: any) => console.error(err));
