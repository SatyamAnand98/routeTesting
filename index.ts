/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function initMap(): void {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({
    routeIndex: 1
  });
  const map = new google.maps.Map(
    document.getElementById("map") as HTMLElement,
    {
      zoom: 14,
      center: { lat: 13.073393, lng:  77.744647 },
    }
  );

  directionsRenderer.setMap(map);

  (document.getElementById("submit") as HTMLElement).addEventListener(
    "click",
    () => {
      calculateAndDisplayRoute(directionsService, map);
    }
  );
}



var coordinates = [
  [13.039311783608984, 77.7297654747963],
  [13.024960825912101, 77.71899506449698],
  // [13.025025829280144, 77.71905608475208],
  // [13.025097038980325, 77.71895784884691],
  // [13.024994470873581, 77.71307978779078],
  // [13.019993407526382, 77.70816262811421],
  // [13.017807411358602, 77.70489368587732],
  // [13.043769279391954, 77.70928177982567],
  // [13.055266223018355, 77.70612817257641],
  // [13.055115002486366, 77.7059756219387],
  // [13.05180347826083, 77.69266683608294],
  // [13.051958293578691, 77.69282709807158],
  // [13.040264238345669, 77.67804443836212],
  // [13.052051052077113, 77.68412768840788],
  // [13.051838099416269, 77.68401101231575],
  // [13.055996522168197, 77.65488054603338],
  // [13.056219596120359, 77.65764221549036],
  // [13.053695549957606, 77.66208160668612],
  // [13.053635779918432, 77.66204405575989],
  // [13.053629900897405, 77.6621774956584],
  // [13.052924743971955, 77.66131181269884],
  // [13.052855175347345, 77.66134098172188],
  // [13.052890776195254, 77.66138523817062],
  // [13.052889143128958, 77.66135338693857],
  // [13.053626308162267, 77.66251511871815],
]

async function calculateWaypoints(){

  var wapointsArray = await Promise.all(coordinates.map((data) => {
    var waypnt =  { location: new google.maps.LatLng(data[0], data[1]), stopover: true}
    return waypnt
  }))
  return wapointsArray
}

async function calculateAndDisplayRoute(
  directionsService: google.maps.DirectionsService,
  map: google.maps.Map
) {
  let waypointCoordinates = await calculateWaypoints();
  directionsService
    .route({
      origin: {location: { lat: 13.073393, lng:  77.744647 }},                // DeFiner Kingdom
      destination: {location: { lat: 12.9120635, lng:  77.6478552 }},         // Bolt.earth
      // waypoints: [
      //   // {location: new google.maps.LatLng([12.9532701,77.708739), stopover: true},           // Iron Hills
      //   // {location: new google.maps.LatLng([12.9391073,77.7354752), stopover: true},          // Sobha, Dream Acre
      // ],
      waypoints: waypointCoordinates,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true
    })
    .then((response) => {
      console.log(response.routes)
      
      const alternateSummaryPanel = document.getElementById(
        "directions-panel-alternate"
      ) as HTMLElement;

      alternateSummaryPanel.innerHTML = ""
      for (let j = 0 ; j < response.routes.length ; j++){
        let route = response.routes[j]

        let newDirectionsRendere = new google.maps.DirectionsRenderer({
          draggable: true,
          hideRouteList: false,
          routeIndex: j
        })
        newDirectionsRendere.setMap(map)
        newDirectionsRendere.setDirections(response);

        // For each route, display summary information.
        for (let i = 0; i < route.legs.length; i++) {
          const routeSegment = j + 1;
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
export {};
