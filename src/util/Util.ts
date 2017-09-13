
export default class Util {
  constructor() {
  }

  public static randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public static isNumeric(n: any): n is number | string {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  public static intVal(n: number | string): number {
    return typeof n === "number" ? n : parseInt(n, 10);
  }
}
