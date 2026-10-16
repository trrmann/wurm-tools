import { Collection } from '../../../collection.mjs'
import { Characteristics } from '../elements/characteristics/characteristics.mjs';
import { PrimaryCharacteristics } from '../elements/characteristics/primary-characteristics/primary-characteristics.mjs';
import { FiguredCharacteristics } from '../elements/characteristics/figured-characteristics/figured-characteristics.mjs';
import { Comeliness } from '../elements/characteristics/primary-characteristics/comeliness-characteristics.mjs';
import { Presence } from '../elements/characteristics/primary-characteristics/presence-characteristics.mjs';
import { PackageDeals } from '../elements/package-deals/package-deals.mjs';
import { Skills } from '../elements/skills/skills.mjs'
import { Perks } from '../elements/perks/perks.mjs'
import { Powers } from '../elements/powers/powers.mjs'
import { Talents } from '../elements/talents/talents.mjs'
import { Disadvantages } from '../elements/disadvantages/disadvantages.mjs'
import { CharacterElement } from '../elements/character-elements.mjs';
// TODO - need to add special effects - (this should be defined as a heros object called special effect with a collection of them called special effects)
export class GameObject {
    #id;
    #characterElements;
    #unallocatedPoints;
    #basePoints;
    #maxDisadvantagePoints;
    #maxPointsFromAnyOneTypeOfDisadvantage;
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        this.#id = crypto.randomUUID();
        this.#unallocatedPoints = points;
        this.#basePoints = basePoints;
        this.#maxDisadvantagePoints = maxDisadvantagePoints;
        this.#maxPointsFromAnyOneTypeOfDisadvantage = maxPointsFromAnyOneTypeOfDisadvantage;
        this.#characterElements = new CharacterElement();
        this.Add(new Comeliness({points: 0}));
        this.Add(new Presence({points: 0}));
        //this.Add(new Size({points: 0}));
        this.position = { x: 0, y: 0, z: 0 };
    }
    get id() { return this.#id; }
    get unallocatedPoints() { return this.#unallocatedPoints; }
    get points() { return this.#unallocatedPoints + this.characterElements.points(); }
    get basePoints() { return this.#basePoints; }
    get maxDisadvantagePoints() { return this.#maxDisadvantagePoints; }
    get maxPointsFromAnyOneTypeOfDisadvantage() { return this.#maxPointsFromAnyOneTypeOfDisadvantage; }
    get characterElements() { return this.#characterElements; }
    get characteristics() { return Characteristics.Filter(this.characterElements); }
    get primaryCharacteristics() { return PrimaryCharacteristics.Filter(this.characterElements); }
    get figuredCharacteristics() { return FiguredCharacteristics.Filter(this.characterElements); }
    get skills() { return Skills.Filter(this.characterElements); }
    get packageDeals() { return PackageDeals.Filter(this.characterElements); }
    get perks() { return Perks.Filter(this.characterElements); }
    get powers() { return Powers.Filter(this.characterElements); }
    get talents() { return Talents.Filter(this.characterElements); }
    get disadvantages() { return Disadvantages.Filter(this.characterElements); }
    get comeliness() { return Comeliness.Filter(this.characterElements); }
    Add(element) {
        if(element instanceof CharacterElement) {
            this.#characterElements.Add(element);
        }
        else {
            throw new Error("Element must be an instance of CharacterElement");
        }
    }
    Get(elementName) {
        return this.#characterElements.Get(elementName);
    }
}

/** @extends {Collection<GameObject>} */
export class GameObjects extends Collection {

}