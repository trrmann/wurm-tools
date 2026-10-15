import { Characteristics } from '../../characteristics/characteristics.mjs';
import { Comeliness } from '../../elements/characteristics/primary/comeliness.mjs';

export class GameObject {
    #id;
    #characteristics;
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
        this.#characteristics = new Characteristics({points: 0});
        this.#characteristics.Add(new Comeliness({points: 0}));
        this.position = { x: 0, y: 0, z: 0 };
    }
    get id() { return this.#id; }
    get unallocatedPoints() { return this.#unallocatedPoints; }
    get points() { return this.#unallocatedPoints + this.#characteristics.points(); }
    get basePoints() { return this.#basePoints; }
    get maxDisadvantagePoints() { return this.#maxDisadvantagePoints; }
    get maxPointsFromAnyOneTypeOfDisadvantage() { return this.#maxPointsFromAnyOneTypeOfDisadvantage; }
    get characteristics() { return this.#characteristics; }
    get comeliness() { return this.#characteristics.Get('Comeliness'); }
}