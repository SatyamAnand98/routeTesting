/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

 const BOLT_URL = "https://bolt.revos.in"
 const APP_TOKEN = import.meta.env.VITE_APP_TOKEN
 const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN
 
 const origin = { lat: 13.073393, lng: 77.744647 }
 const destination = { lat: 12.9120635, lng: 77.6478552 }
 
 let startMarker: google.maps.Marker | null = null
 let endMarker: google.maps.Marker | null = null
 
 let chargersArray: google.maps.Marker[] = []
 let waypointArray: google.maps.DirectionsWaypoint[] = []
 
 
 function initMap(): void {
   const directionsService = new google.maps.DirectionsService();
   const directionsRenderer = new google.maps.DirectionsRenderer({
     suppressMarkers: true,
   });
 
   const map = new google.maps.Map(
     document.getElementById("map") as HTMLElement,
     {
       zoom: 14,
       center: { lat: 13.073393, lng: 77.744647 },
     }
   );
 
   directionsRenderer.setMap(map);
 
   (document.getElementById("submit") as HTMLElement).addEventListener(
     "click",
     () => {
       if (!startMarker)
         startMarker = new google.maps.Marker({
           position: origin,
           label: "A",
           map
         })
       if (!endMarker)
         endMarker = new google.maps.Marker({
           position: destination,
           label: "B",
           map
         })
 
       // Clear existing markers and routes
       for (let charger of chargersArray) {
         charger.setMap(null)
       }
       directionsRenderer.setMap(null)
 
 
       calculateAndDisplayRoute(directionsService, directionsRenderer, map);
 
       fetch(`${BOLT_URL}/charger/getAvailable?lat_top=${origin.lat}&lat_bottom=${destination.lat}&lng_left=${destination.lng}&lng_right=${origin.lng}`, {
         headers: {
           token: APP_TOKEN,
           Authorization: `Bearer ${AUTH_TOKEN}`,
         }
       })
         .then((res) => res.json())
         .then((res) => {
           chargersArray = res.data.map((el: any) => {
             let position = {
               lat: el.station.location.latitude,
               lng: el.station.location.longitude,
             }
 
             let marker = createChargerMarker()
 
             function createChargerMarker() {
               let chargerMarker = new google.maps.Marker({
                 position,
                 icon: {
                   url: "./images/charger-available.svg"
                 },
                 map,
               })
 
               const infoWindow = new google.maps.InfoWindow({
                 content: `<b>${el.charger.chargerId}</b><br/>Click to add waypoint`,
                 position,
               });
 
               chargerMarker.addListener("mouseover", () => {
                 infoWindow.open(chargerMarker.get("map"), chargerMarker);
               });
               chargerMarker.addListener("mouseout", () => {
                 infoWindow.close();
               });
               chargerMarker.addListener("click", () => {
                 if (waypointArray.length === 25) {
                   window.alert("Max limit of 25 waypoints reached")
                 } else {
                   waypointArray.push({ location: position, stopover: true } as google.maps.DirectionsWaypoint)
                   directionsRenderer.setMap(null)
                   calculateAndDisplayRoute(directionsService, directionsRenderer, map)
                   chargerMarker.setMap(null)
                   infoWindow.close()
 
                   marker = createWaypointMarker(waypointArray.length - 1)
                 }
 
               });
 
               return chargerMarker
             }
 
             function createWaypointMarker(markerIndex) {
               let waypointMarker = new google.maps.Marker({ position, map })
 
               const infoWindow = new google.maps.InfoWindow({
                 content: `<b>${el.charger.chargerId}</b><br/>Click to remove waypoint`,
                 position,
               });
 
               waypointMarker.addListener("mouseover", () => {
                 infoWindow.open(waypointMarker.get("map"), waypointMarker);
               });
               waypointMarker.addListener("mouseout", () => {
                 infoWindow.close();
               });
               waypointMarker.addListener("click", () => {
                 waypointArray.splice(markerIndex, 1)
                 directionsRenderer.setMap(null)
                 calculateAndDisplayRoute(directionsService, directionsRenderer, map)
                 waypointMarker.setMap(null)
                 infoWindow.close()
 
                 marker = createChargerMarker()
 
               })
               return waypointMarker
             }
 
             return marker
           }
           )
         })
         .catch((err) => {
           console.error(err)
         })
     }
   );
 }
 
 async function calculateAndDisplayRoute(
   directionsService: google.maps.DirectionsService,
   directionsRenderer: google.maps.DirectionsRenderer,
   map: google.maps.Map
 ) {
   directionsService
     .route({
       origin: { location: origin },                // DeFiner Kingdom
       destination: { location: destination },         // Bolt.earth
       // waypoints: [
       //   { location: new google.maps.LatLng(12.9532701, 77.708739), stopover: true },           // Iron Hills
       //   { location: new google.maps.LatLng(12.9391073, 77.7354752), stopover: true },          // Sobha, Dream Acre
       // ],
       waypoints: waypointArray,
       optimizeWaypoints: true,
       travelMode: google.maps.TravelMode.DRIVING,
       provideRouteAlternatives: false,
     })
     .then((response) => {
       const alternateSummaryPanel = document.getElementById(
         "directions-panel-alternate"
       ) as HTMLElement;
 
       alternateSummaryPanel.innerHTML = ""
       for (let j = 0; j < response.routes.length; j++) {
         let route = response.routes[j]
 
         directionsRenderer.setOptions({
           draggable: true,
           hideRouteList: false,
           routeIndex: j
         })
         directionsRenderer.setMap(map)
         directionsRenderer.setDirections(response);
 
         const routeIndex = j + 1;
         alternateSummaryPanel.innerHTML +=
           "<b>Route Index: " + routeIndex + "</b><br>";
 
         // For each route, display summary information.
         for (let i = 0; i < route.legs.length; i++) {
           const routeSegment = i + 1;
           alternateSummaryPanel.innerHTML +=
             "<b>Route Segment: " + routeSegment + "</b><br>";
           alternateSummaryPanel.innerHTML += route.legs[i].start_address + " to ";
           alternateSummaryPanel.innerHTML += route.legs[i].end_address + "<br>";
           alternateSummaryPanel.innerHTML += route.legs[i].distance!.text + "<br>";
           alternateSummaryPanel.innerHTML += route.legs[i].duration!.text + "<br><br>";
         }
       }
     })
     .catch((e) => window.alert("Directions request failed due to " + e.message));
 }
 
 declare global {
   interface Window {
     initMap: () => void;
   }
 }
 window.initMap = initMap;
 export { };
 