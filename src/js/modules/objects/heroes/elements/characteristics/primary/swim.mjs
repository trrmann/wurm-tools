import { Movement } from "../movement.mjs";

export class Swim extends Movement {
    constructor({points=0} = {}) {
        super({points:points});
    }
}