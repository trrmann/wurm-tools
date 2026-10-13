// Modal Controller Module
export class Modal {
  #modalElementId;
  #openTriggerElementId;
  #closeTriggerElementId;
  #modalElement() {
    return document.getElementById(this.#modalElementId);
  }
  #openTriggerElement() {
    return document.getElementById(this.#openTriggerElementId);
  }
  #closeTriggerElement() {
    return document.getElementById(this.#closeTriggerElementId);
  }
  #open = () => {
    this.#modalElement().style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };
  #close = () => {
    this.#modalElement().style.display = 'none';
    document.body.style.overflow = '';
  };
  constructor(modalElementId, openTriggerElementId, closeTriggerElementId) {
    if (!modalElementId || !document.getElementById(modalElementId)) {
      throw new Error('Modal element is required');
    } else {
      this.#modalElementId = modalElementId;
      this.#openTriggerElementId = openTriggerElementId;
      this.#closeTriggerElementId = closeTriggerElementId;
      if (this.#openTriggerElement()) {
        this.#openTriggerElement().addEventListener('click', (e) => {
          e.preventDefault();
          this.#open();
        });
      }
      if (this.#closeTriggerElement()) {
        this.#closeTriggerElement().addEventListener('click', (e) => {
          e.preventDefault();
          this.#close();
        });
      }
      this.#modalElement().addEventListener('click', (e) => {
        if (e.target === this.#modalElement()) {
          this.#close();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.#modalElement().style.display === 'flex') {
          this.#close();
        }
      });
    }
  }
  get Triggers() {
    return { open: this.#open, close: this.#close };
  }
}
