// src/navigation.js

/**
 * This script adds a "Torna all'Indice" button to all pages
 * that include it. It uses the API exposed by preload.js for navigation.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Create the button
  const backButton = document.createElement('button');
  backButton.textContent = 'Torna all\'Indice';
  
  // Style the button to be fixed at the bottom-right with an orange color scheme.
  backButton.className = 'fixed bottom-4 right-4 bg-orange-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-75 transition-transform transform hover:scale-105';

  // Add the click event to navigate home
  backButton.addEventListener('click', () => {
    if (window.api && window.api.navigateHome) {
      // Use the dedicated function to return home
      window.api.navigateHome();
    } else {
      console.error('Navigation API not found. Ensure the preload script is loaded correctly.');
    }
  });

  // Add the button to the document body
  document.body.appendChild(backButton);
});
