 
  // Navigation click handler for inventory dropdown items
  document.querySelectorAll('[data-target]').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('data-target');

      // Hide all sections
      document.querySelectorAll('.page-content').forEach(section => {
        section.classList.add('hidden');
      });

      // Show the selected section
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
      }
    });
  });

  function toggleSubInventory() {
    const submenu = document.getElementById("sub-inventory-links");
    const icon = document.getElementById("inventory-toggle-icon");
    submenu.classList.toggle("hidden");
    icon.classList.toggle("fa-chevron-down");
    icon.classList.toggle("fa-chevron-up");
  }
    
