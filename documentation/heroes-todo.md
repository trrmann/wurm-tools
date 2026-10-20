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
- [x] Build all selectable concrete object kinds through one object generator and the same typed HERO element/equation pipeline; keep object traits explicit.
- [x] Record Base/Vehicle acquisition separately from construction without inferring purchaser ownership or cost formulas; review the distinction against the local 5th Edition reference.
- [x] Confirm the concrete object catalog, explicit trait behavior, and rules-neutral acquisition boundary with the user.
- [x] Make world objects visible in the HERO page and verify create, edit, delete, import, export, and cascading world deletion in an isolated running-UI smoke test; keep pending typed-field validation from blocking object saves.
- [x] Audit and retire the experimental `heroes/objects` tree from supported entry points; it remains unexposed until its imports and defaults are sourced and repaired.
- [x] Connect figured-characteristic formula IDs to 5th Edition callbacks for physical defense, energy defense, speed, recovery, endurance, and stun; preserve exact intermediates and leave unsourced editions unresolved.
- [x] Use typed element short names as sheet labels without assigning new meanings to abbreviations or adding inferred calculations.
- [x] Present character model entries in identity, characteristics, combat, skills/perks/talents, powers/equipment, disadvantages, and totals sections; identity and campaign notes use existing Description entries.
- [x] Present base model entries in narrative description, characteristics, abilities/equipment, and costs sections; construction/acquisition remain separate and no new cost formulas are inferred.
- [x] Derive Agility, Interaction, and Intellect skill base rolls through category-class characteristic references in the shared character element collection; keep Background and Combat skills unbased.

## Next

No outstanding HERO todos remain. Display labels use the model's short names; ambiguous sheet headings remain labels only, and calculations remain limited to existing model behavior.

the object model traits should be coming from the object kind not changeable, these might be helpful to derive and display but not typically useful to a player.
point level classification should have a selection of the types that feeds teh point level value. at this time there is no other edition information, best to lock the edition to 5th.
we need to develop body shape, as it needs oop definition, that can derive the other information needed for game play based on it, such as hit location, called shots, specific location damage tracking, specific location disabled, extra limbs modifications to body shape, object general shape and potential components of the object, etc.
in an object, the heirachy adds characterists to the collection of elements at zero point, these have value at 0 points becuase of the base, this need to be visible and able to place points into them.
there are powers that name back to skills and characteristics, these need to be related properly as they are the same element, these need to be reflected in the OOP model and not removed from it.
there are powers that belong to more than 1 power category, they are the same power and need to also be treated the same in the OOP model.
there are skills that have deeper specification in the rule book that needs to be allowed in the object generation(including charcaters). these should ahve the listed items as OOP elements and the ability to add a custom specification.
the special effects need to be able to add a custom specification as well.
review the object and character generators and be use that full OOP is being used, not internal helpers or hard coded behavior to the generator should be allowed, these should fing the most appropriate highest level common object and it should be a method of that object used.
once object generation matched the rulebook 100% then we need to review object interaction and generate the appropriate interaction methods in the OOP model in order to resolve the cases that are defined in the rules, such as combat, breaking things, and non combat actions.
once the object interaction is 100% compliant to the game rules, need to add the genre specifications and develope out the assistance for those genres for players and game masters. allowing game master to adjust house rules and the players who select that game master use them. the first genre should be the fantasy hero, then western hero, then star hero, then pulp fiction hero, then open up to champions superhero worlds that should be able to lean on the other genres as well.
once the object interaction and genre models are complete is 100% defined to match the rulebook a review of potential migration of this full OOP object model to C# should be identified, planned and implemented, migrating functionality appropriately.
once c# is complete review the potential conversion of this OOP model into a object/character/world engine, and its capability to integrate with game engines such as unreal.
while maintaining the ability to not break from the rules as a heros game management tool add the funcitonality to improve this engine to be used in game implementation of concepts aligned with other tools used in game design.
