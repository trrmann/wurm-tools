import { Characteristic } from "./characteristics.mjs";

export class Movement extends Characteristic {
    constructor({points=0} = {}) {
        super({points:points});
    }
}