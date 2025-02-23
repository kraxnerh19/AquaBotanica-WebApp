# AquaBotanica – WebApp

Die Anwendung visualisiert **Echtzeit- und historische Sensordaten** (Temperatur, Luftfeuchtigkeit, Pflanzenfeuchtigkeit) und zeigt den **Live-Standort** sowie eine **historische Route** basierend auf GPS-Koordinaten an.

---

## **Funktionen**
- **Echtzeit-Datenanzeige:** Temperatur, Luftfeuchtigkeit und Bodenfeuchtigkeit werden live aktualisiert
- **Historische Datenanalyse:** Visualisierung gespeicherter Sensordaten in Diagrammen
- **GPS-Kartendarstellung mit Leaflet:**  
   - Live-Standort des Geräts auf einer interaktiven Karte
   - Historische Route mit farbcodierten Markern

Die Echtzeit-Daten werden direkt vom IoT Hub abgerufen und angezeigt während die Historischen-Daten aus der SQL-Datenbank einmalig beim aufrufen der WebApp abgerufen werden.
     
---

## **Nutzung des Projekts**

- Projekt klonen
- Abhängigkeiten installieren
  ```bash
  npm install
  npm install leaflet (für die Karte)
- Folgende Umgebungsvariablen müssen definiert werden:
  ```bash
  set IotHubConnectionString='<dein-Iot-Hub-Connection-String>'
  set EventHubConsumerGroup='<deine-IoT-Hub-Consumergruppe>'
  set DB_USER='<dein-Datenbank-Server-Username>'
  set DB_PASSWORD='<dein-Datenbank-Server-Passwort>'
  set DB_SERVER='<dein-SQL-Server-Name>'
  set DB_NAME='<dein-Datenbank-Name>'
  ```
  Am Mac werden die Umgebungsvariablen mit **export** anstatt set gesetzt.

- Starten der Anwendung
  ```bash
  npm start
  ```
