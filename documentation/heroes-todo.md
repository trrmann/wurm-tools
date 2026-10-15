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

## Next

- [ ] **Highest priority — verify CRUD:** Make the selected world's object list visible and usable for review; verify per-object edit/delete and world deletion including its objects; retain working world/object import and export. Confirm these workflows in the running UI, not only at the storage/API layer.
- [ ] **Get user design guidance before changing the object editor:** Define the object-type hierarchy and composable relationships. Candidate concepts from the user: object, equipment, vehicle, base, automaton, computer, AI, creature, NPC, and PC; these should compose without assuming one rigid inheritance chain. Define physical/non-physical, sentient/non-sentient, and mobile/non-mobile traits, base-trait rules, and which characteristics, advantages, disadvantages, and limitations each supports.
- [ ] **User glossary needed:** Define the sheet abbreviations and headings before assigning interface labels or semantics: STR, DEX, CON, BODY, INT, EGO, PRE, COM, OCV, DCV, END, DEF, Val, Char, Base, Cost, Points, Roll, and Notes.
- [ ] **Character editor:** Reshape the object editor around the documented 5th-edition sheet sections: identity, character/campaign information, characteristics, combat information, skills/perks/talents, powers/equipment, disadvantages, and totals. Wait for user definitions where labels or formulas are ambiguous.
- [ ] **Base editor:** Build a base-object view from the documented `Suburban Base` example: narrative description, characteristics, abilities/equipment, and costs. Wait for user definitions of BODY, DEF, CON, and cost semantics where the rulebook does not settle project-specific usage.
- [ ] Connect saved figured-characteristic formula IDs to registered callbacks in the editor; consult the local 5th-edition rulebook for 5e formulas, preserve edition-specific callbacks, and keep other editions unresolved until their formulas are sourced.
