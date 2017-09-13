import { Command, Message, Middleware, CommandDecorators } from 'yamdbf';
import { Collection } from 'discord.js';
import Util from '../../util/Util';

const { resolve, expect } = Middleware;
const { using } = CommandDecorators;

export default class extends Command {
  public constructor() {
    super({
      name: 'clean',
      desc: 'Remove the last given quantity of messages from the channel (-a for all messages)',
      usage: '<prefix>clean <quantity>',
      info: 'If a number is given it must be in the range 0<num<=100.',
      group: 'clean',
      guildOnly: true
    });
  }

  public async action(message: Message, args: string[]): Promise<any> {
    if (!args[0])
      return message.reply('You must enter a number of messages to purge or -a for everything.');

    let numDeleted: number = 0;

    if (args[0] === '-a') {
      let messages: Collection<string, Message>;
      messages = (await message.channel.fetchMessages(
        { limit: 100, before: message.id }));
      message.delete();

      if (messages.size == 1) {
        await messages.array()[0].delete();
        numDeleted += 1;
      } else if (messages.size == 0) {
        return message.reply(`No messages were found!`);
      } else {
        //Delete in bulk
        numDeleted = (await message.channel.bulkDelete(messages)).size;

        //Only check for more if we made it to the full 100
        if (numDeleted == 100) {
          //Try and get all other messages
          while ((messages = await message.channel.fetchMessages({ limit: 100, before: messages.array()[messages.size - 1].id })).size > 0) {
            if (messages.size == 1) {
              await messages.array()[0].delete();
              numDeleted += 1;
            } else {
              numDeleted += (await message.channel.bulkDelete(messages)).size;
            }
          }
        }
      }
    } else if (Util.isNumeric(args[0])) {
      let num: number = Util.intVal(args[0]);

      if (num > 0 && num <= 100) {
        let messages: Collection<string, Message>;
        messages = (await message.channel.fetchMessages(
          { limit: num, before: message.id }));
        message.delete();

        if (messages.size == 1) {
          await messages.array()[0].delete();
          numDeleted = 1;
        } else if (messages.size == 0) {
          return message.reply(`No messages were found!`);
        } else {
          numDeleted = (await message.channel.bulkDelete(messages)).size;
        }
      } else {
        return message.reply(`Number was found but not in the range (0<num<=100). ${args[0]} is not valid!`);
      }
    } else {
      return message.reply(`You must enter a number of messages to purge or -a for everything. ${args[0]} is not valid!`);
    }

    return message.channel.send(`<@${message.author.id}>, Clean up completed ${numDeleted} messages removed.`);
  }
}
