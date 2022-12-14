/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as geolib from 'geolib';

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
  alternateRouteRenderers: google.maps.DirectionsRenderer[];

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
      map
    });
    this.directionsRenderer.setPanel(document.getElementById("sidebar") as HTMLElement)
    this.alternateRouteRenderers = [];

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
    // var numOfHours = 1;
    // var date = new Date()
    // var currentTime = date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);

    this.directionsService.route(
      {
        origin: { placeId: this.originPlaceId },
        destination: { placeId: this.destinationPlaceId },
        travelMode: google.maps.TravelMode.DRIVING,
        // transitOptions: {
        //   departureTime: new Date(currentTime),
        //   modes: [google.maps.TransitMode.BUS],
        //   routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
        // },
        drivingOptions: {
          departureTime: new Date(Date.now()),
          trafficModel: google.maps.TrafficModel.OPTIMISTIC
        },
        unitSystem: google.maps.UnitSystem.METRIC,
        waypoints: this.waypoints,
        optimizeWaypoints: true,
        provideRouteAlternatives: true,
        // avoidFerries: true,
        // avoidHighways: true,
        // avoidTolls: true,
        // region: "India",
      },
      (response, status) => {
        if (status === "OK" && response) {
          /**
           * ENTER MILAGE IN METERS
           */
          const milage = 20 // in meters
          const totalCountingOfChargerLocating = 1;
          var distanceCovered = 0;
          var chargerLocatingCount = 0;

          // console.log("Route: ", response.routes[0])
          // console.log("legs: ", response.routes[0].legs[0])

          let boundingCoordinates = {}

          response.routes[0].legs[0].steps.map((data) => {
            distanceCovered += Number(data.distance?.value)
            
            let startLat = data.start_location.lat()
            let startLng = data.start_location.lng()
            let endLat = data.end_location.lat()
            let endLng =  data.end_location.lng()

            if(distanceCovered>=milage && totalCountingOfChargerLocating>chargerLocatingCount ){
              boundingCoordinates={
                minLng : startLng>=endLng? endLng: startLng,
                maxLng : startLng<=endLng? endLng: startLng,
                minLat : startLat>=endLat? endLat: startLat,
                maxLat : startLat<=endLat? endLat: startLat
              }

              this.getOnRouteChargers(boundingCoordinates)

              console.log(boundingCoordinates)
              // console.log("start Location: ", data.start_location.lat(), data.start_location.lng())
              // console.log("end Location: ", data.end_location.lat(), data.end_location.lng())
              chargerLocatingCount += 1;
            }
          })

          // Render main route
          this.directionsRenderer.setDirections(response);

          // response.routes[0].overview_path.map((data) => {
          //   console.log(`coordinates: ${data.toString()}`)
          // })

          // Clear existing alternate routes
          for (let renderer of this.alternateRouteRenderers) {
            renderer.setMap(null)
          }


          for (let j = 0; j < response.routes.length; j++) {
            let route = response.routes[j];

            // Render alternate routes
            if (j !== 0) {
              this.alternateRouteRenderers.push(new google.maps.DirectionsRenderer({
                directions: response,
                routeIndex: j,
                map: this.map,
                suppressMarkers: true,
              }))
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

  getOnRouteChargers(bounds){
    fetch(
      `${BOLT_URL}/charger/clusters?lat_bottom=${bounds.minLat}&lat_top=${bounds.maxLat}&lng_left=${bounds.minLng}&lng_right=${bounds.maxLng}&zoom=14&minZoom=7&maxZoom=12&radius=120`,
      {
        method: 'GET',
        headers: {
          token: APP_TOKEN,
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        redirect: 'follow'
      }
    )
      .then((res) => res.json())
      .then((res) => {
        console.log("Charger: ", res.data)
        if (res.data.chargers.length)
          res.data.chargers.forEach((el: any, i: number) => {
            const position = new google.maps.LatLng({
              lat: el.geometry.coordinates[1],
              lng: el.geometry.coordinates[0],
            });
            this.waypoints.push({
              location: position,
              stopover: true,
            });
            this.route(false)
            this.createWaypointMarker(position, el.chargerId);
          });
      })
      .catch((err) => {
        console.error(err.message);
      });
  }

  getChargers(bounds: google.maps.LatLngBounds) {
    const lat_top = bounds.getNorthEast().lat();
    const lat_bottom = bounds.getSouthWest().lat();
    const lng_left = bounds.getSouthWest().lng();
    const lng_right = bounds.getNorthEast().lng();

    fetch(
      `${BOLT_URL}/charger/clusters?lat_bottom=${lat_bottom}&lat_top=${lat_top}&lng_left=${lng_left}&lng_right=${lng_right}&zoom=14&minZoom=7&maxZoom=12&radius=120`,
      {
        method: 'GET',
        headers: {
          token: APP_TOKEN,
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        redirect: 'follow'
      }
    )
      .then((res) => res.json())
      .then((res) => {
        if (!res.data.chargers.length) window.alert("No chargers found");
        else
          res.data.chargers.forEach((el: any, i: number) => {
            const position = new google.maps.LatLng({
              lat: el.geometry.coordinates[1],
              lng: el.geometry.coordinates[0],
            });
            this.createChargerMarker(position, el.chargerId);
          });
      })
      .catch((err) => {
        console.error(err.message);
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
export { };
