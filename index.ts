/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const BOLT_URL = "https://bolt.revos.in";
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN;

function initMap(): void {
  const map = new google.maps.Map(
    document.getElementById("map") as HTMLElement,
    {
      mapTypeControl: false,
      zoom: 14,
      center: { lat: 13.073393, lng: 77.744647 },
    }
  );

  new AutocompleteDirectionsHandler(map);
}

class AutocompleteDirectionsHandler {
  map: google.maps.Map;
  originPlaceId: string;
  destinationPlaceId: string;
  startMarker: google.maps.Marker | null;
  endMarker: google.maps.Marker | null;
  chargerMarkers: google.maps.Marker[];
  waypointMarkers: google.maps.Marker[];
  waypoints: google.maps.DirectionsWaypoint[];
  directionsService: google.maps.DirectionsService;
  directionsRenderer: google.maps.DirectionsRenderer;

  constructor(map: google.maps.Map) {
    this.map = map;
    this.originPlaceId = "";
    this.destinationPlaceId = "";
    this.startMarker = null;
    this.endMarker = null;
    this.chargerMarkers = [];
    this.waypointMarkers = [];
    this.waypoints = [];
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
    });
    this.directionsRenderer.setMap(map);

    const originInput = document.getElementById(
      "origin-input"
    ) as HTMLInputElement;
    const destinationInput = document.getElementById(
      "destination-input"
    ) as HTMLInputElement;

    // Specify just the place data fields that you need.
    const originAutocomplete = new google.maps.places.Autocomplete(
      originInput,
      { fields: ["place_id"] }
    );

    // Specify just the place data fields that you need.
    const destinationAutocomplete = new google.maps.places.Autocomplete(
      destinationInput,
      { fields: ["place_id"] }
    );

    this.setupPlaceChangedListener(originAutocomplete, "ORIG");
    this.setupPlaceChangedListener(destinationAutocomplete, "DEST");

    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
      destinationInput
    );
  }

  setupPlaceChangedListener(
    autocomplete: google.maps.places.Autocomplete,
    mode: string
  ) {
    autocomplete.bindTo("bounds", this.map);

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      if (!place.place_id) {
        window.alert("Please select an option from the dropdown list.");
        return;
      }

      for (let charger of this.chargerMarkers) {
        charger.setMap(null);
      }
      for (let waypoint of this.waypointMarkers) {
        waypoint.setMap(null);
      }
      this.waypoints = [];

      let request = {
        placeId: place.place_id,
        fields: ["geometry"],
      };

      let service = new google.maps.places.PlacesService(this.map);
      const callback = (
        place: google.maps.places.PlaceResult | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          if (mode === "ORIG") {
            this.startMarker?.setMap(null);
            this.startMarker = new google.maps.Marker({
              position: place?.geometry?.location,
              label: "A",
              map: this.map,
            });
          } else {
            this.endMarker?.setMap(null);
            this.endMarker = new google.maps.Marker({
              position: place?.geometry?.location,
              label: "B",
              map: this.map,
            });
          }
        }
      };
      service.getDetails(request, callback);

      if (mode === "ORIG") {
        this.originPlaceId = place.place_id;
      } else {
        this.destinationPlaceId = place.place_id;
      }

      this.route();
    });
  }

  route(shouldGetChargers = true) {
    if (!this.originPlaceId || !this.destinationPlaceId) {
      return;
    }

    const me = this;

    this.directionsService.route(
      {
        origin: { placeId: this.originPlaceId },
        destination: { placeId: this.destinationPlaceId },
        travelMode: google.maps.TravelMode.DRIVING,

        waypoints: this.waypoints,
        optimizeWaypoints: true,
        provideRouteAlternatives: true,
      },
      (response, status) => {
        if (status === "OK" && response) {
          // me.directionsRenderer.setDirections(response);

          /**
           * This is to display in the direction panel
           */
          const alternateSummaryPanel = document.getElementById(
            "directions-panel"
          ) as HTMLElement;

          alternateSummaryPanel.innerHTML = "";
          for (let j = 0; j < response.routes.length; j++) {
            let route = response.routes[j];

            // let newDirectionsRendere = new google.maps.DirectionsRenderer({
            //   suppressMarkers: true,
            //   draggable: true,
            //   hideRouteList: false,
            //   routeIndex: j,
            // });

            me.directionsRenderer.setOptions({
              draggable: true,
              hideRouteList: false,
              routeIndex: j
            })
            
            me.directionsRenderer.setDirections(response);

            // For each route, display summary information.
            for (let i = 0; i < route.legs.length; i++) {
              const routeSegment = j + 1;
              alternateSummaryPanel.innerHTML +=
                "<b>Route Segment: " + routeSegment + "</b><br>";
              alternateSummaryPanel.innerHTML +=
                route.legs[i].start_address + " to ";
              alternateSummaryPanel.innerHTML +=
                route.legs[i].end_address + "<br>";
              alternateSummaryPanel.innerHTML +=
                route.legs[i].distance!.text + "<br>";
              alternateSummaryPanel.innerHTML +=
                route.legs[i].duration!.text + "<br><br>";
            }
            if (shouldGetChargers) {
              this.getChargers(response.routes[j].bounds);
            }
          }
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
  }

  getChargers(bounds: google.maps.LatLngBounds) {
    const lat_top = bounds.getNorthEast().lat();
    const lat_bottom = bounds.getSouthWest().lat();
    const lng_left = bounds.getSouthWest().lng();
    const lng_right = bounds.getNorthEast().lng();

    fetch(
      `${BOLT_URL}/charger/getAvailable?lat_top=${lat_top}&lat_bottom=${lat_bottom}&lng_left=${lng_left}&lng_right=${lng_right}`,
      {
        headers: {
          token: APP_TOKEN,
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      }
    )
      .then((res) => res.json())
      .then((res) => {
        if (!res.data.length) window.alert("No chargers found");
        else
          res.data.forEach((el: any, i: number) => {
            const position = new google.maps.LatLng({
              lat: el.station.location.latitude,
              lng: el.station.location.longitude,
            });
            this.createChargerMarker(position, el.charger.chargerId);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  }

  createChargerMarker(position: google.maps.LatLng, chargerId: string) {
    let chargerMarker = new google.maps.Marker({
      position,
      icon: {
        url: "./images/charger-available.svg",
      },
      map: this.map,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<b>${chargerId}</b><br/>Click to add waypoint`,
      position,
    });

    chargerMarker.addListener("mouseover", () => {
      infoWindow.open(chargerMarker.get("map"), chargerMarker);
    });
    chargerMarker.addListener("mouseout", () => {
      infoWindow.close();
    });
    chargerMarker.addListener("click", () => {
      if (this.waypoints.length === 25) {
        window.alert("Max limit of 25 waypoints reached");
      } else {
        let markerIndex = this.chargerMarkers.findIndex(
          (el) => el.getPosition()?.toString() === position.toString()
        );
        chargerMarker.setMap(null);
        this.chargerMarkers.splice(markerIndex, 1);

        this.createWaypointMarker(position, chargerId);
        this.route(false);
        infoWindow.close();
      }
    });

    this.chargerMarkers.push(chargerMarker);
  }

  createWaypointMarker(position: google.maps.LatLng, chargerId: string) {
    let waypointMarker = new google.maps.Marker({
      position,
      map: this.map,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<b>${chargerId}</b><br/>Click to remove waypoint`,
      position,
    });

    waypointMarker.addListener("mouseover", () => {
      infoWindow.open(waypointMarker.get("map"), waypointMarker);
    });
    waypointMarker.addListener("mouseout", () => {
      infoWindow.close();
    });
    waypointMarker.addListener("click", () => {
      let markerIndex = this.waypointMarkers.findIndex(
        (el) => el.getPosition()?.toString() === position.toString()
      );
      if (markerIndex !== -1) this.waypointMarkers.splice(markerIndex, 1);

      let waypointIndex = this.waypoints.findIndex(
        (el) => el.location?.toString() === position.toString()
      );
      if (waypointIndex !== -1) this.waypoints.splice(waypointIndex, 1);

      waypointMarker.setMap(null);

      this.createChargerMarker(position, chargerId);
      this.route(false);
      infoWindow.close();
    });

    this.waypoints.push({
      location: position,
      stopover: true,
    } as google.maps.DirectionsWaypoint);
    this.waypointMarkers.push(waypointMarker);
  }
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
export {};
