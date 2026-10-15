import { Movement } from "../movement.mjs";

export class VerticalJump extends Movement {
    constructor({points=0} = {}) {
        super({points:points});
    }
}