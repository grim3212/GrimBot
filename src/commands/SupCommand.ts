import { Command, Message } from 'yamdbf';

export default class SupCommand extends Command
{
	public constructor()
	{
		super({
			name: 'sup',
			desc: 'Says sup!',
			usage: '<prefix>sup'
		});
	}

	public action(message: Message): void
	{
		message.reply(`Sup ${message.member.displayName}!`);
	}
}
