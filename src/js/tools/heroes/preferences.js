export const HEROES_ROLE_HOMES = Object.freeze({
  admin: '/site/heroes/people/admins/',
  'game-master': '/site/heroes/people/',
  player: '/site/heroes/people/players/',
  visitor: '/site/heroes/public/',
});

export function heroesRoleLocation(role, saved) {
  if (
    typeof saved === 'string' &&
    saved.length <= 2048 &&
    /^\/site\/heroes\/(?:[a-z-]+\/)*(?:\?[^#]*)?$/.test(saved) &&
    !/\/(?:login|logout|register|setup)(?:\/|$)/.test(saved)
  )
    return saved;
  return HEROES_ROLE_HOMES[role] || '/site/heroes/account/';
}
