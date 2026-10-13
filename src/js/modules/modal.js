// Modal Controller Module
export function setupModal(modalElement, openTriggerElement, closeTriggerElement) {
  if (!modalElement) return null;

  const open = () => {
    modalElement.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    modalElement.style.display = 'none';
    document.body.style.overflow = '';
  };

  if (openTriggerElement) {
    openTriggerElement.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  }

  if (closeTriggerElement) {
    closeTriggerElement.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });
  }

  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) {
      close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalElement.style.display === 'flex') {
      close();
    }
  });

  return { open, close };
}
