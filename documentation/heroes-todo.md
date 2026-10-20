# HERO System — Development Todo & Roadmap

## Completed

- [x] Use shared Thing names with classification, specification, and categorization names; model person, place, event, action, and description names from that shared parent.
- [x] Represent special effects as descriptions and model edition-aware advantages, disadvantages/complications, modifiers, characteristics, skills, talents, perks, powers, everyman skills, package deals, frameworks, and variable power pools.
- [x] Derive figured characteristics from points and primary characteristics; retain exact point values and calculate advantages + points = disadvantages.
- [x] Compose equation elements into reusable game objects and worlds, including body shapes, point-level classifications, and physical/sentient/mobile/player-character traits.
- [x] Record authorized character-sheet and rules references in `documentation/heroes-system-references.md`; do not reproduce copyrighted rules text.
- [x] Record the user-provided 5th Edition sheet's identity, characteristics, and combat-information field groups in `documentation/heroes-system-references.md`.
- [x] Record the same sheet's reverse-side character/campaign information, Skills/Perks/Talents and Powers/Equipment tables and totals, and Disadvantages table in `documentation/heroes-system-references.md`.
- [x] Add the HERO Worlds page and paired local-helper SQLite persistence in a database separate from all Wurm files.
- [x] Add edit/update flows for typed HERO elements, adjustable point values, model-trait associations, base-trait specification flags, and removal of non-base extras.
- [x] Compose package-deal children and framework powers as nested editable elements; package child point values contribute to the equation while framework-contained powers stay nested.
- [x] Add an edition-keyed figured-characteristic callback registry; callbacks receive exact point and primary-characteristic inputs plus the normalized edition.
- [x] Record the user-provided `Suburban Base` sheet as a base-object example with narrative description, characteristics, and Abilities & Equipment fields.
- [x] Build all selectable concrete object kinds through one object generator and the same typed HERO element/equation pipeline; derive model traits from the selected object kind.
- [x] Record Base/Vehicle acquisition separately from construction without inferring purchaser ownership or cost formulas; review the distinction against the local 5th Edition reference.
- [x] Confirm the concrete object catalog, explicit trait behavior, and rules-neutral acquisition boundary with the user.
- [x] Make world objects visible in the HERO page and verify create, edit, delete, import, export, and cascading world deletion in an isolated running-UI smoke test; keep pending typed-field validation from blocking object saves.
- [x] Audit and retire the experimental `heroes/objects` tree from supported entry points; it remains unexposed until its imports and defaults are sourced and repaired.
- [x] Connect figured-characteristic formula IDs to 5th Edition callbacks for physical defense, energy defense, speed, recovery, endurance, and stun; preserve exact intermediates and leave unsourced editions unresolved.
- [x] Use typed element short names as sheet labels without assigning new meanings to abbreviations or adding inferred calculations.
- [x] Present character model entries in identity, characteristics, combat, skills/perks/talents, powers/equipment, disadvantages, and totals sections; identity and campaign notes use existing Description entries.
- [x] Present base model entries in narrative description, characteristics, abilities/equipment, and costs sections; construction/acquisition remain separate and no new cost formulas are inferred.
- [x] Derive Agility, Interaction, and Intellect skill base rolls through category-class characteristic references in the shared character element collection; keep Background and Combat skills unbased.
- [x] Derive immutable object model traits from the selected object kind and display them as read-only traits.
- [x] Lock character and object generation to 5th Edition; reject unsupported edition identifiers.
- [x] Provide 5th Edition point-level classification presets that set their modeled point values, with a separate custom classification option.

## Next

Calculations remain limited to existing, researched 5th Edition rules; labels do not imply undocumented formulas.

### Object and Character Model

- [ ] Object model traits should be read only, only for display of what traits exist on the selected object type.
- [ ] Object 0 point items need to be visible in the sheet and have editable interfaces to update the value and change the cost and or the points(cost) to change the value. all items in the elements collection should be visible.
- [ ] Replace the body-shape string specification with an OOP body-shape model. Use it to represent general shape, components, hit locations, called shots, location-specific damage and disabling, and extra-limb changes.
- [ ] Ensure hierarchy-provided zero-point characteristics are visible on generated objects and can receive point investments.
- [ ] Model powers that refer to characteristics or skills as relationships to those same element instances rather than detached copies.
- [ ] Allow one power instance to belong to multiple power categories without duplicating the power.
- [ ] Model rulebook-defined skill specifications as OOP elements and allow custom skill specifications in characters and other objects.
- [ ] Allow custom specifications for special effects.
- [ ] Review both generators for complete OOP ownership: move behavior into the highest appropriate shared object/domain method and remove generator-specific hard-coded domain behavior.
- [ ] Validate object and character generation against the 5th Edition rulebook before beginning interaction implementation.

### Object Interactions

- [ ] After generation is rulebook-aligned, define and implement OOP interaction methods for rule-defined combat, damaging/breaking objects, and non-combat actions.
- [ ] Validate object interactions against the 5th Edition rules before beginning genre-specific features.

### Genre Support

- [ ] Add genre models and player/Game Master assistance after object interactions are rulebook-aligned. Let Game Masters configure house rules and players use the selected Game Master's rules.
- [ ] Implement genres in order: Fantasy Hero, Western Hero, Star Hero, Pulp Fiction Hero, then Champions superheroic worlds that can build on the other genres.

### Engine Evolution

- [ ] After object interactions and genre models are complete and rulebook-aligned, assess, plan, and implement migration of the OOP model and functionality to C#.
- [ ] After the C# implementation, assess turning the model into an object/character/world engine and integrating it with game engines such as Unreal.
- [ ] Keep HERO game-management behavior rule-compliant while exploring a separate game-design mode for scientifically grounded, realism-oriented rates and related concepts.
