# ===========================================================
#            PROJECT TUTORING: MANUALE OPERATIVO
# ===========================================================

# 1. FILOSOFIA E RUOLI
#-----------------------------------------------------------
# Il nostro modello operativo si basa su tre figure distinte:
#
# 1. Insegnante (Tu):
#    - Definisce la strategia didattica e il percorso di apprendimento.
#    - Seleziona gli argomenti e fornisce i materiali di base (es. testi di riferimento).
#    - Conduce le revisioni, approva i materiali finali e gestisce la formattazione fine (es. a capo manuali).
#    - Interagisce direttamente con lo Studente.
#
# 2. Assistente (Io):
#    - Agisce come braccio tecnico e operativo.
#    - Sviluppa i materiali didattici (HTML, JSON) secondo le direttive dell'Insegnante.
#    - Popola i contenuti, implementa le funzionalità interattive e gestisce la struttura del codice.
#    - Propone ottimizzazioni tecniche e di layout.
#
# 3. Studente:
#    - È il destinatario finale del nostro lavoro.
#    - Utilizza i materiali per lo studio e la pratica.
#    - Partecipa attivamente creando i propri "Mazzi Appunti" su Anki.

# 2. L'ECOSISTEMA DIDATTICO: I 3 ARTEFATTI CHIAVE
#-----------------------------------------------------------
# Per ogni argomento grammaticale, produrremo un pacchetto di tre file HTML interconnessi,
# ognuno con uno scopo preciso.

# 2.1. Lezione Approfondita (`lezione_[argomento].html`)
#    - Scopo: È il documento principale per la spiegazione dell'argomento. Deve essere completo,
#      dettagliato e arricchito con esempi e analisi degli errori specifici dello studente.
#    - Struttura: Formato lungo, diviso in sezioni tematiche presentate come "carte" separate.
#    - Utilizzo: Viene usato durante la lezione per spiegare e analizzare l'argomento.

# 2.2. Mazzo Appunti (`appunti_[argomento].html`)
#    - Scopo: È una sintesi distillata della Lezione Approfondita. Presenta i concetti chiave
#      in un formato "scheda" (Fronte/Retro) per facilitare la creazione manuale di carte Anki
#      da parte dello studente.
#    - Struttura: Sintetica, visivamente pulita, con un layout che rispecchia una carta Anki.
#    - Utilizzo: Riferimento rapido per lo studente e base per il suo mazzo Anki personale.

# 2.3. Esercizi Pratici (`esercizi_[argomento].html`)
#    - Scopo: È un'applicazione web interattiva per la pratica "una tantum". Permette allo
#      studente di testare la sua comprensione in un ambiente controllato e di salvare
#      i risultati per la revisione.
#    - Struttura: App a tab, divisa nelle 3 Fasi di apprendimento. Include funzionalità di
#      salvataggio, caricamento e reset.
#    - Utilizzo: Esercitazione mirata da completare una volta, prima di passare alla pratica
#      continuativa su Anki.

# 3. STRATEGIA ANKI
#-----------------------------------------------------------
# L'uso di Anki è centrale per trasformare la conoscenza passiva in padronanza attiva.

# 3.1. Mazzo Appunti (Creato dallo Studente)
#    - Lo studente ha la responsabilità di creare questo mazzo, usando l'HTML "Mazzo Appunti"
#      come guida. Questo processo di elaborazione attiva è un passaggio fondamentale
#      dell'apprendimento (generation effect).

# 3.2. Mazzi Esercizi (Creati da Noi)
#    - Noi prepariamo e l'Insegnante fornisce allo studente 3 mazzi Anki pre-confezionati.
#    - I mazzi seguono la stessa logica a 3 fasi dell'app di esercizi:
#      1. Fase 1 (Comprensione): 50 esercizi "Vero/Falso".
#      2. Fase 2 (Riconoscimento): 30 esercizi a scelta multipla.
#      3. Fase 3 (Produzione): 20 esercizi di completamento/riscrittura.

# 4. CONVENZIONI GRAFICHE E DI STILE (HTML)
#-----------------------------------------------------------
# Per garantire coerenza visiva in tutti i materiali.

# 4.1. Layout Generale:
#    - Sfondo Pagina: Grigio neutro (`bg-slate-200`).
#    - Contenitore Principale: Larghezza massima estesa (`max-w-7xl`).

# 4.2. Struttura a "Carte":
#    - Header Principale: Sfondo bianco (`bg-white`), ombra marcata (`shadow-lg`).
#    - Sezioni / Carte Contenuto: Sfondo bianco (`bg-white`), ombra standard (`shadow-md` o `shadow-lg`).
#    - Header Interni alle Carte (es. "Fronte: ..."): Sfondo grigio chiarissimo (`bg-slate-50`).

# 4.3. Tipografia e Colori:
#    - Font Principale: Inter.
#    - Font Codice/Esempi: Source Code Pro.
#    - Testo Principale: Nero o quasi nero (`text-slate-800`, `text-slate-900`).
#    - Testo Secondario: Grigio (`text-slate-600`, `text-slate-500`).
#    - Colori Accento: Famiglia Indigo per i concetti principali, Amber per le analisi degli errori.

# 5. GESTIONE DEI CONTENUTI E LINGUAGGIO
#-----------------------------------------------------------
# 5.1. Regole di Contenuto:
#    - Completezza del Testo: Non usare mai "..." o altre abbreviazioni per accorciare il testo
#      di esercizi o esempi. Mostrare sempre il contenuto nella sua interezza, a meno che non
#      sia esplicitamente richiesto di fare altrimenti.
#    - Interruzioni di Riga (`<br>`): La gestione delle pause visive all'interno dei paragrafi
#      è di competenza esclusiva dell'Insegnante e verrà applicata manualmente. L'Assistente
#      non inserirà `<br>` di default.
#    - Chiarezza Terminologica: Assicurarsi sempre che la terminologia usata, specialmente
#      nei "Mazzi Appunti", sia chiaramente definita e spiegata per evitare ambiguità.

# 5.2. Linguaggio e Prospettiva:
#    - L'Assistente si rivolge all'Insegnante.
#    - Il testo prodotto per lo Studente deve essere scritto da una prospettiva collaborativa
#      "Insegnante-Assistente".
#    - Esempi: "A breve, noi prepareremo un'app..." (Assistente a Insegnante, parlando del lavoro
#      per lo Studente); "L'insegnante ti fornirà i mazzi..." (Testo all'interno di un HTML
#      destinato allo Studente).

# 6. LESSON CREATION WORKFLOW
#-----------------------------------------------------------
# Il processo di creazione di una nuova lezione segue un flusso di lavoro strutturato
# per garantire qualità e coerenza.
#
# 1.  **Fase 1: Input Insegnante**
#     - L'Insegnante seleziona l'argomento e fornisce i materiali di base (testi, appunti, esempi).
#     - Definisce gli obiettivi di apprendimento e mette in evidenza gli errori comuni dello studente.
#
# 2.  **Fase 2: Sviluppo Assistente**
#     - L'Assistente analizza i materiali e progetta la struttura dei tre artefatti HTML.
#     - Sviluppa una prima bozza della `lezione`, degli `appunti` e degli `esercizi`.
#     - Popola i contenuti seguendo le direttive e le convenzioni stabilite.
#
# 3.  **Fase 3: Revisione Insegnante**
#     - L'Insegnante revisiona la bozza, corregge eventuali imprecisioni e fornisce feedback dettagliato.
#     - Richiede modifiche o aggiunte specifiche.
#
# 4.  **Fase 4: Iterazione e Finalizzazione**
#     - L'Assistente implementa le modifiche richieste.
#     - Questo ciclo di revisione-implementazione continua fino all'approvazione finale dell'Insegnante.
#     - L'Insegnante applica la formattazione fine (es. `<br>`) prima della consegna allo Studente.

# 7. HTML/CSS STYLE GUIDE WITH EXAMPLES
#-----------------------------------------------------------
# Esempi di codice per implementare le convenzioni di stile.
#
# **Card di Contenuto Base:**
# ```html
# <div class="bg-white p-6 rounded-lg shadow-md mb-6">
#   <h2 class="text-2xl font-bold text-slate-800 mb-4">Titolo della Sezione</h2>
#   <p class="text-slate-700">Contenuto del paragrafo...</p>
# </div>
# ```
#
# **Card per "Mazzo Appunti" (Fronte/Retro):**
# ```html
# <div class="bg-white rounded-lg shadow-lg mb-8">
#   <div class="bg-slate-50 p-4 rounded-t-lg">
#     <h3 class="text-lg font-semibold text-indigo-700">Fronte: Domanda o Concetto</h3>
#   </div>
#   <div class="p-6">
#     <p class="text-slate-700">Retro: Risposta o Spiegazione.</p>
#   </div>
# </div>
# ```
#
# **Evidenziare un Errore Comune:**
# ```html
# <div class="bg-amber-100 border-l-4 border-amber-500 p-4 my-4">
#   <p class="text-amber-800"><span class="font-bold">Attenzione:</span> Un errore comune è...</p>
# </div>
# ```

---

