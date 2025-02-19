$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = [];
      this.temperatureData = [];
      this.humidityData = [];
      this.moistureData = [];
    }

    addData(time, temperature, humidity, moisture) {
      this.timeData.push(new Date(time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      this.temperatureData.push(temperature);
      this.humidityData.push(humidity || null);
      this.moistureData.push(moisture || null);


      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
        this.moistureData.shift();
      }
    }
  }

  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  const chartData = {
    labels: [],
    datasets: [
      {
        fill: false,
        label: 'Luft Temperatur',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBorderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
        data: [],
      },
      {
        fill: false,
        label: 'Luft Feuchtigkeit',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBorderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
        data: [],
      },
      {
        fill: false,
        label: 'Pflanzen Feuchtigkeit',
        yAxisID: 'Humidity', 
        borderColor: 'rgba(34, 139, 34, 1)',
        pointBorderColor: 'rgba(34, 139, 34, 1)',
        backgroundColor: 'rgba(34, 139, 34, 0.4)',
        pointHoverBackgroundColor: 'rgba(34, 139, 34, 1)',
        pointHoverBorderColor: 'rgba(34, 139, 34, 1)',
        spanGaps: true,
        data: [],
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [
        {
          id: 'Temperature',
          type: 'linear',
          scaleLabel: {
            labelString: 'Luft Temperatur (ºC)',
            display: true,
          },
          position: 'left',
          ticks: {
            suggestedMin: 0,
            suggestedMax: 100,
            beginAtZero: true
          }
        },
        {
          id: 'Humidity',
          type: 'linear',
          scaleLabel: {
            labelString: 'Luft Feuchtigkeit & Pflanzen Feuchtigkeit (%)',
            display: true,
          },
          position: 'right',
          ticks: {
            suggestedMin: 0,
            suggestedMax: 100,
            beginAtZero: true
          }
        }
      ]
    },
    tooltips: {
      callbacks: {
        title: function (tooltipItems, data) {
          return tooltipItems[0].xLabel; 
        },
  
        label: function (tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const value = tooltipItem.yLabel;
  
          let label = `${dataset.label}: ${value}`;
  
          if (dataset.label === 'Luft Temperatur') {
            label += ' ºC'; 
          } else if (dataset.label.includes('Feuchtigkeit')) {
            label += ' %';
          }
  
          return label;
        },
      },
    },
  };
  
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

    const homeIcon = L.icon({
      iconUrl: '/home_marker.png',  
      iconSize: [45, 45],               
      iconAnchor: [17, 45],            
      popupAnchor: [0, -40]            
  });

  // Leaflet-Karte für GPS-Daten
  const map = L.map('map').setView([47.0707, 15.4395], 13); // Graz, Österreich
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  let marker = null; // GPS-Marker
  let lastLatitude = null;
  let lastLongitude = null;

  const updateMap = async (latitude, longitude) => {
    if (latitude === lastLatitude && longitude === lastLongitude) {
      console.log('GPS-Daten unverändert, Karte wird nicht aktualisiert.');
      return;
    }
  
    lastLatitude = latitude;
    lastLongitude = longitude;

    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker([latitude, longitude], { icon: homeIcon }).addTo(map);
    let popupContent = `<strong>GPS-Daten:</strong><br>
    Breitengrad: ${latitude.toFixed(6)}<br>
    Längengrad: ${longitude.toFixed(6)}<br>`;

    try {
      const address = await getAddressFromCoordinates(latitude, longitude);
      popupContent += `<strong>Adresse:</strong><br>${address}`;
    } catch (err) {
      console.error('Fehler beim Abrufen der Adresse:', err);
      popupContent += `<strong>Adresse:</strong><br>Unbekannt`;
    }

    marker.bindPopup(popupContent).openPopup();
    map.setView([latitude, longitude], 13); // Karte zentrieren
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    }
  
    const data = await response.json();
    if (data && data.address) {
      const { road, house_number, postcode, city, country } = data.address;
      return `${road || ''} ${house_number || ''}, ${postcode || ''} ${city || ''}, ${country || ''}`;
    }
  
    return 'Unbekannte Adresse';
  };
  
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');

  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
    chartData.datasets[2].data = device.moistureData; 
    myLineChart.update();
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      if (!messageData.MessageDate || (!messageData.IotData.temperature && !messageData.IotData.humidity && !messageData.IotData.plantMoisture)) {
        return;
      }

      if (messageData.Latitude && messageData.Longitude) {
        const latitude = parseFloat(messageData.Latitude);
        const longitude = parseFloat(messageData.Longitude);
      
        if (!isNaN(latitude) && !isNaN(longitude)) {
          updateMap(latitude, longitude);
        } else {
          console.warn(`Ungültige GPS-Daten empfangen: Latitude=${messageData.Latitude}, Longitude=${messageData.Longitude}`);
        }
      }

      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (existingDeviceData) {
        existingDeviceData.addData(
          messageData.MessageDate,
          messageData.IotData.temperature,
          messageData.IotData.humidity,
          messageData.IotData.moisture 
        );
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        const numDevices = trackedDevices.getDevicesCount();
        deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(
          messageData.MessageDate,
          messageData.IotData.temperature,
          messageData.IotData.humidity,
          messageData.IotData.moisture
        );

        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };

  
  // Funktion zum Abrufen und Anzeigen der SQL-Standorte auf der Karte
  async function fetchAndDisplaySqlLocations() {
    try {
      const response = await fetch('/api/database-data'); // API für alle SQL-Daten
      const data = await response.json();
      let pathCoordinates = [];
      const startIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      });

      // End-Icon (Grün)
      const endIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', 
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      });

      // Standard-Icon (Blau für alle mittleren Punkte)
      const standardIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      });
      let firstValidIndex = -1;

      if (data && data.length > 0) {
        for (let index = 0; index < data.length; index++) {
          
          console.log(firstValidIndex)
          const point = data[index];
          if (point.latitude && point.longitude) {
            if (firstValidIndex === -1) {
              firstValidIndex = index;
            }
            // Erstelle einen neuen Marker für den Standort
            const jitter = () => (Math.random() - 0.5) * 0.0005;
            const latitude = point.latitude + jitter();
            const longitude = point.longitude + jitter();
            const zeitpunkt = new Date(point.zeitpunkt);
            const zeitpunktForm = zeitpunkt.toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false 
            }).replace(',', '');

            let address = "Unbekannte Adresse";
            try {
              address = await getAddressFromCoordinates(latitude, longitude);
            } catch (err) {
              console.error("Fehler beim Abrufen der Adresse:", err);
            }

            const popupContent = `<strong>Zeitpunkt:</strong><br>${zeitpunktForm}<br>
                                  <strong>GPS-Daten:</strong><br>
                                  Breitengrad: ${latitude.toFixed(6)}<br>
                                  Längengrad: ${longitude.toFixed(6)}<br>
                                  <strong>Adresse:</strong><br> ${address}<br>
                                  <strong>Sensor-Daten:</strong><br>
                                  Temperatur: ${point.temperature}°C<br>
                                  Feuchtigkeit: ${point.humidity}%<br>
                                  Pflanzen-Feuchtigkeit: ${point.moisture}%<br>
                                  `;
            // Marker erstellen & Popup hinzufügen
            let markerIcon = standardIcon;
            if (index === firstValidIndex) {
              markerIcon = startIcon; // Erster Punkt = ROT
            } else if (index === data.length - 1) {
              markerIcon = endIcon; // Letzter Punkt = GRÜN
            } else {
            }

            const locationMarker = L.marker([latitude, longitude], { icon: markerIcon })
              .addTo(map)
              .bindPopup(popupContent);

            pathCoordinates.push([latitude, longitude]);
          }
        };
        setTimeout(() => {
          if (pathCoordinates.length > 1) {
            const polyline = L.polyline(pathCoordinates, { color: 'black', weight: 3 }).addTo(map);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der SQL-Standorte:', error);
    }
  }

  fetchAndDisplaySqlLocations();

  //SQL
  const sqlChartData = {
    labels: [],
    datasets: [
      {
        fill: false,
        label: 'Luft Temperatur',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBorderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
        data: [],
      },
      {
        fill: false,
        label: 'Luft Feuchtigkeit',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBorderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
        data: [],
      },
      {
        fill: false,
        label: 'Pflanzen Feuchtigkeit',
        yAxisID: 'Humidity',
        borderColor: 'rgba(34, 139, 34, 1)',
        pointBorderColor: 'rgba(34, 139, 34, 1)',
        backgroundColor: 'rgba(34, 139, 34, 0.4)',
        pointHoverBackgroundColor: 'rgba(34, 139, 34, 1)',
        pointHoverBorderColor: 'rgba(34, 139, 34, 1)',
        spanGaps: true,
        data: [],
      }
    ]
  };

  const sqlChartOptions = {
    scales: {
      xAxes: [
        {
          type: 'category',
          scaleLabel: {
            labelString: '',
            display: false,
          },
          ticks: {
            callback: function (value, index, values) {
              const formatter = new Intl.DateTimeFormat('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              if (index === 0 || index === values.length - 1) {
                return formatter.format(new Date(value)); 
              }
              return '';
            },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
          },
          gridLines: {
            display: false,
          },
        },
      ],
      yAxes: [
        {
          id: 'Temperature',
          type: 'linear',
          scaleLabel: {
            labelString: 'Luft Temperatur (ºC)',
            display: true,
          },
          position: 'left',
          ticks: {
            suggestedMin: 0,
            suggestedMax: 100,
            beginAtZero: true
          }
        },
        {
          id: 'Humidity',
          type: 'linear',
          scaleLabel: {
            labelString: 'Luft Feuchtigkeit & Pflanzen Feuchtigkeit (%)',
            display: true,
          },
          position: 'right',
          ticks: {
            suggestedMin: 0,
            suggestedMax: 100,
            beginAtZero: true
          },
        },
      ],
    },
    tooltips: {
      callbacks: {
        title: function (tooltipItems, data) {
          const formatter = new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          const index = tooltipItems[0].index;
          return formatter.format(new Date(data.labels[index]));
        },

        label: function (tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const value = tooltipItem.yLabel;
          let label = `${dataset.label}: ${value}`;

          if (dataset.label === 'Luft Temperatur') {
            label += ' ºC';
          } else if (dataset.label.includes('Feuchtigkeit')) {
            label += ' %';
          }

          return label;
        },
      },
    },
  };

  const sqlCtx = document.getElementById('sqlChart').getContext('2d');
  const sqlChart = new Chart(sqlCtx, {
    type: 'line',
    data: sqlChartData,
    options: sqlChartOptions,
  });

  // SQL-Daten abrufen und Chart aktualisieren
  async function fetchSqlData(deviceId = null) {
    try {
      const url = deviceId ? `/api/database-data?deviceId=${deviceId}` : '/api/database-data';
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        const sqlTimeData = data.map(item => item.time);
        const sqlTemperatureData = data.map(item => item.temperature);
        const sqlHumidityData = data.map(item => item.humidity);
        const sqlMoistureData = data.map(item => item.moisture);

        sqlChartData.labels = sqlTimeData;
        sqlChartData.datasets[0].data = sqlTemperatureData;
        sqlChartData.datasets[1].data = sqlHumidityData;
        sqlChartData.datasets[2].data = sqlMoistureData;

        sqlChart.update();
      }
    } catch (err) {
      console.error('Fehler beim Abrufen der SQL-Daten:', err);
    }
  }

  fetchSqlData();

});