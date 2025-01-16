import React, { useEffect, useRef, useState } from 'react'; 
import { Map, View } from "ol";
import './MapComponent.css'; 
import {
  Circle as CircleStyle,// CircleStyle: Style for creating circular markers.
  Fill, // Fill: Style for filling shapes.
  RegularShape, // RegularShape: Style for regular shapes. 
  Stroke, // Stroke: Style for outlines of shapes.
  Style, // Style: General style for defining the appearance of map features.
  Text, // Text: Style for adding text labels to features.
} from 'ol/style.js';     
import "ol/ol.css"; // ol.css: The default CSS for OpenLayers to style the map and its controls.
import Feature from 'ol/Feature'; // Feature: Represents a geographic feature like a point, line, or polygon.
import { Draw, Modify } from 'ol/interaction.js'; // Draw: Interaction for drawing vector features on the map. Modify: Interaction for modifying vector features like moving or resizing.
import { LineString, Point } from 'ol/geom.js'; // LineString: Represents a line geometry with a series of points. Point: Represents a single point geometry.
import { OSM, Vector as VectorSource } from 'ol/source.js'; // OSM: Source for OpenStreetMap tiles. VectorSource: Source for vector data like points, lines, and polygons.
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js'; // TileLayer: Layer for displaying raster tiles. VectorLayer: Layer for rendering vector data provided by a VectorSource.
import { getArea, getLength } from 'ol/sphere.js'; // getArea: Function to calculate the area of a polygon. getLength: Function to calculate the length of a line.
import { fromLonLat } from 'ol/proj'; // fromLonLat: Function to convert geographic coordinates (longitude, latitude) to map projection coordinates.


function MapComponent() {
  let tipPoint = null; 
  const mapElement = useRef(); // Reference to the DOM element for the map
  const mapRef = useRef(); // Reference to the map object
  const [type, setType] = useState('LineString'); // Geometry type (point, line, etc.)
  const [segments, setSegments] = useState(false); // Whether to show segments
  const [clearPrevious, setClearPrevious] = useState(false); // Whether to clear previous data
  const [drawingInfo, setDrawingInfo] = useState([]); // Information about drawing
  const [unit, setUnit] = useState('km'); // Unit of measurement for area and length
  const [angleUnit, setAngleUnit] = useState('degrees'); // Unit of measurement for angles
  const [coordinates, setCoordinates] = useState({ lon: '', lat: '' }); // Coordinates for adding a point
  const [points, setPoints] = useState([]); // State to store points
  const vectorSourceRef = useRef(new VectorSource()); // Vector source to store points and lines
  const [showHelp, setShowHelp] = useState(false); // Whether to show help modal

  // Formatting area
  const formatArea = (polygon) => {
    const area = getArea(polygon);
    let output;
    if (unit === 'miles') {
      output = area > 10000 ? Math.round((area / 1000000) * 0.3861 * 100) / 100 + ' mi²' : Math.round(area * 0.000247105) + ' mi²';
    } else {
      if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + ' km²';
      } else {
        output = Math.round(area * 100) / 100 + ' m²';
      }
    }
    return output;
  };

  // Formatting length
  const formatLength = (line) => {
    const length = getLength(line);
    let output;
    if (unit === 'miles') {
      output = length > 100 ? Math.round((length / 1609.34) * 100) / 100 + ' mi' : Math.round(length * 0.000621371) + ' mi';
    } else {
      output = length > 100 ? Math.round((length / 1000) * 100) / 100 + ' km' : Math.round(length * 100) / 100 + ' m';
    }
    return output;
  };

  // Formatting angle
  const formatAngle = (angle) => {
    if (angleUnit === 'radians') {
      return Math.round(angle * 100) / 100 + ' rad';
    } else {
      const angleInDegrees = (angle * 180) / Math.PI;
      return Math.round(angleInDegrees * 100) / 100 + '°'; 
    }
  };

  // Function to add a point to the map
  const addPoint = (lon, lat) => {
    const newPoint = new Feature(new Point(fromLonLat([lon, lat]))); // Convert coordinates to LonLat
    newPoint.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({ color: 'red' }), 
          stroke: new Stroke({ color: 'white', width: 2 }), 
        }),
      })
    );
    setPoints((prevPoints) => [...prevPoints, newPoint]); // Add point to the state
  };

  // Function to draw a line
  const drawLine = (points) => {
    if (points.length < 2) return null; 
    const line = new LineString(points.map((point) => point.getGeometry().getCoordinates()));
    return new Feature(line); // Create Feature for the line
  };

  // Handler for adding a point through the interface
  const handleAddPoint = () => {
    const { lon, lat } = coordinates;
    if (lon && lat) {
      addPoint(parseFloat(lon), parseFloat(lat)); // Add point
      setCoordinates({ lon: '', lat: '' }); // Clear input fields
    }
  };

  // Handler to clear the map
  const handleClearMap = () => {
    setPoints([]); // Clear points state
    const vectorSource = vectorSourceRef.current;
    vectorSource.clear(); // Clear vector source
  };

  // useEffect for initializing the map and interactions
  useEffect(() => {
    // Create OSM layer for the map
    const osmLayer = new TileLayer({
      preload: Infinity,
      source: new OSM(), // OpenStreetMap source
    });
  
    // Get vector source
    const vectorSource = vectorSourceRef.current;
  
    // Create vector layer
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: function (feature) {
        return styleFunction(feature, segments, type); // Define style for objects
      },
    });
  
    // Initialize the map
    const map = new Map({
      layers: [
        osmLayer, // Map layer
        vectorLayer, // Vector layer for points and lines
      ],
      target: mapElement.current, // Target DOM element for the map
      view: new View({
        center: [1700000, 6350000], // Map center
        zoom: 1, // Zoom level
      }),
    });
  
    // Create and add interaction for modifying objects
    const modifyInteraction = new Modify({
      source: vectorSource,
      style: modifyStyle, // Style for interaction
    });
  
    map.addInteraction(modifyInteraction);
  
    // Add other interactions
    addInteraction(map, vectorSource, modifyInteraction, styleFunction, type, clearPrevious);
  
    // Clear vector source and add points and lines
    vectorSource.clear(); // Clear old objects
  
    points.forEach((point) => vectorSource.addFeature(point)); // Add new points
    const lineFeature = drawLine(points); // Draw the line
    if (lineFeature) {
      vectorSource.addFeature(lineFeature); // Add line to the source
    }
  
    mapRef.current = map; // Save reference to the map
  
    // Cleanup on component unmount
    return () => {
      map.setTarget(null); // Remove the map
    };
  }, [segments, type, clearPrevious, unit, points]); // Dependencies for updating map when data changes

  // Function to add interactions with the map: drawing objects and modifying them
  const addInteraction = (map, source, modify, styleFunction, type, clearPrevious) => {
    let tip = 'Click to start measuring'; // Initial tip
    const activeTip = 'Click to continue drawing the ' + (type === 'Polygon' ? 'polygon' : 'line'); // Tip to continue drawing

    // Create a drawing object (Draw) for working with polygons or lines
    const draw = new Draw({
      source,
      type,
      style: (feature) => styleFunction(feature, segments, type, tip),
    });

    let isShiftPressed = false; // Variable to track the Shift key press

    // Event handler for Shift key press tracking
    const handlePointerDown = (e) => {
      isShiftPressed = e.originalEvent.shiftKey; // Update state on Shift key press
    };

    // Listen for pointer down event on the map
    map.on('pointerdown', handlePointerDown);

    // Start drawing: clear the map, disable modification, change tip
    draw.on('drawstart', function (e) {
      if (clearPrevious) {
        source.clear(); // Clear all previous elements
      }
      modify.setActive(false); // Disable modification
      tip = activeTip; // Change the tip
      e.feature.set('calculateAngles', !isShiftPressed); // Set whether to calculate angles
    });

    // End drawing: calculate length and angles, add them to the map
    draw.on('drawend', function (e) {
      const feature = e.feature;
      const geometry = feature.getGeometry();
      const tipPoint = geometry.getLastCoordinate();
      modify.setActive(true); // Enable modification

      const calculateAngles = feature.get('calculateAngles'); // Flag to calculate angles
      let info = `Drawing ${drawingInfo.length + 1}. Type: ${type === 'Polygon' ? 'Polygon' : 'Line'}`;

      // For polygons
      if (type === 'Polygon') {
        const polygon = geometry;
        const length = formatLength(polygon);
        const segmentsCount = polygon.getCoordinates()[0].length - 1;
        let angles = [];
        let anglePoints = [];

        // Calculate angles if needed
        if (calculateAngles) {
          const coords = polygon.getCoordinates()[0];
          for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i === 0 ? coords.length - 2 : i - 1]; // For the first segment, link the first point to the last one
            const b = coords[i];
            const c = coords[i + 1 === coords.length ? 0 : i + 1]; // For the last segment, link the last point to the first one

            const angle = calculateAngle(a, b, c); // Calculate the angle
            angles.push(angle);
            anglePoints.push(b); // Angle point
          }
        }

        // Add polygon information
        info += `\nTotal lines: ${segmentsCount}, Length: ${length}, Total angles: ${angles.length}, Angles: ${angles.map(angle => formatAngle(angle)).join(', ')}`;

        // Remove old angles if any
        source.getFeatures().forEach(feature => {
          if (feature.getGeometry().getType() === 'Point') {
            source.removeFeature(feature); // Remove all Point objects (angles)
          }
        });

        // Add new angles
        anglePoints.forEach((point, index) => {
          const angleFeature = new Feature(new Point(point));

          const angle = formatAngle(angles[index]);

          // Style for displaying angles
          angleFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 5,
              stroke: new Stroke({ color: 'red' }),
              fill: new Fill({ color: 'rgba(255, 0, 0, 0.6)' }),
            }),
            text: new Text({
              text: angle,
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: 'white' }),
              backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.6)' }),
              padding: [3, 3, 3, 3],
              offsetY: -15,
              textBaseline: 'bottom',
            }),
          }));

          source.addFeature(angleFeature); // Add the angle to the map
        });
      }

      // For line
      if (type === 'LineString') {
        const line = geometry;
        const length = formatLength(line);
        const segmentsCount = line.getCoordinates().length - 1;
        let angles = [];
        let anglePoints = [];

        // Calculate angles if needed
        if (calculateAngles) {
          for (let i = 1; i < line.getCoordinates().length - 1; i++) {
            const a = line.getCoordinates()[i - 1];
            const b = line.getCoordinates()[i];
            const c = line.getCoordinates()[i + 1];

            const angle = calculateAngle(a, b, c); // Calculate the angle
            angles.push(angle);

            anglePoints.push(b); // Angle point
          }
        }

        // Add line information
        info += `\nTotal lines: ${segmentsCount}, Length: ${length}, Total angles: ${angles.length}, Angles: ${angles.map(angle => formatAngle(angle)).join(', ')}`;

        // Remove old angles if any
        source.getFeatures().forEach(feature => {
          if (feature.getGeometry().getType() === 'Point') {
            source.removeFeature(feature); // Remove all Point objects (angles)
          }
        });

        // Add new angles
        anglePoints.forEach((point, index) => {
          const angleFeature = new Feature(new Point(point)); // Create a Feature for the angle

          const angle = formatAngle(angles[index]); // `angles` is an array of angles

          angleFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 5,
              stroke: new Stroke({ color: 'red' }),
              fill: new Fill({ color: 'rgba(255, 0, 0, 0.6)' }),
            }),
            text: new Text({
              text: angle, // Angle will be displayed as text near the point
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: 'white' }),
              backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.6)' }),
              padding: [3, 3, 3, 3],
              offsetY: -15,
              textBaseline: 'bottom',
            }),
          }));

          source.addFeature(angleFeature); // Add the new angle to the map
        });
      }

      // Update drawing information
      setDrawingInfo(prevInfo => [...prevInfo, info]);
    });

    // Modification: recalculate angles when changed
    modify.on('modifyend', function (e) {
      const feature = e.features.getArray()[0]; // Get the modified feature

      if (feature && feature.getGeometry().getType() === 'Polygon') {
        const geometry = feature.getGeometry();
        const angles = [];
        const anglePoints = [];

        const coords = geometry.getCoordinates()[0];
        for (let i = 0; i < coords.length - 1; i++) {
          const a = coords[i === 0 ? coords.length - 2 : i - 1];
          const b = coords[i];
          const c = coords[i + 1 === coords.length ? 0 : i + 1];

          const angle = calculateAngle(a, b, c); // Calculate the angle
          angles.push(angle);
          anglePoints.push(b);
        }

        let info = `Modified Polygon: Length: ${formatLength(geometry)}, Angles: ${angles.map(angle => formatAngle(angle)).join(', ')}`;

        // Remove old angles
        source.getFeatures().forEach(feature => {
          if (feature.getGeometry().getType() === 'Point') {
            source.removeFeature(feature);
          }
        });

        // Add new angles
        anglePoints.forEach((point, index) => {
          const angleFeature = new Feature(new Point(point));

          const angle = formatAngle(angles[index]);

          angleFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 5,
              stroke: new Stroke({ color: 'red' }),
              fill: new Fill({ color: 'rgba(255, 0, 0, 0.6)' }),
            }),
            text: new Text({
              text: angle,
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: 'white' }),
              backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.6)' }),
              padding: [3, 3, 3, 3],
              offsetY: -15,
              textBaseline: 'bottom',
            }),
          }));

          source.addFeature(angleFeature); // Add angle to the map
        });

        setDrawingInfo(prevInfo => [...prevInfo, info]); // Update drawing information
      }

      if (feature && feature.getGeometry().getType() === 'LineString') {
        const geometry = feature.getGeometry();
        const angles = [];
        const anglePoints = [];
        let angleFeatures = []; // For storing angle objects to remove them

        const line = geometry;
        for (let i = 1; i < line.getCoordinates().length - 1; i++) {
          const a = line.getCoordinates()[i - 1];
          const b = line.getCoordinates()[i];
          const c = line.getCoordinates()[i + 1];
          const angle = calculateAngle(a, b, c); // Calculate the angle
          angles.push(angle);
          anglePoints.push(b); // Angle point
        }

        let info = `Modified Line: Length: ${formatLength(line)}, Angles: ${angles.map(angle => formatAngle(angle)).join(', ')}`;

        // Remove old angles
        source.getFeatures().forEach(feature => {
          if (feature.getGeometry().getType() === 'Point') {
            source.removeFeature(feature); // Remove all Point objects (angles)
          }
        });

        // Add new angles
        anglePoints.forEach((point, index) => {
          const angleFeature = new Feature(new Point(point)); // Create a Feature for the angle

          const angle = formatAngle(angles[index]); // `angles` is an array of angles

          angleFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 5,
              stroke: new Stroke({ color: 'red' }),
              fill: new Fill({ color: 'rgba(255, 0, 0, 0.6)' }),
            }),
            text: new Text({
              text: angle, // Angle will be displayed as text next to the point
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: 'white' }),
              backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.6)' }),
              padding: [3, 3, 3, 3],
              offsetY: -15,
              textBaseline: 'bottom',
            }),
          }));

          source.addFeature(angleFeature); // Add new angle to the map
        });

        setDrawingInfo(prevInfo => [...prevInfo, info]); // Update drawing information
      }
    });

    // Add interactions to the map
    map.addInteraction(draw);
    map.addInteraction(modify);

    // Remove event listener when interactions are removed
    return () => {
      map.un('pointerdown', handlePointerDown);
    };
  };

  // Function to calculate the angle between three points
  const calculateAngle = (a, b, c) => {
    const angle1 = Math.atan2(b[1] - a[1], b[0] - a[0]); 
    const angle2 = Math.atan2(c[1] - b[1], c[0] - b[0]); 

    let angleBetween = Math.abs(angle2 - angle1);

    if (angleBetween > Math.PI) {
      angleBetween = 2 * Math.PI - angleBetween;
    }

    return angleBetween;
  };

  // Function for styling objects
  function styleFunction(feature, segments, drawType, tip) {
    const styles = []; // Array to store the styles for the feature
    const geometry = feature.getGeometry(); // Get the geometry of the feature
    const type = geometry.getType(); // Get the type of the geometry (Point, LineString, Polygon, etc.)
    let point, label, line;

    // Apply styling based on the drawType (if any) and geometry type
    if (!drawType || drawType === type || type === 'Point') {
      styles.push(style); // Add default style to the styles array
      if (type === 'Polygon') { 
        point = geometry.getInteriorPoint(); // For polygons, get the interior point (a point inside the polygon)
        label = formatArea(geometry); // Format and calculate the area of the polygon
        line = new LineString(geometry.getCoordinates()[0]); // Create a LineString from the polygon's coordinates (first ring)
      } else if (type === 'LineString') {
        point = new Point(geometry.getLastCoordinate()); // For lines, get the last point of the line
        label = formatLength(geometry); // Format and calculate the length of the line
        line = geometry; // The line itself is used as is
      }
    }

    // Styling for segments (if segments are provided)
    if (segments && line) {
      let count = 0; // Counter for segments
      line.forEachSegment(function (a, b) {
        const segment = new LineString([a, b]); // Create a segment between two points
        const label = formatLength(segment); // Format and calculate the length of the segment
        if (segmentStyles.length - 1 < count) {
          segmentStyles.push(segmentStyle.clone()); // Clone the segment style if needed
        }
        const segmentPoint = new Point(segment.getCoordinateAt(0.5)); // Create a point in the middle of the segment
        segmentStyles[count].setGeometry(segmentPoint); // Set the geometry of the segment style
        segmentStyles[count].getText().setText(label); // Set the label of the segment
        styles.push(segmentStyles[count]); // Add the segment style to the styles array
        count++; // Increment the segment counter
      });
    }

    // Adding a label to the object (polygon or line)
    if (label) {
      labelStyle.setGeometry(point); // Set the geometry of the label (position of the label)
      labelStyle.getText().setText(label); // Set the text of the label (area for polygons or length for lines)
      styles.push(labelStyle); // Add the label style to the styles array
    }

    // Add a tooltip if it is needed
    if (
      tip &&
      type === 'Point' &&
      !modify.getOverlay().getSource().getFeatures().length
    ) {
      tipPoint = geometry; // Set the tip's point to the geometry of the feature
      tipStyle.getText().setText(tip); // Set the text of the tooltip
      styles.push(tipStyle); // Add the tooltip style to the styles array
    }

    return styles; // Return the array of styles
  }

  // Style for drawn objects (lines, polygons, points)
  const style = new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.69)',
    }),
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.5)',
      lineDash: [10, 10],
      width: 2,
    }),
    image: new CircleStyle({
      radius: 5,
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.7)',
      }),
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
    }),
  });

  // Style for displaying labels
  const labelStyle = new Style({
    text: new Text({
      font: '14px Calibri,sans-serif',
      fill: new Fill({
        color: 'rgba(255, 255, 255, 1)',
      }),
      backgroundFill: new Fill({
        color: 'rgba(0, 0, 0, 0.7)',
      }),
      padding: [3, 3, 3, 3],
      textBaseline: 'bottom',
      offsetY: -15,
    }),
    image: new RegularShape({
      radius: 8,
      points: 3,
      angle: Math.PI,
      displacement: [0, 10],
      fill: new Fill({
        color: 'rgba(0, 0, 0, 0.7)',
      }),
    }),
  });

  // Style for the tip on the map
  const tipStyle = new Style({
    text: new Text({
      font: '12px Calibri,sans-serif',
      fill: new Fill({
        color: 'rgba(255, 255, 255, 1)',
      }),
      backgroundFill: new Fill({
        color: 'rgba(0, 0, 0, 0.4)',
      }),
      padding: [2, 2, 2, 2],
      textAlign: 'left',
      offsetX: 15,
    }),
  });

  // Style for interaction with modifying objects
  const modifyStyle = new Style({
    image: new CircleStyle({
      radius: 5,
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.7)',
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 0, 0.4)',
      }),
    }),
    text: new Text({
      text: 'Drag to modify',
      font: '12px Calibri,sans-serif',
      fill: new Fill({
        color: 'rgba(255, 255, 255, 1)',
      }),
      backgroundFill: new Fill({
        color: 'rgba(0, 0, 0, 0.7)',
      }),
      padding: [2, 2, 2, 2],
      textAlign: 'left',
      offsetX: 15,
    }),
  });

  // Style for displaying segments (lines)
  const segmentStyle = new Style({
    text: new Text({
      font: '12px Calibri,sans-serif',
      fill: new Fill({
        color: 'rgba(255, 255, 255, 1)',
      }),
      backgroundFill: new Fill({
        color: 'rgba(0, 0, 0, 0.4)',
      }),
      padding: [2, 2, 2, 2],
      textBaseline: 'bottom',
      offsetY: -12,
    }),
    image: new RegularShape({
      radius: 6,
      points: 3,
      angle: Math.PI,
      displacement: [0, 8],
      fill: new Fill({
        color: 'rgba(0, 0, 0, 0.4)',
      }),
    }),
  });

  // Array of segment styles
  const segmentStyles = [segmentStyle];
  const source = new VectorSource(); // Source for vector data
  const modify = new Modify({ source: source, style: modifyStyle }); // Create interaction for modifying objects

  return (
    <>
      <div className="controls">
        <label className="control-label">
          Type:
          <select className="control-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="LineString">LineString</option>
            <option value="Polygon">Polygon</option>
          </select>
        </label>

        <label className="control-checkbox">
          <input
            type="checkbox"
            className="control-checkbox-input"
            checked={segments}
            onChange={(e) => setSegments(e.target.checked)}
          />
          Show Segments
        </label>

        <label className="control-checkbox">
          <input
            type="checkbox"
            className="control-checkbox-input"
            checked={clearPrevious}
            onChange={(e) => setClearPrevious(e.target.checked)}
          />
          Clear Previous
        </label>

        <label className="control-label">
          Units:
          <select className="control-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="km">Kilometers</option>
            <option value="miles">Miles</option>
          </select>
        </label>

        <label className="control-label">
          Angle:
          <select className="control-select" value={angleUnit} onChange={(e) => setAngleUnit(e.target.value)}>
            <option value="degrees">Degrees</option>
            <option value="radians">Radians</option>
          </select>
        </label>
      </div>

      <div className="coordinates">
        <input
          type="number"
          className="coordinate-input"
          value={coordinates.lon}
          onChange={(e) => setCoordinates({ ...coordinates, lon: e.target.value })}
          placeholder="Longitude (EPSG:4326)"
        />
        <input
          type="number"
          className="coordinate-input"
          value={coordinates.lat}
          onChange={(e) => setCoordinates({ ...coordinates, lat: e.target.value })}
          placeholder="Latitude (EPSG:4326)"
        />
        <button className="control-button" onClick={handleAddPoint}>Add Point</button>
        <button className="control-button" onClick={handleClearMap}>Clear Map</button>
      </div>

      <div ref={mapElement} className="map-container"></div>

      <div className="drawings">
        <button className="drawing-button" onClick={() => setDrawingInfo([])}>Clear All Drawings</button>
        <br/>
        {drawingInfo.map((info, index) => (
          <div key={index}>
            <strong>Drawing {index + 1}:</strong>
            <pre className="drawing-info">{info}</pre>
          </div>
        ))}
      </div>
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>
      {showHelp && (
        <div className="help-modal" onClick={() => setShowHelp(false)}>
          <div className="help-modal-content">
            <h2>Help</h2>
            <br></br>
            <p><strong>LineString</strong> allows you to draw multiple lines on the map, displaying their length and angle. If you hold down <strong>Shift</strong> and click the left mouse button, you can create a freehand segment, and angles will not be displayed for freehand segments.</p><br></br>
            <p><strong>Polygon</strong> — if you need to work with a specific area, you can use this feature to toggle it, using the <strong>Type</strong> dropdown menu. You can also create freehand shapes while holding down <strong>Shift</strong>.</p><br></br>
            <p><strong>Show segments</strong> displays individual segments and their length if the checkbox is active.</p><br></br>
            <p><strong>Clear Previous</strong> — if the checkbox is active, it will erase your previous drawing.</p><br></br>
            <p><strong>Units and Angle</strong> — for displaying information in miles/kilometers and degrees/radians.</p><br></br>
            <p><strong>"Longitude (EPSG:4326)" and "Latitude (EPSG:4326)"</strong> — if you want to input coordinates, you can do so, and a point will appear. When a second point is added, the distance between the points will be measured, and so on. Here are some examples: Prague, Washington, Sydney.</p><br></br>
            <p>
              <strong>Coordinates for these cities:</strong><br />
              <strong>Prague:</strong> 50.0755° N, 14.4378° E<br />
              <strong>Washington:</strong> 38.9072° N, 77.0369° W<br />
              <strong>Sydney:</strong> -33.8688° S, 151.2093° E
            </p>
          </div>
        </div>
      )}
    </>

  );
};

export default MapComponent;
