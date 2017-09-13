export type GrimBotConstants = {
  gnRegExp: RegExp;
  getRegExp: RegExp;

  keyName: string;
  lastNotificationName: string;
  waitTimeName: string;
  useWaitTimeName: string;
  showNotificationName: string;
  channelName: string;
};

const Constants: GrimBotConstants = <any>{};

// RegExp
Constants.gnRegExp = new RegExp('[^\,\\s][^\,]*[^\,\\s]*', 'ig');
Constants.getRegExp = new RegExp('\.gr\\s', 'i');
Constants.keyName = 'GameNotifications';
Constants.lastNotificationName = 'LastNotifications';
Constants.showNotificationName = Constants.keyName + '.showGameNotifications';
Constants.useWaitTimeName = Constants.keyName + '.useWaitTime';
Constants.waitTimeName = Constants.keyName + '.waitTime';
Constants.channelName = Constants.keyName + '.channel';

export default Constants;
