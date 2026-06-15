document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // SPLASH SCREEN
  // ==========================================
  const splash = document.getElementById('splash-screen');
  if (splash) {
    // Esconde o splash após 2 segundos (simulando carregamento)
    setTimeout(() => {
      splash.classList.add('hidden');
    }, 2000);
  }

  // ==========================================
  // SIDEBAR TOGGLE
  // ==========================================
  const appLayout = document.getElementById('app-layout');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (appLayout && sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      appLayout.classList.toggle('sidebar-collapsed');
    });
  }

  // Navigation Logic
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  function navigateTo(viewId) {
    // Hide all views
    viewSections.forEach(section => {
      section.classList.remove('active');
    });

    // Remove active class from all nav items
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Set active nav item
    const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNav) {
      activeNav.classList.add('active');
    }
    
    // Switch between login layout and app layout
    if (viewId === 'login') {
      document.getElementById('login-layout').classList.remove('hidden');
      document.getElementById('app-layout').classList.add('hidden');
    } else {
      document.getElementById('login-layout').classList.add('hidden');
      document.getElementById('app-layout').classList.remove('hidden');
    }
  }

  // Expose global nav functions for inline onclick events
  window.navigateTo = navigateTo;

  window.openPatientRecord = function(patientId) {
    navigateTo('prontuario');
  };

  window.backToPatients = function() {
    navigateTo('pacientes');
  };

  // Bind navigation clicks
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const viewId = item.getAttribute('data-view');
      if (viewId) {
        navigateTo(viewId);
      }
    });
  });

  // Login form submit simulation
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Simulate login loading
      const btn = loginForm.querySelector('.btn-primary');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg class="animate-spin" style="width:16px;height:16px;animation: spin 1s linear infinite;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Entrando...';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        navigateTo('dashboard');
      }, 1000);
    });
  }

  // Modal Logic
  const modalTriggers = document.querySelectorAll('[data-modal-target]');
  const modalCloses = document.querySelectorAll('[data-modal-close]');

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('active');
    }
  }

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalId = trigger.getAttribute('data-modal-target');
      openModal(modalId);
    });
  });

  modalCloses.forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal);
    });
  });

  // Close modal when clicking outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });

  // Tabs Logic
  const tabTriggers = document.querySelectorAll('.tab');
  tabTriggers.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab-target');
      const tabGroup = tab.closest('.tabs');
      
      // Update active tab
      tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Hide all contents for this group
      // Assumes content divs are siblings or within a specific container
      // Simplification for prototype:
      const container = tabGroup.nextElementSibling;
      if (container && container.classList.contains('tab-content-container')) {
        container.querySelectorAll('.tab-pane').forEach(pane => {
           pane.classList.add('hidden');
        });
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.remove('hidden');
      }
    });
  });

  // Stepper Logic (Simulated for Aplicação)
  const nextStepBtns = document.querySelectorAll('.next-step-btn');
  const prevStepBtns = document.querySelectorAll('.prev-step-btn');

  function updateStepper(stepperContainer, currentStepIndex) {
    const steps = stepperContainer.querySelectorAll('.step');
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index < currentStepIndex) {
        step.classList.add('completed');
      } else if (index === currentStepIndex) {
        step.classList.add('active');
      }
    });
  }

  function showStepContent(container, stepIndex) {
    const panes = container.querySelectorAll('.step-pane');
    panes.forEach((pane, index) => {
      if (index === stepIndex) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });
  }

  nextStepBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const container = e.target.closest('.stepper-flow-container');
      const stepper = container.querySelector('.stepper');
      let currentStep = parseInt(container.getAttribute('data-current-step') || '0');
      const totalSteps = stepper.querySelectorAll('.step').length;

      if (currentStep < totalSteps - 1) {
        currentStep++;
        container.setAttribute('data-current-step', currentStep);
        updateStepper(stepper, currentStep);
        showStepContent(container, currentStep);
      }
    });
  });

  prevStepBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const container = e.target.closest('.stepper-flow-container');
      const stepper = container.querySelector('.stepper');
      let currentStep = parseInt(container.getAttribute('data-current-step') || '0');

      if (currentStep > 0) {
        currentStep--;
        container.setAttribute('data-current-step', currentStep);
        updateStepper(stepper, currentStep);
        showStepContent(container, currentStep);
      }
    });
  });

  // Initialize first view
  navigateTo('login');
});

// CSS Animation definition injected via JS for convenience
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
