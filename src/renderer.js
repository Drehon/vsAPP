/**
 * Questo script gestisce la logica per la schermata Home (index.html).
 * Il suo compito è recuperare la lista dei file di contenuto e visualizzarli come link.
 */

/**
 * Popola una lista nell'HTML con i file trovati in una data cartella.
 * @param {string} directory - Il nome della cartella da cui caricare i file ('lessons' o 'exercises').
 * @param {string} elementId - L'ID dell'elemento HTML in cui inserire la lista.
 */
async function populateFileList(directory, elementId) {
  const listElement = document.getElementById(elementId);
  if (!listElement) {
    console.error(`Elemento con ID '${elementId}' non trovato.`);
    return;
  }

  try {
    // Usa l'API esposta dal preload script per ottenere i file
    const files = await window.api.getFiles(directory);

    if (files.length === 0) {
      // Lascia il messaggio di default se non ci sono file
      listElement.innerHTML = `<p class="text-slate-500">Nessun file trovato in /${directory}.</p>`;
      return;
    }

    // Pulisce il contenitore
    listElement.innerHTML = '';

    // Crea un link per ogni file trovato
    files.forEach(file => {
      const link = document.createElement('a');
      link.href = '#'; // Usiamo # per prevenire il ricaricamento della pagina
      
      // Pulisce il nome del file per la visualizzazione (es. 'L1-congiuntivo.html' -> 'L1 congiuntivo')
      link.textContent = file.replace('.html', '').replace(/-/g, ' ');

      link.className = 'block p-3 bg-slate-100 rounded-md hover:bg-indigo-100 hover:text-indigo-800 transition-colors font-medium';
      
      // Aggiunge l'evento click per la navigazione
      link.addEventListener('click', (e) => {
        e.preventDefault(); // Previene il comportamento di default del link
        const filePath = `${directory}/${file}`;
        window.api.navigateTo(filePath);
      });

      listElement.appendChild(link);
    });
  } catch (error) {
    console.error(`Errore nel popolare la lista per '${directory}':`, error);
    listElement.innerHTML = `<p class="text-red-500">Impossibile caricare la lista dei file.</p>`;
  }
}

// Mostra la versione dell'app
async function displayAppVersion() {
    const version = await window.api.getAppVersion();
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        versionElement.innerText = version;
    }
}

// Quando il documento è completamente caricato, popola entrambe le liste.
document.addEventListener('DOMContentLoaded', () => {
  populateFileList('lessons', 'lessons-list');
  populateFileList('exercises', 'exercises-list');
  displayAppVersion();
});
