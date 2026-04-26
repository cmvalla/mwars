# Multiplication Wars 🚀

Multiplication Wars è un gioco educativo in formato web che unisce l'apprendimento delle tabelline con un gameplay in stile space-shooter. Difendi la galassia risolvendo le moltiplicazioni prima che i nemici colpiscano la tua astronave!

## 🎮 Caratteristiche del Gioco

* **Gameplay Dinamico**: Digita il risultato corretto della moltiplicazione o usa i comandi touch per distruggere le astronavi nemiche.
* **Supporto Mobile**: Controlli ottimizzati per smartphone e tablet.
  * **Trascina** (Drag) lo schermo per muovere l'astronave.
  * **Tocca** (Tap) per sparare un laser quando l'astronave è allineata con l'operazione che vuoi colpire.
* **Difficoltà Progressiva**: La velocità dei nemici inizia lentamente e aumenta progressivamente man mano che procedi.
* **Personalizzazione**: Scegli quali tabelline allenare (da 1 a 10) tramite il menu di configurazione a inizio partita.

## 🛠️ Tecnologie Utilizzate

* **Frontend**: HTML5, CSS3, JavaScript Vanilla (Canvas per il rendering).
* **Containerizzazione**: Docker (immagine basata su Nginx Alpine per servire i file web in modo rapido e leggero).
* **Infrastruttura (IaC)**: Terraform per il deployment su cloud.
* **Hosting**: Google Cloud Run con mappatura del dominio personalizzata (HTTPS nativo).

## 🚀 Come Eseguire il Progetto Localmente

Dato che il gioco è sviluppato con tecnologie web standard, hai due opzioni per testarlo:

### Opzione 1: File Locale (Più rapido)
Apri semplicemente il file `index.html` all'interno di un qualsiasi browser web.

### Opzione 2: Docker (Ambiente simile a produzione)
Puoi eseguire l'applicazione tramite Docker per emulare fedelmente l'ambiente di produzione:

1. Costruisci l'immagine Docker:
   ```bash
   docker build -t multiplication-wars .
   ```
2. Esegui il container:
   ```bash
   docker run -p 8080:80 multiplication-wars
   ```
3. Visita `http://localhost:8080` nel tuo browser.

## ☁️ Deployment su Google Cloud

Il progetto è architettato per funzionare in un ambiente serverless su **Google Cloud Run** ed è interamente gestito come codice tramite **Terraform**.

### Passaggi per il rilascio
In caso di nuove modifiche al gioco, segui questi step:

1. **Build e Push dell'immagine Docker** verso Google Artifact Registry:
   ```bash
   docker build -t europe-west1-docker.pkg.dev/goreply-n8n-hawk/mwars/mwars:latest .
   docker push europe-west1-docker.pkg.dev/goreply-n8n-hawk/mwars/mwars:latest
   ```

2. **Applicare i cambiamenti all'infrastruttura** con Terraform:
   ```bash
   cd terraform
   terraform apply
   ```

## 🌐 Versione Live
Il gioco è ospitato ed è sempre accessibile gratuitamente online all'indirizzo: 
**[https://mwars.godata.dev](https://mwars.godata.dev)**
