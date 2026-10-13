// Concepts & Roadmap Page Object
import { BasePage } from './BasePage.js';

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

export class ConceptsPage extends BasePage {
  constructor() {
    super({
      id: 'concepts',
      title: 'Suite Concepts & Roadmap',
      description: 'Comprehensive architectural roadmap and planned feature concepts',
    });

    this.filter = 'All';
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="concepts-page-container">
        <header class="concepts-header">
          <div>
            <div class="concepts-title-row">
              <span class="concepts-icon">📜</span>
              <h1 class="concepts-title">Wurm Tools — Concepts & Roadmap</h1>
            </div>
            <p class="concepts-subtitle">
              Modular client-side companion suite for Wurm Online and Wurm Unlimited.
            </p>
          </div>
          <div class="concepts-header-actions">
            <a href="/" class="btn btn-secondary concepts-back-btn">
              <span>←</span> Back to Dashboard
            </a>
          </div>
        </header>

        <div class="concepts-filter-bar">
          <button class="filter-btn btn ${this.filter === 'All' ? 'btn-primary' : 'btn-secondary'}" data-filter="All">All Concepts</button>
          <button class="filter-btn btn ${this.filter === 'Active' ? 'btn-primary' : 'btn-secondary'}" data-filter="Active">Active in Dashboard</button>
          <button class="filter-btn btn ${this.filter === 'Planned' ? 'btn-primary' : 'btn-secondary'}" data-filter="Planned">Planned in Roadmap</button>
        </div>

        <div class="concepts-categories-grid" id="concepts-grid">
          ${this.renderCategories()}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderCategories() {
    return ROADMAP_CATEGORIES.map((cat) => {
      const items = cat.items.filter((item) => {
        if (this.filter === 'All') return true;
        return item.status === this.filter;
      });

      if (items.length === 0) return '';

      return `
        <div class="card concepts-card">
          <div class="card-header concepts-category-header">
            <h2 class="concepts-category-title">${cat.category}</h2>
            <p class="concepts-category-desc">${cat.description}</p>
          </div>
          <div class="card-body concepts-items-list">
            ${items
              .map(
                (item) => `
              <div class="concepts-item-box ${item.status === 'Active' ? 'active' : 'planned'}">
                <div class="concepts-item-header">
                  <h3 class="concepts-item-title">${item.title}</h3>
                  <span class="badge-tag ${item.status === 'Active' ? 'badge-active' : 'badge-planned'}">
                    ${item.status === 'Active' ? '✓ Active' : '⏳ Planned'}
                  </span>
                </div>
                <p class="concepts-item-desc">${item.description}</p>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  bindEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', this.handleFilterChange);
    });
  }

  unbindEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.removeEventListener('click', this.handleFilterChange);
    });
  }

  handleFilterChange(e) {
    const targetFilter = e.currentTarget.getAttribute('data-filter');
    if (!targetFilter || targetFilter === this.filter) return;

    this.filter = targetFilter;
    this.render();
  }
}
