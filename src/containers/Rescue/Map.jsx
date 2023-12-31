import "./Rescue.css"
import React, { Component } from 'react';
import { withGoogleMap, GoogleMap, withScriptjs, InfoWindow, Marker } from "react-google-maps";
import Geocode from "react-geocode";
import Autocomplete from 'react-google-autocomplete';
import Aux from "../../hoc/Auxiliary/Auxiliary";
import Section from "../../components/UI/Section/Section";

Geocode.setApiKey( "xxx" );
Geocode.enableDebug();

const dateRegex = new RegExp('^\\d\\d\\d\\d-\\d\\d-\\d\\d');
function jsonDateReviver(key, value) {
  if (dateRegex.test(value)) return new Date(value);
  return value;
}

async function graphQLFetch(query, variables = {}) {
  try {
    const response = await fetch('http://localhost:5000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({ query, variables })
    });
    const body = await response.text();
    const result = JSON.parse(body, jsonDateReviver);

    if (result.errors) {
      const error = result.errors[0];
      if (error.extensions.code == 'BAD_USER_INPUT') {
        const details = error.extensions.exception.errors.join('\n ');
        alert(`${error.message}:\n ${details}`);
      } else {
        alert(`${error.extensions.code}: ${error.message}`);
      }
    }
    return result.data;
  } catch (e) {
    alert(`Error in sending data to server: ${e.message}`);
  }
}


class Map extends Component{

	constructor( props ){
		super( props );
		this.state = {
			address: '',
			city: '',
			area: '',
			avenue: '',
      		name:'',
      		phoneNumber:'',
			markers:[],
			mapPosition: {
				lat: this.props.center.lat,
				lng: this.props.center.lng
			},
			markerPosition: {
				lat: this.props.center.lat,
				lng: this.props.center.lng
			}
		}
		this.handleFormSubmit = this.handleFormSubmit.bind(this);
		this.createRescue = this.createRescue.bind(this);
		this.createMarker = this.createMarker.bind(this);
	}
	/**
	 * Get the current address from the default map position and set those values in the state
	 */
	
	componentDidMount() {
		this.loadData();
		Geocode.fromLatLng( this.state.mapPosition.lat , this.state.mapPosition.lng ).then(
			response => {
				const address = response.results[0].formatted_address,
				      addressArray =  response.results[0].address_components,
				      city = this.getCity( addressArray ),
				      area = this.getArea( addressArray ),
				      avenue = this.getAvenue( addressArray );

				console.log( 'city', city, area, avenue );

				this.setState( {
					address: ( address ) ? address : '',
					area: ( area ) ? area : '',
					city: ( city ) ? city : '',
					avenue: ( avenue ) ? avenue : '',
				} )
			},
			error => {
				console.error( error );
			}
		);
	};
	async loadData() {
		const query = `query {
		  markerList {
			id lat lng
		  }
		}`;
		const data = await graphQLFetch(query);
    if (data) {
      this.setState({ markers: data.markerList });
    }
  }

	/**
	 * Component should only update ( meaning re-render ), when the user selects the address, or drags the pin
	 *
	 * @param nextProps
	 * @param nextState
	 * @return {boolean}
	 */
	shouldComponentUpdate( nextProps, nextState ){
		if (
			this.state.markerPosition.lat !== this.props.center.lat ||
			this.state.address !== nextState.address ||
			this.state.city !== nextState.city ||
			this.state.area !== nextState.area ||
			this.state.avenue !== nextState.avenue
		) {
			return true
		} else if ( this.props.center.lat === nextProps.center.lat ){
			return false
		}
	}
	/**
	 * Get the city and set the city input value to the one selected
	 *
	 * @param addressArray
	 * @return {string}
	 */
	getCity = ( addressArray ) => {
		let city = '';
		for( let i = 0; i < addressArray.length; i++ ) {
			if ( addressArray[ i ].types[0] && 'country' === addressArray[ i ].types[0] ) {
				city = addressArray[ i ].long_name;
				return city;
			}
		}
	};
	/**
	 * Get the area and set the area input value to the one selected
	 *
	 * @param addressArray
	 * @return {string}
	 */
	getArea = ( addressArray ) => {
		let area = '';
		for( let i = 0; i < addressArray.length; i++ ) {
			if ( addressArray[ i ].types[0]  ) {
				for ( let j = 0; j < addressArray[ i ].types.length; j++ ) {
					if ( 'neighborhood' === addressArray[ i ].types[j] || 'political' === addressArray[ i ].types[j] ) {
						area = addressArray[ i ].long_name;
						return area;
					}
				}
			}
		}
	};
	/**
	 * Get the address and set the address input value to the one selected
	 *
	 * @param addressArray
	 * @return {string}
	 */
	getAvenue = ( addressArray ) => {
		let avenue = '';
		for( let i = 0; i < addressArray.length; i++ ) {
			for( let i = 0; i < addressArray.length; i++ ) {
				if ( addressArray[ i ].types[0] && 'route' === addressArray[ i ].types[0] ) {
					avenue = addressArray[ i ].long_name;
					return avenue;
				}
			}
		}
	};
	/**
	 * And function for city,avenue and address input
	 * @param event
	 */
	onChange = ( event ) => {
		this.setAvenue({ [event.target.name]: event.target.value });
	};
	/**
	 * This Event triggers when the marker window is closed
	 *
	 * @param event
	 */
	onInfoWindowClose = ( event ) => {

	};

	/**
	 * When the marker is dragged you get the lat and long using the functions available from event object.
	 * Use geocode to get the address, city, area and avenue from the lat and lng positions.
	 * And then set those values in the avenue.
	 *
	 * @param event
	 */
	onMarkerDragEnd = ( event ) => {
		let newLat = event.latLng.lat(),
		    newLng = event.latLng.lng();

		Geocode.fromLatLng( newLat , newLng ).then(
			response => {
				const address = response.results[0].formatted_address,
				      addressArray =  response.results[0].address_components,
				      city = this.getCity( addressArray ),
				      area = this.getArea( addressArray ),
				      avenue = this.getAvenue( addressArray );
				this.setState( {
					address: ( address ) ? address : '',
					area: ( area ) ? area : '',
					city: ( city ) ? city : '',
					avenue: ( avenue ) ? avenue : '',
					markerPosition: {
						lat: newLat,
						lng: newLng
					},
					mapPosition: {
						lat: newLat,
						lng: newLng
					},
				} )
			},
			error => {
				console.error(error);
			}
		);
	};

	/**
	 * When the user types an address in the search box
	 * @param place
	 */
	onPlaceSelected = ( place ) => {
		console.log( 'plc', place );
		const address = place.formatted_address,
		      addressArray =  place.address_components,
		      city = this.getCity( addressArray ),
		      area = this.getArea( addressArray ),
		      avenue = this.getAvenue( addressArray ),
		      latValue = place.geometry.location.lat(),
		      lngValue = place.geometry.location.lng();
		// Set these values in the state.
		this.setState({
			address: ( address ) ? address : '',
			area: ( area ) ? area : '',
			city: ( city ) ? city : '',
			avenue: ( avenue ) ? avenue : '',
			markerPosition: {
				lat: latValue,
				lng: lngValue
			},
			mapPosition: {
				lat: latValue,
				lng: lngValue
			},
		})
	};

    handleFormSubmit(e) {
		e.preventDefault();
		const form = document.forms.rescueAdd;
		const rescue = {
		  city: form.city.value, area: form.area.value, avenue: form.avenue.value, 
		  address: form.address.value, name: form.name.value, phoneNumber:form.phoneNumber.value
		}
		this.createRescue(rescue);
		if ( rescue.name != 0 && rescue.phoneNumber != 0 ) {
			alert("New rescue location has been added!");
		  }
		form.city.value = ""; 
		form.area.value = "";
		form.avenue.value = "";
		form.address.value = "";
		form.name.value = "";
		form.phoneNumber.value = "";
		
		const marker = {
			lat: this.state.markerPosition.lat, lng: this.state.markerPosition.lng
		}
		this.createMarker(marker);
		marker.lat = "";
		marker.lng = "";

		window.location.reload(false);
	  }
	
	  async createRescue(rescue) {
		const query = `mutation rescueAdd($rescue: RescueInputs!) {
		  rescueAdd(rescue: $rescue) {
			id
		  }
		}`;
	
		const data = await graphQLFetch(query, { rescue });
		if (data) {
		  console.log(data);
		}
		
	  }
	  async createMarker(marker) {
		const query = `mutation markerAdd($marker: MarkerInputs!) {
		  markerAdd(marker: $marker) {
			id
		  }
		}`;
	
		const data = await graphQLFetch(query, { marker });
		if (data) {
		  console.log(data);
		}
		
	  }
	  

	render(){
		const AsyncMap = withScriptjs(
			withGoogleMap(
				props => (
					<GoogleMap google={ this.props.google }
					           defaultZoom={ this.props.zoom }
					           defaultCenter={{ lat: this.state.mapPosition.lat, lng: this.state.mapPosition.lng }}
					>
						{/* InfoWindow on top of marker */}
						<InfoWindow
							onClose={this.onInfoWindowClose}
							position={{ lat: ( this.state.markerPosition.lat + 0.0018 ), lng: this.state.markerPosition.lng }}
						>
							<div>
								<span style={{ padding: 0, margin: 0 }}>Drag this marker to publish a new rescue</span>
							</div>
						</InfoWindow>

						{/*Marker*/}
						{this.state.markers.map((marker) => (
							<Marker
								key={`${marker.lat}-${marker.lng}`}
								position={{ lat: parseFloat(marker.lat), lng: parseFloat(marker.lng) }}
								icon={{
									url: `/cat.png`,
									origin: new window.google.maps.Point(0, 0),
									anchor: new window.google.maps.Point(15, 15),
									scaledSize: new window.google.maps.Size(30, 30),
								  }}
							/>
							))}

						  {/*Draggable marker*/}
						<Marker google={this.props.google}
						        name={'Dolores park'}
						        draggable={true}
						        onDragEnd={ this.onMarkerDragEnd }
						        position={{ lat: this.state.markerPosition.lat, lng: this.state.markerPosition.lng }}
						/>
						<Marker />
						
						{/* For Auto complete Search Box */}
						<Autocomplete
							style={{
								width: '100%',
								height: '40px',
								paddingLeft: '16px',
								marginTop: '2px',
								marginBottom: '500px'
							}}
							onPlaceSelected={ this.onPlaceSelected }
							types={['(regions)']}
						/>
						
					</GoogleMap>
				)
			)
		);
		let map;
		if( this.props.center.lat !== undefined ) {
			map = <div>
				<AsyncMap
					googleMapURL={`https://maps.googleapis.com/maps/api/js?key=xxx`}
					loadingElement={
						<div style={{ height: `100%` }} />
					}
					containerElement={
						<div style={{ height: this.props.height }} />
					}
					mapElement={
						<div style={{ height: `100%` }} />
					}
				/>
        <div className="words">
          <br></br>
          <br></br>
          <br></br>
          <br></br>
          <br></br>
          <p>You can drag the map marker to autofill in the address form. Our volunteers will come as soon as possible!</p>

        </div>
        <div className="words">
		<Aux>
            <Section sectionType="Blue" displayType="Flex">
				<body>
					<form name="rescueAdd" onSubmit={this.handleFormSubmit}>
						<label htmlFor="">City</label>
						<input type="text" name="city" className="form-control" onChange={ this.onChange } value={ this.state.city }/>
						<p></p>
						<label htmlFor="">Area</label>
						<input type="text" name="area" className="form-control" onChange={ this.onChange } value={ this.state.area }/>
						<p></p>
				
						<label htmlFor="">Avenue</label>
						<input type="text" name="avenue" className="form-control" onChange={ this.onChange } value={ this.state.avenue }/>
						<p></p>
						<label htmlFor="">Address</label>
						<input type="text" name="address" className="form-control" onChange={ this.onChange } value={ this.state.address }/>
						<p></p>
						<label htmlFor="">Your name</label>
						<input type="text" name="name" className="form-control" />
						<p></p>
						<label htmlFor="">Cellphone</label>
						<input type="text" name="phoneNumber" className="form-control"/>
				
					<p></p>
					<button className="submit">Submit</button>
				</form>
				</body>
				</Section>
        </Aux>
				</div>

		</div>
		} else {
			map = <div style={{height: this.props.height}} />
		}
		return( map )
	}
}
export default Map

 