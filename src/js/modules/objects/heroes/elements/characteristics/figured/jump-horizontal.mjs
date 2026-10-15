import { Movement } from "../movement.mjs";

export class HorizontalJump extends Movement {
    constructor({points=0} = {}) {
        super({points:points});
    }
}