// src/navigation.js

/**
 * Questo script aggiunge un pulsante "Torna all'Indice" a tutte le pagine
 * che lo includono. Utilizza l'API esposta da preload.js per la navigazione.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Crea il pulsante
  const backButton = document.createElement('button');
  backButton.textContent = 'Torna all\'Indice';
  
  // Stile del pulsante (ricalca quello dei link in index.html)
  backButton.className = 'absolute top-4 left-4 bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-transform transform hover:scale-105';

  // Aggiunge l'evento di click per tornare all'indice
  backButton.addEventListener('click', () => {
    // Usiamo l'API esposta per navigare in modo sicuro
    if (window.api && window.api.navigateTo) {
      window.api.navigateTo('src/index.html');
    } else {
      console.error('API di navigazione non trovata. Assicurati che il preload script sia caricato correttamente.');
    }
  });

  // Aggiunge il pulsante al body del documento
  document.body.appendChild(backButton);
});
