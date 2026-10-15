import { Skill } from './elements/skills/skills.mjs';

export class Software extends Skill {
    constructor({Points=0} = {}) {
        super({Points: Points});
    }
}
