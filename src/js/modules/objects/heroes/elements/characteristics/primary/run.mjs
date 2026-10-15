import { Movement } from "../movement.mjs";

export class Run extends Movement {
    constructor({points=0} = {}) {
        super({points:points});
    }
}