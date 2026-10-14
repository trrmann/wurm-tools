import { Name, Names } from './names.mjs';

function normalizeValues(single, multiple) {
  const values = single == null ? [] : [single];
  if (multiple == null) return values;
  if (typeof multiple === 'string' || multiple instanceof String) return values.concat(multiple);
  if (typeof multiple[Symbol.iterator] === 'function') return values.concat(Array.from(multiple));
  return values.concat(multiple);
}

export class ClassificationName extends Name {}
/** @extends {Names<ClassificationName>} */
export class ClassificationNames extends Names {
  static NameType = ClassificationName;
}

export class SpecificationName extends Name {}
/** @extends {Names<SpecificationName>} */
export class SpecificationNames extends Names {
  static NameType = SpecificationName;
}

export class CategorizationName extends Name {}
/** @extends {Names<CategorizationName>} */
export class CategorizationNames extends Names {
  static NameType = CategorizationName;
}

/** Shared named entity parent for people, places, events, actions, and objects. */
export class ThingName extends Name {
  constructor(value = '', metadata = {}) {
    let label = value;
    let options = metadata;
    if (value != null && typeof value === 'object' && !(value instanceof String)) {
      options = value;
      label = options.name ?? options.label ?? '';
    }
    super(label);

    this.classificationNames = new ClassificationNames(
      normalizeValues(
        options.classificationName ?? options.classification,
        options.classificationNames ?? options.classifications
      )
    );
    this.specificationNames = new SpecificationNames(
      normalizeValues(
        options.specificationName ?? options.specification,
        options.specificationNames ?? options.specifications
      )
    );
    this.categorizationNames = new CategorizationNames(
      normalizeValues(
        options.categorizationName ?? options.categorization,
        options.categorizationNames ?? options.categorizations
      )
    );
  }

  get classifications() {
    return this.classificationNames;
  }

  set classifications(values) {
    this.classificationNames = new ClassificationNames(values);
  }

  get specifications() {
    return this.specificationNames;
  }

  set specifications(values) {
    this.specificationNames = new SpecificationNames(values);
  }

  get categorizations() {
    return this.categorizationNames;
  }

  set categorizations(values) {
    this.categorizationNames = new CategorizationNames(values);
  }
}

/** @extends {Names<ThingName>} */
export class ThingNames extends Names {
  static NameType = ThingName;
}

export class EventName extends ThingName {}
/** @extends {Names<EventName>} */
export class EventNames extends ThingNames {
  static NameType = EventName;
}

export class ActionName extends ThingName {}
/** @extends {Names<ActionName>} */
export class ActionNames extends ThingNames {
  static NameType = ActionName;
}

export class DescriptionName extends ThingName {}
/** @extends {Names<DescriptionName>} */
export class DescriptionNames extends ThingNames {
  static NameType = DescriptionName;
}
