// Concepts & Roadmap Page Object
import { BasePage } from './BasePage.js';
import conceptsTemplate from '../../../../site/concepts/template.html?raw';
import { fill, getShell, getTemplate } from '../template.js';
import { renderShell, setHeader, initSidebar } from '../shell.js';

export const ROADMAP_CATEGORIES = [
  {
    category: '🏰 Settlement & Deed Operations',
    description: 'Tools for planning, expanding, and financing your Wurm settlements.',
    items: [
      {
        title: 'Deed Upkeep & Size Calculator',
        status: 'Active',
        description:
          'Tile dimensions, perimeter buffers, guard upkeep, and runway days based on bank silver.',
      },
      {
        title: 'Perimeter & Border Planner',
        status: 'Planned',
        description:
          'Neighbor buffer rules, perimeter tile costs, and expansion planning without encroachment.',
      },
      {
        title: 'House & Building Material Estimator',
        status: 'Planned',
        description:
          'Planks, bricks, mortar, and roofing materials needed for multi-story deeds and storage facilities.',
      },
      {
        title: 'Deed Roles & Permissions Matrix',
        status: 'Planned',
        description:
          'Visual cheat sheet for Citizen, Ally, Non-citizen, and Enemy permissions across building and forestry.',
      },
    ],
  },
  {
    category: '⏳ Timers, Rituals & Religion',
    description: 'Precision timers and deity favor matrices for active Wurm adventurers.',
    items: [
      {
        title: 'Action & Prayer Timers',
        status: 'Active',
        description:
          '20-minute favor cooldown, 30-minute meditation, 3-hour path ability, and custom timers with audio chimes and desktop alerts.',
      },
      {
        title: 'Priest Favor & Spell Matrix',
        status: 'Planned',
        description:
          'Favor regeneration curves, alignment requirements, and deity spell lists (Fo, Magranon, Vynora, Libila).',
      },
      {
        title: 'Sleep Bonus Duration Tracker',
        status: 'Planned',
        description:
          'Sleep powder countdown, sleep tick optimization, and double-XP skill session scheduler.',
      },
    ],
  },
  {
    category: '🧭 Navigation, Cartography & Travel',
    description: 'Calculators for traversing Wurm’s vast sandbox landscapes.',
    items: [
      {
        title: 'Distance & Bearing Calculator',
        status: 'Active',
        description:
          'Euclidean tile distance, real-world metric conversion (1 tile = 4m), 16-point compass heading, and travel speeds.',
      },
      {
        title: 'Waypoint & Route Planner',
        status: 'Active',
        description:
          'Save custom coordinates in localStorage and plan multi-leg journeys across deed networks.',
      },
      {
        title: 'Slope & Terraforming Helper',
        status: 'Planned',
        description:
          'Calculate dirt/rock counts needed to grade slopes and evaluate cart slope climb limits.',
      },
    ],
  },
  {
    category: '⚒️ Crafting, Metallurgy & Smithing',
    description: 'Guides and calculators for artisans and smiths.',
    items: [
      {
        title: 'Alloy Ratios & Smelting Matrix',
        status: 'Planned',
        description:
          'Exact mass ratios for bronze, brass, steel, and electrum plus fuel duration formulas.',
      },
      {
        title: 'Item Improvement & Max QL Guide',
        status: 'Planned',
        description:
          'Tool quality caps, wear probability, damage repair formulas, and optimal improvement targets.',
      },
      {
        title: 'God Rune Compendium',
        status: 'Planned',
        description:
          'Searchable deity runes, stacking bonuses, decay reduction, and conflict prevention.',
      },
    ],
  },
  {
    category: '🌾 Farming, Agriculture & Cooking',
    description: 'Maximizing harvest yields and nutritional bonuses.',
    items: [
      {
        title: 'Crop & Forestry Starfall Calendar',
        status: 'Planned',
        description:
          'Seasonal Starfall alignment for optimal planting and harvesting of crops and tree sprouts.',
      },
      {
        title: 'CCFP Nutrition Balancer',
        status: 'Planned',
        description:
          'Calorie, Carbohydrate, Fat, and Protein (CCFP) balancing tool for stamina and skill gains.',
      },
      {
        title: 'Animal Breeding & Trait Matrix',
        status: 'Planned',
        description:
          'Trait inheritance tracking (Speed, Strength, Stamina) and gestation stage alerts.',
      },
    ],
  },
  {
    category: '📝 Player Log & Notebook',
    description: 'Personal deed tracking, vein coordinates, and crafting goals.',
    items: [
      {
        title: 'Settlement & Player Notes',
        status: 'Active',
        description:
          'Categorized notes with priority tagging, status filters, and instant JSON backup exports.',
      },
    ],
  },
];

const FILTERS = [
  { filter: 'All', label: 'All Concepts' },
  { filter: 'Active', label: 'Active in Dashboard' },
  { filter: 'Planned', label: 'Planned in Roadmap' },
];

export class ConceptsPage extends BasePage {
  static pageAppID = 'concepts-app';
  constructor() {
    super({
      id: 'concepts',
      title: 'Suite Concepts & Roadmap',
      description: 'Comprehensive architectural roadmap and planned feature concepts',
    });

    this.filter = 'All';
    this.teardownSidebar = null;
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  render() {
    if (!this.container) return;
    this.viewport = renderShell(this.container);
    setHeader('Concepts & Roadmap', 'Modular companion suite for Wurm Online and Wurm Unlimited.');
    this.renderContent();
  }

  renderContent() {
    const filterTpl = getTemplate(conceptsTemplate, 'concepts-filter-template');
    this.viewport.innerHTML = fill(getShell(conceptsTemplate), {
      filters: FILTERS.map(({ filter, label }) =>
        fill(filterTpl, {
          filter,
          label,
          variant: this.filter === filter ? 'btn-primary' : 'btn-secondary',
        })
      ).join(''),
      categories: this.renderCategories(),
    });
    this.viewport
      .querySelectorAll('.filter-btn')
      .forEach((btn) => btn.addEventListener('click', this.handleFilterChange));
  }

  renderCategories() {
    const cardTpl = getTemplate(conceptsTemplate, 'concepts-card-template');
    const itemTpl = getTemplate(conceptsTemplate, 'concepts-item-template');

    return ROADMAP_CATEGORIES.map((cat, index) => {
      const items = cat.items.filter(
        (item) => this.filter === 'All' || item.status === this.filter
      );
      if (items.length === 0) return '';

      return fill(cardTpl, {
        index,
        category: cat.category,
        description: cat.description,
        items: items
          .map((item) => {
            const active = item.status === 'Active';
            return fill(itemTpl, {
              state: active ? 'active' : 'planned',
              badgeClass: active ? 'badge-active' : 'badge-planned',
              badge: active ? '✓ Active' : '⏳ Planned',
              title: item.title,
              description: item.description,
            });
          })
          .join(''),
      });
    }).join('');
  }

  renderTopics(nav, filter) {
    const q = filter.trim().toLowerCase();
    const itemTpl = getTemplate(conceptsTemplate, 'concepts-nav-item-template');
    const items = ROADMAP_CATEGORIES.map((cat, index) => ({ cat, index }))
      .filter(({ cat }) => cat.category.toLowerCase().includes(q))
      .map(({ cat, index }) => fill(itemTpl, { index, category: cat.category }))
      .join('');
    nav.innerHTML = items
      ? fill(getTemplate(conceptsTemplate, 'concepts-nav-template'), { items })
      : '<div class="nav-empty-state">No topics matched</div>';
    nav.querySelectorAll('.nav-item-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById(btn.dataset.topic)?.scrollIntoView({ behavior: 'smooth' });
      })
    );
  }

  bindEvents() {
    this.teardownSidebar = initSidebar({
      searchLabel: 'Search topics...',
      renderList: (nav, filter) => this.renderTopics(nav, filter),
      onSelectTool: () => {},
    });
  }

  unbindEvents() {
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }

  handleFilterChange(e) {
    const targetFilter = e.currentTarget.getAttribute('data-filter');
    if (!targetFilter || targetFilter === this.filter) return;

    this.filter = targetFilter;
    this.renderContent();
  }
}
