// #############################################################################
// ### IMPORT MODULES ###
// #############################################################################

// RGB time series charting module: https://github.com/jdbcode/ee-rgb-timeseries
// Import modules.
var rgbTs = require(
  'users/jstnbraaten/modules:rgb-timeseries/rgb-timeseries.js'); 
var getImagesLib = require('users/rcr-training/geeViz-js:getImagesLib.js')

// ############################################################################# 
// ### GET URL PARAMS ###
// #############################################################################

var initRun = 'false';
var runUrl = ui.url.get('run', initRun);
ui.url.set('run', runUrl);

var initSensor = 'Sentinel-2 TOA';
var sensorUrl = ui.url.get('sensor', initSensor);
ui.url.set('sensor', sensorUrl);

var initLon = -121.68804;
var lonUrl = ui.url.get('lon', initLon);
ui.url.set('lon', lonUrl);

var initLat = 36.46517;
var latUrl = ui.url.get('lat', initLat);
ui.url.set('lat', latUrl);

var initIndex = 'NBR';
var indexUrl = ui.url.get('index', initIndex);
ui.url.set('index', indexUrl);

var initRgb = 'SWIR1/NIR/GREEN';
var rgbUrl = ui.url.get('rgb', initRgb);
ui.url.set('rgb', rgbUrl);

var initFrom = '2025-06-10';
var fromUrl = ui.url.get('from', initFrom);
ui.url.set('from', fromUrl);

var initTo = '2025-09-20';
var toUrl = ui.url.get('to', initTo);
ui.url.set('to', toUrl);

var initCloud = 30;
var cloudUrl = ui.url.get('cloud', initCloud);
ui.url.set('cloud', cloudUrl);

var initChipWidth = 5;
var chipWidthUrl = ui.url.get('chipwidth', initChipWidth);
ui.url.set('chipwidth', chipWidthUrl);

// Global state
var importedGeometryLayer = null;
var donutGeometryLayer = null;
var importedGeometry = null;
var donutGeometry = null;
var AOI_LAYER = null;  
var isIRWINImport = false; // tracks whether the imported geometry came from poly_IRWIN

// WFPerimeters asset path
// var wfigsAsset = 'projects/gtac-veg-region10/assets/wfigs_perimeters'; 
// var wfigsEAAsset = 'projects/gtac-veg-region10/assets/wfigs_perimeter_EA_WGS84';
var wfigsAsset = 'projects/gtac-mtbs/assets/perimeters/wfigs_perimeters_2026'; 
var wfigsEAAsset = 'projects/gtac-mtbs/assets/perimeters/wfigs_perimeter_EA_2026';

var donutMessageLabel = ui.Label('', {color: 'red', margin: '4px 0px 0px 8px'});

var dnbrScenes = [];
var preBurnCollection = null;

// Global array of dNBR layers
var dnbrLayers = dnbrLayers || [];
var dnbrSliderPanel = null;  // keep reference
var preburnMaskLayers = [];  // track all preburn masked layers

// #############################################################################
// ### DEFINE UI ELEMENTS ###
// #############################################################################

// Style.
var CONTROL_PANEL_WIDTH = '280px';
var CONTROL_PANEL_WIDTH_HIDE = '141px';
var textFont = {
  fontSize: '12px', margin: '4px 8px 0px 8px'};
var headerFont = {
  fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 0px 8px'};
var sectionFont = {
  fontSize: '16px', color: '#808080', margin: '16px 8px 0px 8px'};
var infoFont = {fontSize: '11px', color: '#505050'};

// Control panel.
var controlPanel = ui.Panel({
  style: {position: 'top-left', width: CONTROL_PANEL_WIDTH_HIDE,
    maxHeight: '90%'
  }});

// Info panel.
var infoElements = ui.Panel(
  {style: {shown: false, margin: '0px -8px 0px -8px'}});

// Element panel.
var controlElements = ui.Panel(
  {style: {shown: false, margin: '0px -8px 0px -8px'}});

// Instruction panel.
var instr = ui.Label('Image Pair Evaluation Application',
                     {fontSize: '15px', color: '#303030', margin: '0px 0px 6px 0px'});

// Show/hide info panel button.
var infoButton = ui.Button(
  {label: 'About ❯', style: {margin: '0px 4px 0px 0px'}});

// Show/hide control panel button.
var controlButton = ui.Button(
  {label: 'Options ❯', style: {margin: '0px 0px 0px 0px'}});

// Info/control button panel.
var buttonPanel = ui.Panel(
  [infoButton, controlButton],
  ui.Panel.Layout.Flow('horizontal'),
  {stretch: 'horizontal', margin: '0px 0px 0px 0px'});

// Options label.
var optionsLabel = ui.Label('Sensor Options', sectionFont);
optionsLabel.style().set('margin', '16px 8px 2px 8px');

// Image Options label.
var ImageoptionsLabel = ui.Label('Image Options', sectionFont);
ImageoptionsLabel.style().set('margin', '16px 8px 2px 8px');

// Information label.
var infoLabel = ui.Label('About', sectionFont);

// Information text. 
var aboutLabel = ui.Label(
  'This app is designed to help facilitate post fire mapping by allowing a ' +
    'user to pick a post-burn image for a given sensor, cloud probability, and date range ' +
    'and the app will return a collection of pre-burn images that have been selected as the top candidate image pairs ' +
    'for MTBS mapping. This is done by using the Extended Assessment (EA) boundary and calculating the mean dNBR ' +
    'for the post burn image and all images 3 years prior, +-45 calendar days of the selected post-burn image. ' +
    'Pre-burn images are then sorted based on which images have the closest average to 0 ' +
    'to highlight changes due to the fire rather than changes in phenology.' +
    'This app builds upon a GEE app that Justin Braaten built: EO Time Series Explorer.',
  infoFont);

var EO_appCodeLink = ui.Label({
    value: 'EO Time Series Explorer',
    style: {fontSize: '11px', color: '#505050', margin: '-4px 8px 0px 8px'}, 
    targetUrl: 'https://jstnbraaten.users.earthengine.app/view/eo-timeseries-explorer#run=false;sensor=Sentinel-2%20SR;lon=-121.68804;lat=36.46517;index=NBR;rgb=SWIR1%2FNIR%2FGREEN;duration=12;cloud=30;chipwidth=2;'
  });

// Sensor selection.
var sensorLabel = ui.Label({value: 'Sensor selection', style: headerFont});
var sensorList = [
  'Sentinel-2 SR', 
  'Sentinel-2 TOA',
  'Landsat-8/9 SR', 
  'Landsat-8/9 TOA',
  'Landsat-5/7 SR', 
  'Landsat-5/7 TOA'
];

var sensorSelect = ui.Select({
  items: sensorList, placeholder: ui.url.get('sensor'),
  value: ui.url.get('sensor'), style: {stretch: 'horizontal'}
});
var sensorPanel = ui.Panel([sensorLabel, sensorSelect], null, {stretch: 'horizontal'});

// Y-axis index selection.
var indexLabel = ui.Label('Y-axis index', headerFont);
var indexList = ['NBR', 'NDVI', 'Blue', 'Green', 'Red',
                 'NIR', 'SWIR1', 'SWIR2'];
var indexSelect = ui.Select(
  {items: indexList, value: ui.url.get('index'), style: {stretch: 'horizontal'}});
var indexPanel = ui.Panel(
  [indexLabel, indexSelect], null, {stretch: 'horizontal'});

// RGB bands selection.
var rgbLabel = ui.Label({value: 'RGB visualization', style: headerFont});
var rgbList = ['SWIR1/NIR/GREEN', 'RED/GREEN/BLUE', 'NIR/RED/GREEN',
               'NIR/SWIR1/RED'];
var rgbSelect = ui.Select({
  items: rgbList, placeholder: ui.url.get('rgb'),
  value: ui.url.get('rgb'), style: {stretch: 'horizontal'}
});
var rgbPanel = ui.Panel([rgbLabel, rgbSelect], null, {stretch: 'horizontal'});

// Date panel
var dateSectionLabel = ui.Label(
  'Date Range: YYYY-MM-DD', headerFont
);

var startDayLabel = ui.Label('From:', textFont);
var startDayBox = ui.Textbox({
  value: ui.url.get('from'),
  style: {stretch: 'horizontal', width: '100px', margin: '0px 8px 0px 0px'}
});

var endDayLabel = ui.Label('To:', textFont);
var endDayBox = ui.Textbox({
  value: ui.url.get('to'),
  style: {stretch: 'horizontal', width: '100px', margin: '0px 0px 0px 8px'}
});

// Inner horizontal panel for labels + textboxes
var dateInputsPanel = ui.Panel([
  startDayLabel, startDayBox,
  endDayLabel, endDayBox
],
ui.Panel.Layout.Flow('horizontal'),
{stretch: 'horizontal', margin: '0px'}
);

// Outer panel wrapping the section label + inputs
var datePanel = ui.Panel([
  dateSectionLabel,
  dateInputsPanel
],
null,  // default vertical flow
{margin: '0px 8px 8px 8px', stretch: 'horizontal'}
);

// Cloud threshold.
var cloudLabel = ui.Label(
  {value: 'Cloud threshold % (exclude >)', style: headerFont});
var cloudSlider = ui.Slider({
  min: 0, max: 100 , value: parseInt(ui.url.get('cloud')),
  step: 1, style: {stretch: 'horizontal'}
});
var cloudPanel = ui.Panel(
  [cloudLabel, cloudSlider], null, {stretch: 'horizontal'});

// Region buffer.
var regionWidthLabel = ui.Label(
  {value: 'Image chip width (km)', style: headerFont});
var regionWidthSlider = ui.Slider({
  min: 1, max: 10 , value: parseInt(ui.url.get('chipwidth')),
  step: 1, style: {stretch: 'horizontal'}
});
var regionWidthPanel = ui.Panel(
  [regionWidthLabel, regionWidthSlider], null, {stretch: 'horizontal'});

// ---  Add limit checkbox + input ---
var postburnlimitImagesLabel = ui.Label(
  'Limit number of Post-Burn Images', headerFont
);

var postburnmaxImagesInput = ui.Textbox({
  placeholder: 'Max images (e.g., 20)',
  style: {stretch: 'horizontal'}
});

// Panel for the limit control
var postburnlimitPanel = ui.Panel([postburnlimitImagesLabel, postburnmaxImagesInput], ui.Panel.Layout.Flow('vertical'));

// Pre-burn search window
var preburnsearchwindowLabel = ui.Label(
  'Pre-Burn Search Window', headerFont
);

// Pre-burn year search window
var preburnyearwindowLabel = ui.Label(
  'Number of years prior:', textFont
);

var preburnyearwindowInput = ui.Textbox({
  placeholder: 'Number of Years to search for Pre-Burn Image Pairs',
  value: '1',
  style: {stretch: 'horizontal'}
});

// Pre-burn date search window
var preburndatewindowLabel = ui.Label(
  'Number of days (±):', textFont
);

var preburndatewindowInput = ui.Textbox({
  placeholder: 'Number of days around post burn date',
  value: '30',
  style: {stretch: 'horizontal'}
});

// Panel for the limit control
var preburnsearchwindowPanel = ui.Panel([preburnsearchwindowLabel, preburnyearwindowLabel, preburnyearwindowInput, preburndatewindowLabel, preburndatewindowInput], ui.Panel.Layout.Flow('vertical'));

// ---  Add limit checkbox + input ---
var preburnlimitImagesLabel = ui.Label(
  'Limit number of Top Pre-Burn Image Pairs', headerFont
);

var preburnmaxImagesInput = ui.Textbox({
  placeholder: 'Number of Top Pre-Burn Image Pairs',
  value: '10',
  style: {stretch: 'horizontal'}
});

// Panel for the limit control
var preburnlimitPanel = ui.Panel([preburnlimitImagesLabel, preburnmaxImagesInput], ui.Panel.Layout.Flow('vertical'));

// Sort Variable selection.
var SortHeader = ui.Label({value: 'Sort Pre-Burn Image Pairs using:', style: headerFont});

var SortVariable = [
  '|mean| (closest to 0)', 
  'standard deviation (lowest)'
];

var SortSelect = ui.Select({
  items: SortVariable,
  value: '|mean| (closest to 0)',
  style: {stretch: 'horizontal'}
});

var SortPanel = ui.Panel([SortHeader, SortSelect], null, {stretch: 'horizontal'});

// Geometry Import Panel
var importGeometryLabel = ui.Label('Import Geometry', sectionFont);

// Textbox for asset path
var assetPathBox = ui.Textbox({
  placeholder: 'Paste asset path (e.g., users/yourname/geometry)',
  style: {stretch: 'horizontal'}
});

// Import by asset path
var assetPathBox = ui.Textbox({
  placeholder: 'Enter asset path (e.g., users/me/asset)',
  style: {stretch: 'horizontal'}
});

var importByAssetButton = ui.Button({
  label: 'Import by Asset Path',
  style: {stretch: 'horizontal'},
  onClick: function() {
    var assetPath = assetPathBox.getValue();
    if (!assetPath) {
      console.log('Please enter an asset path.');
      return;
    }
    try {
      var fc = ee.FeatureCollection(assetPath);
      
      // Add the imported geometry to the map
      isIRWINImport = false;
      addImportedGeometry(fc, 'Imported Geometry (Asset)');
      
      // Automatically create donut geometry from the imported geometry
      importedGeometry.centroid().coordinates().evaluate(function(coords) {
        var innerBuffer = importedGeometry.buffer(60);  // 60 m inner
        var outerBuffer = importedGeometry.buffer(310); // 310 m outer
        var donut = outerBuffer.difference(innerBuffer, 1); // geodesic
        
        donutGeometry = ee.FeatureCollection([ee.Feature(donut)]);
        donutGeometryLayer = ui.Map.Layer(
          donutGeometry,
          {color: '#00FF00', fillColor: '00000033'},
          'Donut Geometry'
        );
        
        // Add donut to map if toggle is checked
        if (donutGeomToggle.getValue()) {
          map.layers().add(donutGeometryLayer);
          //bringGeometryLayersToFront();
        }
        donutMessageLabel.setValue('✅ Donut geometry created.');
        donutGeomToggle.setValue(true, false); // optionally check the box
      });
      
    } catch (err) {
      console.log('Failed to load asset. Check path.');
    }
  }
});

// Import by poly_IRWIN
var idBox = ui.Textbox({
  placeholder: 'Enter poly_IRWIN ID',
  style: {stretch: 'horizontal'}
});

idBox.setValue('{A0E0393C-0265-4AC1-8F6A-10C02C2F5BBA}');

var importMessageLabel = ui.Label('', {color: 'red', margin: '4px 0px 0px 8px'});

// Combined Import Button: Load main perimeter + EA Boundary
var importByIdButton = ui.Button({
  label: 'Import poly_IRWIN + EA Boundary',
  style: {stretch: 'horizontal'},
  onClick: function() {
    var enteredId = idBox.getValue();
    if (!enteredId) {
      importMessageLabel.setValue('⚠️ Please enter a poly_IRWIN ID.');
      return;
    }
    
    importMessageLabel.setValue('⏳ Loading geometries for poly_IRWIN = ' + enteredId + ' ...');
    
    // Load main WF Perimeter
    var mainFC = ee.FeatureCollection(wfigsAsset)
    .filter(ee.Filter.eq('poly_IRWIN', enteredId))
    .limit(1);
    
    // Load EA Boundary
    var eaFC = ee.FeatureCollection(wfigsEAAsset)
    .filter(ee.Filter.eq('poly_IRWIN', enteredId))
    .limit(1);
    
    mainFC.evaluate(function(mainObj) {
      if (!mainObj || !mainObj.features || mainObj.features.length === 0) {
        importMessageLabel.setValue('❌ No main feature found for poly_IRWIN = ' + enteredId);
        return;
      }
      
      var mainGeom = ee.Geometry(mainObj.features[0].geometry);
      var mainFCsingle = ee.FeatureCollection([ee.Feature(mainGeom)]);
      addImportedGeometry(mainFCsingle, 'WF Perimeter ' + enteredId);
      // Flag that this geometry is from IRWIN
      isIRWINImport = true;
      
      
      eaFC.evaluate(function(eaObj) {
        if (!eaObj || !eaObj.features || eaObj.features.length === 0) {
          donutGeometry = null;
          donutGeometryLayer = null;
          donutMessageLabel.setValue('⚠️ No EA boundary found for poly_IRWIN = ' + enteredId);
          donutGeomToggle.setValue(false, false);
        } else {
          var eaGeom = ee.Geometry(eaObj.features[0].geometry);
          donutGeometry = ee.FeatureCollection([ee.Feature(eaGeom)]);
          donutGeometryLayer = ui.Map.Layer(
            donutGeometry,
            {color: '#00FF00', fillColor: '00000033'},
            'EA Boundary ' + enteredId
          );
          
          donutGeomToggle.setValue(true, true);
          donutMessageLabel.setValue('✅ EA boundary loaded.');
        }
        
        importMessageLabel.setValue('✅ Main perimeter loaded for poly_IRWIN = ' + enteredId);
      });
    });
  }
});

// Checkbox to toggle imported geometry
var importedGeomToggle = ui.Checkbox({
  label: 'Show imported geometry',
  value: true,
  onChange: function(checked) {
    if (importedGeometryLayer) {
      if (checked) {
        map.layers().add(importedGeometryLayer);
        bringGeometryLayersToFront();
      } else {
        map.layers().remove(importedGeometryLayer);
      }
    }
  }
});

// Checkbox to toggle donut geometry
var donutGeomToggle = ui.Checkbox({
  label: 'Show EA boundary',
  value: false,
  onChange: function(checked) {
    if (donutGeometryLayer) {
      if (checked) {
        map.layers().add(donutGeometryLayer);
        bringGeometryLayersToFront();
      } else {
        map.layers().remove(donutGeometryLayer);
      }
    }
  }
});

// Panel for import UI
var importPanel = ui.Panel({
  widgets: [
    importGeometryLabel,
    ui.Label('By Asset Path'),
    assetPathBox,
    importByAssetButton,
    ui.Label('By poly_IRWIN ID'),
    idBox,
    importByIdButton,
    importMessageLabel,
    importedGeomToggle,
    donutGeomToggle,
    donutMessageLabel // <-- add it here
  ],
  layout: ui.Panel.Layout.Flow('vertical'),
  style: {stretch: 'horizontal'}
});

// A message to wait for image chips to load.
var waitMsgImgPanel = ui.Label({
  value: '⚙️' + ' Processing, please wait.',
  style: {
    stretch: 'horizontal',
    textAlign: 'center',
    backgroundColor: '#d3d3d3'
  }
});

var chartPanel = ui.Panel({style: {height: '25%'}});

// Post-burn Images panel
var postImagesPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    backgroundColor: '#ffffff',
    stretch: 'horizontal',
    padding: '4px',
    margin: '0px 0px 8px 0px',
  }
});

var postHeader = ui.Label('Post-burn Images', {
  fontWeight: 'bold',
  margin: '4px 0px 8px 8px',
  fontSize: '16px'
});

// Scrollable container for image thumbnails
var postImageContainer = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),
  style: {stretch: 'horizontal'}
});

postImagesPanel.add(postHeader);
postImagesPanel.add(postImageContainer);

// Pre-burn Images panel
var preImgPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    backgroundColor: '#ffffff',
    stretch: 'horizontal',
    padding: '4px',
    margin: '0px 0px 8px 0px'
  }
});

var preHeader = ui.Label('Pre-burn Images', {
  fontWeight: 'bold',
  margin: '4px 0px 8px 8px',
  fontSize: '16px'
});

var preImageContainer = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),
  style: {stretch: 'horizontal'}
});

preImgPanel.add(preHeader);
preImgPanel.add(preImageContainer);

// Wrap both panels in a vertical panel
var pre_post_Panels = ui.Panel(
  [postImagesPanel, preImgPanel],
  ui.Panel.Layout.Flow('horizontal')
);

// Map widget.
var map = ui.Map();

// Map/chart panel
var mapChartSplitPanel = ui.Panel(ui.SplitPanel({
  firstPanel: map, //
    secondPanel: chartPanel,
  orientation: 'vertical',
  wipe: false,
}));

// Left panel (map/chart) style
mapChartSplitPanel.style().set({
  width: '75%',
  stretch: 'both'
});

// Right panel (pre/post burn) style
pre_post_Panels.style().set({
  width: '25%',
  stretch: 'both'
});

// Horizontal SplitPanel
var splitPanel = ui.SplitPanel({
  firstPanel: mapChartSplitPanel,
  secondPanel: pre_post_Panels,
  orientation: 'horizontal',
  wipe: false,
  style: {stretch: 'both', padding: '0px', margin: '0px'}
});

// Submit changes button.
var submitButton = ui.Button({
  label: 'Submit changes',
  style: {stretch: 'horizontal', shown: false}
});


var AOI_LAYER = ui.Map.Layer(
  ee.FeatureCollection([]),
  {color: 'FFFFFF',      // White outline
    fillColor: '00000000' // Fully transparent fill
  },
  'AOI Circle'
);
map.layers().add(AOI_LAYER);  // Add it once at startup

// #############################################################################
// ### DEFINE INITIALIZING CONSTANTS ###
// #############################################################################

// Set color of the circle to show on map and images where clicked
var AOI_COLOR = '#ffffff';  //'b300b3';

var COORDS = null;
var CLICKED = false;

// Set region reduction and chart params.
var OPTIONAL_PARAMS = {
  reducer: ee.Reducer.mean(),
  scale: 20,
  crs: 'EPSG:4326',
  chartParams: {
    pointSize: 11,
    legend: {position: 'none'},
    hAxis: {title: 'Date', titleTextStyle: {italic: false, bold: true}},
    vAxis: {
      title: indexSelect.getValue(),
      titleTextStyle: {italic: false, bold: true}
    },
    explorer: {axis: 'horizontal'}
  }
};

var sensorInfo = {
  'Landsat-5/7 SR': {
    id: 'LANDSAT/LT05/C02/T1_L2', 
    scale: 30,
    aoiRadius: 45,
    index: {
      NBR: 'NBR',
      NDVI: 'NDVI',
      Blue: 'blue',
      Green: 'green',
      Red: 'red',
      NIR: 'nir',
      SWIR1: 'swir1',
      SWIR2: 'swir2'
    },
    rgb: {
      'SWIR1/NIR/GREEN': {
        bands: ['swir1', 'nir', 'green'],
        min: [0.01, 0.01 , 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'RED/GREEN/BLUE': {
        bands: ['red', 'green', 'blue'],
        min: [0.01, 0.01, 0.01],
        max: [0.2, 0.2, 0.2],
        gamma: [1, 1, 1]
      },
      'NIR/RED/GREEN': {
        bands: ['nir', 'red', 'green'],
        min: [0.01, 0.01, 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'NIR/SWIR1/RED': {
        bands: ['nir', 'swir1', 'red'],
        min: [0.01, 0.01, 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      }      
    }
  },
  'Landsat-5/7 TOA': {
    id: 'LANDSAT/LT05/C02/T1_TOA',
    scale: 30,
    aoiRadius: 45,
    index: {
      NBR: 'NBR',
      NDVI: 'NDVI',
      Blue: 'blue',
      Green: 'green',
      Red: 'red',
      NIR: 'nir',
      SWIR1: 'swir1',
      SWIR2: 'swir2'
    },
    rgb: {
      'SWIR1/NIR/GREEN': {
        bands: ['swir1', 'nir', 'green'],
        min: [0.01, 0.01 , 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'RED/GREEN/BLUE': {
        bands: ['red', 'green', 'blue'],
        min: [0.01, 0.01, 0.01],
        max: [0.2, 0.2, 0.2],
        gamma: [1, 1, 1]
      },
      'NIR/RED/GREEN': {
        bands: ['nir', 'red', 'green'],
        min: [0.01, 0.01, 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'NIR/SWIR1/RED': {
        bands: ['nir', 'swir1', 'red'],
        min: [0.01, 0.01, 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      }      
    }
  },
  'Landsat-8/9 SR': {
    id: 'LANDSAT/LC08/C02/T1_L2',
    scale: 30,
    aoiRadius: 45,
    index: {
      NBR: 'NBR',
      NDVI: 'NDVI',
      Blue: 'blue',
      Green: 'green',
      Red: 'red',
      NIR: 'nir',
      SWIR1: 'swir1',
      SWIR2: 'swir2'
    },
    rgb: {
      'SWIR1/NIR/GREEN': {
        bands: ['swir1', 'nir', 'green'],
        min: [0.01, 0.01 , 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'RED/GREEN/BLUE': {
        bands: ['red', 'green', 'blue'],
        min: [0.01, 0.01, 0.01],
        max: [0.2, 0.2, 0.2],
        gamma: [1, 1, 1]
      },
      'NIR/RED/GREEN': {
        bands: ['nir', 'red', 'green'],
        min: [0.01, 0.01, 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'NIR/SWIR1/RED': {
        bands: ['nir', 'swir1', 'red'],
        min: [0.01, 0.01, 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      }      
    }
  },
  'Landsat-8/9 TOA': {
    id: 'LANDSAT/LC08/C02/T1_TOA',
    scale: 30,
    aoiRadius: 45,
    index: {
      NBR: 'NBR',
      NDVI: 'NDVI',
      Blue: 'blue',
      Green: 'green',
      Red: 'red',
      NIR: 'nir',
      SWIR1: 'swir1',
      SWIR2: 'swir2'
    },
    rgb: {
      'SWIR1/NIR/GREEN': {
        bands: ['swir1', 'nir', 'green'],
        min: [0.01, 0.01 , 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'RED/GREEN/BLUE': {
        bands: ['red', 'green', 'blue'],
        min: [0.01, 0.01, 0.01],
        max: [0.2, 0.2, 0.2],
        gamma: [1, 1, 1]
      },
      'NIR/RED/GREEN': {
        bands: ['nir', 'red', 'green'],
        min: [0.01, 0.01 , 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      },
      'NIR/SWIR1/RED': {
        bands: ['nir', 'swir1', 'red'],
        min: [0.01, 0.01 , 0.01],
        max: [0.47, 0.47, 0.47],
        gamma: [1, 1, 1]
      }      
    }
  },
  'Sentinel-2 SR': {
    id: 'COPERNICUS/S2_SR_HARMONIZED',
    scale: 20,
    aoiRadius: 30,
    index: {
      NBR: 'NBR',
      NDVI: 'NDVI',
      Blue: 'blue',
      Green: 'green',
      Red: 'red',
      NIR: 'nir',
      SWIR1: 'swir1',
      SWIR2: 'swir2'
    },
    rgb: {
      'SWIR1/NIR/GREEN': {
        bands: ['swir1', 'nir', 'green'],
        min: [0.100, 0.100 , 0.100],
        max: [0.4700, 0.4700, 0.4700],
        gamma: [1.3, 1.3, 1.3]
      },
      'RED/GREEN/BLUE': {
        bands: ['red', 'green', 'blue'],
        min: [0.01, 0.01, 0.01],
        max: [0.2, 0.2, 0.2],
        gamma: [1, 1, 1]
      },
      'NIR/RED/GREEN': {
        bands: ['nir', 'red', 'green'],
        min: [0.100, 0.100 , 0.100],
        max: [0.4700, 0.4700, 0.4700],
        gamma: [1, 1, 1]
      },
      'NIR/SWIR1/RED': {
        bands: ['nir', 'swir1', 'red'],
        min: [0.100, 0.100 , 0.100],
        max: [0.4700, 0.4700, 0.4700],
        gamma: [1, 1, 1]
      }      
    }    
  },
  'Sentinel-2 TOA': {
    id: 'COPERNICUS/S2_HARMONIZED',
    scale: 20,
    aoiRadius: 30,
    index: {
      NBR: 'NBR',
      NDVI: 'NDVI',
      Blue: 'blue',
      Green: 'green',
      Red: 'red',
      NIR: 'nir',
      SWIR1: 'swir1',
      SWIR2: 'swir2'
    },
    rgb: {
      'SWIR1/NIR/GREEN': {
        bands: ['swir1', 'nir', 'green'],
        min: [0.100, 0.100 , 0.100],
        max: [0.4700, 0.4700, 0.4700],
        gamma: [1.3, 1.3, 1.3]
      },
      'RED/GREEN/BLUE': {
        bands: ['red', 'green', 'blue'],
        min: [0.01, 0.01, 0.01],
        max: [0.2, 0.2, 0.2],
        gamma: [1, 1, 1]
      },
      'NIR/RED/GREEN': {
        bands: ['nir', 'red', 'green'],
        min: [0.100, 0.100 , 0.100],
        max: [0.4700, 0.4700, 0.4700],
        gamma: [1, 1, 1]
      },
      'NIR/SWIR1/RED': {
        bands: ['nir', 'swir1', 'red'],
        min: [0.100, 0.100 , 0.100],
        max: [0.4700, 0.4700, 0.4700],
        gamma: [1, 1, 1]
      }      
    }    
  }
};

// #############################################################################
// ### DEFINE FUNCTIONS ###
// #############################################################################

function bringGeometryLayersToFront() {
  var layers = map.layers();
  var geomLayers = [importedGeometryLayer, donutGeometryLayer, AOI_LAYER];

  geomLayers.forEach(function(layer) {
    if (layer && layers.indexOf(layer) >= 0) {
      layers.remove(layer);
      layers.add(layer);
    }
  });
}

function clearPreviousPointsAndScenes() {
  if (!map || !map.layers) return;
  
  var layers = map.layers();
  var prefixes = ['Point:', 'Image:', 'Pre-burn:', 'dNBR:', 'excludedMask:'];
  var toRemove = [];
  
  for (var i = 0; i < layers.length(); i++) {
    var L = layers.get(i);
    var name = L.getName ? L.getName() : '';
    
    if (name && prefixes.some(function(p) { return name.indexOf(p) === 0; })) {
      toRemove.push(L);
    }
  }
  
  toRemove.forEach(function(L) { layers.remove(L); });
}

function removeLayer(layerRef) {
  if (layerRef) {
    map.layers().remove(layerRef);
  }
  return null;
}

function makeDonut(geom, inner, outer) {
  var innerBuffer = geom.buffer(inner);
  var outerBuffer = geom.buffer(outer);
  return outerBuffer.difference(innerBuffer, 1); // geodesic difference
}

function addImportedGeometry(fc, layerName) {
  importedGeometry = fc.geometry();

  // Remove previous layers
  importedGeometryLayer = removeLayer(importedGeometryLayer);
  donutGeometryLayer    = removeLayer(donutGeometryLayer);
  donutGeometry         = null;

  // Reset donut UI
  donutGeomToggle.setValue(false, false);
  donutMessageLabel.setValue('');

  // Add new imported geometry
  var styles = {
    imported: {color: '#FF0000', fillColor: '00000033'},
    donut:    {color: '#00FF00', fillColor: '00000033'}
  };

  importedGeometryLayer = ui.Map.Layer(fc, styles.imported, layerName);

  if (importedGeomToggle.getValue()) {
    map.layers().add(importedGeometryLayer);
    //bringGeometryLayersToFront();
  }

  map.centerObject(fc, 12);

  // Donut logic (only if not IRWIN)
  if (!isIRWINImport) {
    donutGeometry = ee.FeatureCollection([ee.Feature(makeDonut(importedGeometry, 60, 310))]);
    
    if (donutGeomToggle.getValue()) {
      donutGeometryLayer = ui.Map.Layer(donutGeometry, styles.donut, layerName + ' Donut');
      map.layers().add(donutGeometryLayer);
      //bringGeometryLayersToFront();
    }
  }

  // Handle centroid + graphics
  if (importedGeometry) {
    importedGeometry.centroid().coordinates().evaluate(function(coords) {
      COORDS = coords;
      CLICKED = true;
      renderGraphics(COORDS);
    });
  }
}

//#############################################################################
// ### getLibImages Globals ###
//#############################################################################
// Landsat USGS collection
var landsatCollectionVersion = 'C2'; //'C1'

var csPlusQABand = 'cs_cdf'; // cs or cs_cdf
var QA_BAND = 'cloudScorePlus'; // Define CloudScorePlus QA band

// The threshold for masking; values between 0.50 and 0.65 generally work well.
// Higher values will remove thin clouds, haze & cirrus shadows.
var cloudScorePlusThresh = 0.65;

// Define Landsat QA_PIXEL band name for Landsat masking
var qaBandName = 'QA_PIXEL';

// If cloudScoreTDOM is chosen
// cloudScoreThresh: If using the cloudScoreTDOMShift method-Threshold for cloud
// masking (lower number masks more clouds. Between 10 and 30 generally works best)
var cloudScoreThresh = 10;

// Used when applyCloudProbability set to True. This uses the S2 probability band that
// is renamed cloud_probability in getImagesLib
// Use this for S2 masking instead of precomputed stats
var cloudProbThresh = cloudSlider.getValue();

// Percentile of cloud score to pull from time series to represent a minimum for
// the cloud score over time for a given pixel. Reduces commission errors over
// cool bright surfaces. Generally between 5 and 10 works well. 0 generally is a
// bit noisy but may be necessary in persistently cloudy areas
var cloudScorePctl = 5;

// zScoreThresh: Threshold for cloud shadow masking- lower number masks out
// less. Between -0.8 and -1.2 generally works well
var zScoreThresh = -1;

// shadowSumThresh: Sum of IR bands to include as shadows within TDOM and the
// shadow shift method (lower number masks out less)
var shadowSumThresh = 0.35;
var shadowSumBands = ['nir','swir1'];

// contractPixels: The radius of the number of pixels to contract (negative
// buffer) clouds and cloud shadows by. Intended to eliminate smaller cloud
// patches that are likely errors
// (1.5 results in a -1 pixel buffer)(0.5 results in a 0 pixel buffer)
// (1.5 or 2.5 generally is sufficient)
// This is used for CloudScore and FmaskPlus only
var contractPixels = 1.5;

// dilatePixels: The radius of the number of pixels to dilate (buffer) clouds
// and cloud shadows by. Intended to include edges of clouds/cloud shadows
// that are often missed
// (1.5 results in a 1 pixel buffer)(0.5 results in a 0 pixel buffer)
// (2.5 or 3.5 generally is sufficient)
// This is used for CloudScore and FmaskPlus only
var dilatePixels = 3.5;

// Use for Landsat. Do not use for S2 if using applyCloudProbability (cloud masking band included with S2 data)
var performCloudScoreOffset = true;

// Landsat only
var applyFmaskCloudMask = false; 
var applyFmaskCloudShadowMask = false; // unnecessary if running the TDOM
var applyFmaskSnowMask = false;

// Sentinel-2 and Landsat shared flags
var usePreComputedCloudScoreOffset = true; // For S2, this will only be used if CS+ and Cloud Probability are false
var applyTDOM_Landsat = true;
var applyTDOM_S2 = false;
var usePreComputedTDOMStats = true;

// Sentinel-2 only
var applyCloudProbability = false;
var runCloudScorePlus = true;
var applySentinel2SnowMask = true;

// Preloaded globals
var cloudScore = ee.ImageCollection('projects/lcms-tcc-shared/assets/CS-TDOM-Stats/cloudScore').mosaic();
var tdom = ee.ImageCollection('projects/lcms-tcc-shared/assets/CS-TDOM-Stats/TDOM').mosaic().divide(10000);

// Precompute cloudScore+TDOM subsets if needed
if (usePreComputedCloudScoreOffset) {
  var landsat_cloudScore = cloudScore.select('Landsat_CloudScore_p' + cloudScorePctl).rename('cloudScore');
  var s2s_cloudScore = cloudScore.select('Sentinel2_CloudScore_p' + cloudScorePctl).rename('cloudScore');
}

if (usePreComputedTDOMStats){
  var landsat_tdom_mean = tdom.select(shadowSumBands.map(function(band){return 'Landsat_'+band+'_mean'}));
  var landsat_tdom_stdDev = tdom.select(shadowSumBands.map(function(band){return 'Landsat_'+band+'_stdDev'}));
  var s2s_tdom_mean = tdom.select(shadowSumBands.map(function(band){return 'Sentinel2_'+band+'_mean'}));
  var s2s_tdom_stdDev = tdom.select(shadowSumBands.map(function(band){return 'Sentinel2_'+band+'_stdDev'}));
}

// ----------------------------
// getCollectionFromSensorLib
// ----------------------------
function getCollectionFromSensorLib(aoi, startDate, endDate, cloudThresh, sensorObj) {
  var sensor = sensorSelect.getValue(); // "Sentinel-2 SR" or "Landsat-8/9 TOA"
  var toaOrSR = (sensor.indexOf('TOA') > -1) ? 'TOA' : 'SR'; // Extracting TOA or SR
  var startDateEE = ee.Date(startDate);
  var endDateEE = ee.Date(endDate);
  var startJulian = startDateEE.getRelative('day', 'year').add(1);
  var endJulian = endDateEE.getRelative('day', 'year').add(1);

  if (sensor.indexOf('Sentinel-2') > -1) {
    var s2sCol = getImagesLib.getS2({
      studyArea: aoi,
      startDate: startDate,
      endDate: endDate,
      startJulian: startJulian,
      endJulian: endJulian,
      resampleMethod: 'near',
      toaOrSR: toaOrSR,
      convertToDailyMosaics: true,
      addCloudProbability: applyCloudProbability,
      addCloudScorePlus: runCloudScorePlus,
      cloudScorePlusScore: csPlusQABand
    });

    s2sCol = s2sCol.map(function(img) {
      img = getImagesLib.addSensorBand(img, 'sentinel2', toaOrSR);
      return addIndices(img);
    });

    s2sCol = s2sCol.filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', cloudThresh));
    return s2sCol;

  } else { // Landsat branch
    var includeSLCOffL7 = (sensor.indexOf('5/7') > -1);
    var defringeL5 = (sensor.indexOf('5/7') > -1);

    var lsCol = getImagesLib.getLandsat({
      studyArea: aoi,
      startDate: startDate,
      endDate: endDate,
      startJulian: startJulian,
      endJulian: endJulian,
      toaOrSR: toaOrSR,
      includeSLCOffL7: includeSLCOffL7,
      defringeL5: defringeL5,
      addPixelQA: true,
      resampleMethod: 'near',
      landsatCollectionVersion: landsatCollectionVersion
    });

    // Filter by sensor
    if (sensor.indexOf('8/9') > -1) {
      lsCol = lsCol.filter(ee.Filter.inList('SPACECRAFT_ID', ['LANDSAT_8', 'LANDSAT_9']));
    } else if (sensor.indexOf('5/7') > -1) {
      lsCol = lsCol.filter(ee.Filter.inList('SPACECRAFT_ID', ['LANDSAT_5', 'LANDSAT_7']));
    }

    lsCol = lsCol.filter(ee.Filter.lte('CLOUD_COVER', cloudThresh));

    lsCol = lsCol.map(function(img) {
      img = getImagesLib.addSensorBand(img, landsatCollectionVersion + '_landsat', toaOrSR);
      return addIndices(img);
    });

    return lsCol;
  }
}

// ----------------------------
// Mask collection
// ----------------------------
// Dynamic Landsat QA mask function using Fmask flags
// Adding this because getLibImages is only taking 'med_confidence_cloud' as a valid bit.
function FmaskLandsat(img) {
  var qa = img.select(qaBandName);
  
  var mask = ee.Image(1); // start with everything unmasked
  
  // Apply cloud shadow mask if enabled
  if (applyFmaskCloudShadowMask) {
    var cloudShadowBitMask = 1 << 3;
    mask = mask.and(qa.bitwiseAnd(cloudShadowBitMask).eq(0));
  }
  
  // Apply snow mask if enabled
  if (applyFmaskSnowMask) {
    var snowBitMask = 1 << 4;
    mask = mask.and(qa.bitwiseAnd(snowBitMask).eq(0));
  }
  
  // Apply cloud mask if enabled
  if (applyFmaskCloudMask) {
    var cloudBitMask = 1 << 5;
    mask = mask.and(qa.bitwiseAnd(cloudBitMask).eq(0));
  }
  
  return img.updateMask(mask);
}

function maskCollectionWithLib(col, sensorType) {
  var maskedCol = ee.ImageCollection(col);

  // --- Sentinel-2 branch ---
  if (sensorType.indexOf('Sentinel-2') > -1) {

    // Pre-computed cloud scores
    if (usePreComputedCloudScoreOffset && !applyCloudProbability && !runCloudScorePlus) {
      maskedCol = getImagesLib.applyCloudScoreAlgorithm(
        maskedCol,
        getImagesLib.sentinel2CloudScore,
        cloudScoreThresh,
        cloudScorePctl,
        contractPixels,
        dilatePixels,
        performCloudScoreOffset,
        s2s_cloudScore
      );
    }

    // Cloud probability mask
    if (applyCloudProbability) {
      maskedCol = maskedCol.map(function(img) {
        return img.updateMask(img.select('cloud_probability').lte(cloudProbThresh));
      });
    }

    // CloudScore+ mask
    if (runCloudScorePlus) {
      maskedCol = maskedCol.map(function(img) {
        return img.updateMask(img.select(QA_BAND).gte(cloudScorePlusThresh));
      });
    }

    // TDOM shadow mask
    if (applyTDOM_S2) {
      if (usePreComputedTDOMStats) {
        maskedCol = getImagesLib.simpleTDOM2(
          maskedCol, zScoreThresh, shadowSumThresh,
          contractPixels, dilatePixels, shadowSumBands,
          s2s_tdom_mean, s2s_tdom_stdDev
        );
      } else {
        maskedCol = getImagesLib.simpleTDOM2(
          maskedCol, zScoreThresh, shadowSumThresh,
          contractPixels, dilatePixels, shadowSumBands
        );
      }
    }

    // Sentinel-2 snow mask
    if (applySentinel2SnowMask) {
      maskedCol = maskedCol.map(function(img) {
        return getImagesLib.sentinel2SnowMask(img, 3.5);
      });
    }

  } else if (sensorType.indexOf('Landsat') > -1) {
    // --- Landsat branch ---
    if (usePreComputedCloudScoreOffset) {
      print('using preComputed');
      maskedCol = getImagesLib.applyCloudScoreAlgorithm(
        maskedCol,
        getImagesLib.landsatCloudScore,
        cloudScoreThresh,
        cloudScorePctl,
        contractPixels,
        dilatePixels,
        performCloudScoreOffset,
        landsat_cloudScore
      );
    } else {
      print('not doing preComputed');
      maskedCol = getImagesLib.applyCloudScoreAlgorithm(
        maskedCol,
        getImagesLib.landsatCloudScore,
        cloudScoreThresh,
        cloudScorePctl,
        contractPixels,
        dilatePixels,
        performCloudScoreOffset
      );
    }
    
    // if (applyFmaskCloudMask) {
    //   maskedCol = maskedCol.map(function(img) {
    //     return getImagesLib.cFmask(img, 'med_confidence_cloud', qaBandName);
    //   });
    // }

    // Apply dynamic Fmask-based mask
    maskedCol = maskedCol.map(FmaskLandsat);

    // Apply TDOM for Landsat if enabled
    if (applyTDOM_Landsat) {
      if (usePreComputedTDOMStats) {
        maskedCol = getImagesLib.simpleTDOM2({
          collection: maskedCol,
          zScoreThresh: zScoreThresh,
          shadowSumThresh: shadowSumThresh,
          contractPixels: contractPixels,
          dilatePixels: dilatePixels,
          shadowSumBands: shadowSumBands,
          preComputedTDOMIRMean: landsat_tdom_mean,
          preComputedTDOMIRStdDev: landsat_tdom_stdDev
        });
      } else {
        maskedCol = getImagesLib.simpleTDOM2(
          maskedCol, zScoreThresh, shadowSumThresh,
          contractPixels, dilatePixels, shadowSumBands
        );
      }
    }
  }

  // --- ADD BAND SHOWING MASKED PIXELS ---
  maskedCol = maskedCol.map(function(img) {
    // 1 = pixel masked for any reason (cloud, shadow, etc.), 0 = unmasked everywhere
    var combinedMask = img.mask().reduce(ee.Reducer.min()); // 1 = unmasked in all bands
    var excludedMask = combinedMask.not().rename('excludedMask'); // 1 = masked somewhere
    return img.addBands(excludedMask);
  });

  return maskedCol;
}

// ----------------------------
// Find top pre-burn images (with mask geometry)
// ----------------------------
function findTopPreBurnImages(anchorImg, donutGeom, point, callback) {
  //var yearsBack = 3;
  // --- User-controlled search windows ---
var userYearsBack = parseInt(preburnyearwindowInput.getValue(), 10);
var yearsBack = (!isNaN(userYearsBack) && userYearsBack > 0)
  ? userYearsBack
  : 1;   // default fallback

var userDayWindow = parseInt(preburndatewindowInput.getValue(), 10);
var dayWindow = (!isNaN(userDayWindow) && userDayWindow > 0)
  ? userDayWindow
  : 30;  // default fallback

  var user_preburnmaxImages = parseInt(preburnmaxImagesInput.getValue());
  var limitCandidates = (!isNaN(user_preburnmaxImages) && user_preburnmaxImages > 0) ? user_preburnmaxImages : 10;
  var sensor = sensorSelect.getValue();
  var cloudThresh = cloudSlider.getValue();
  var scale = sensorInfo[sensor].scale;

  var geom = donutGeom.geometry();
  var geom_centroid = point;


  // --- NLCD collections ---
  var NLCD_2019_REL = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/NLCD");
  var NLCD_2021_REL = ee.ImageCollection("USGS/NLCD_RELEASES/2021_REL/NLCD");
  var nlcdYears = ee.List([2001, 2004, 2006, 2008, 2011, 2013, 2016, 2019, 2021]);
  var imgYear = ee.Date(anchorImg.get('system:time_start')).get('year');

  var closestNLCDYear = ee.Number(
    nlcdYears.iterate(function(curr, prev) {
      prev = ee.Number(prev);
      curr = ee.Number(curr);
      return ee.Algorithms.If(curr.subtract(imgYear).abs().lt(prev.subtract(imgYear).abs()), curr, prev);
    }, nlcdYears.get(0))
  );

  var nlcdCol = ee.ImageCollection(
    ee.Algorithms.If(closestNLCDYear.eq(2021), NLCD_2021_REL, NLCD_2019_REL)
  );

  var nlcd = nlcdCol.filter(ee.Filter.calendarRange(closestNLCDYear, closestNLCDYear, 'year'))
                    .select('landcover')
                    .first();

  var nlcdMask = nlcd.remap([41,42,43,51,52,90],[1,1,1,1,1,1],0);

  // --- Masked & unmasked post-fire image ---
  var maskedAnchor = maskCollectionWithLib(ee.ImageCollection([anchorImg]), sensor).first();
  var maskedPostNBR = maskedAnchor.select('NBR');
  var unmaskedPostNBR = anchorImg.select('NBR');

  // --- Collect historical candidates ---
  var histCols = [];
  var sceneDate = ee.Date(anchorImg.get('system:time_start'));
  // var startWindow = sceneDate.advance(-45, 'day');
  // var endWindow = sceneDate.advance(45, 'day');
  var startWindow = sceneDate.advance(-dayWindow, 'day');
  var endWindow   = sceneDate.advance(dayWindow, 'day');


  for (var i = 1; i <= yearsBack; i++) {
    var histStart = startWindow.advance(-i, 'year');
    var histEnd = endWindow.advance(-i, 'year');
    var col = getCollectionFromSensorLib(geom_centroid, histStart, histEnd, cloudThresh, sensorInfo[sensor]);
    histCols.push(col);
  }

  // var histColMerged = histCols[0].merge(histCols[1]).merge(histCols[2]).sort('system:time_start');
  
  var histColMerged = histCols.length > 0 ? histCols.reduce(function (acc, col) {
  return acc.merge(col);
  }) : ee.ImageCollection([]).sort('system:time_start');

  print('histColMerged size:', histColMerged.size());
  print('Pre-burn search years:', yearsBack);
  print('Pre-burn ±day window:', dayWindow);


  // --- Limit top 50 least-cloudy images ---
  var cloudProp = (sensor.indexOf('Sentinel-2') >= 0) ? 'CLOUDY_PIXEL_PERCENTAGE' : 'CLOUD_COVER';
  var histColLimited = histColMerged.sort(cloudProp).limit(50);
    
  print('histColLimited size:', histColLimited.size());


  // Mask entire historical collection
  var maskedHistCol = maskCollectionWithLib(histColLimited, sensor);

  // --- Attach masked + unmasked images ---
  var histWithBoth = histColLimited.map(function(img){
    var masked = maskedHistCol.filter(ee.Filter.eq('system:index', img.get('system:index'))).first();
    return img.set('masked', masked, 'unmasked', img);
  });

  // --- Compute dNBR + stats restricted to NLCD classes ---
  var histWithDNBR = histWithBoth.map(function(img) {
    var masked   = ee.Image(img.get('masked'));
    var unmasked = ee.Image(img.get('unmasked'));

    var unmaskedNBR = unmasked.select('NBR');
    var unmasked_dNBR = unmaskedNBR.subtract(unmaskedPostNBR).rename('dNBR');

    var meanUnmasked = unmasked_dNBR.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geom,
      scale: scale,
      bestEffort: true,
      maxPixels: 1e9
    }).get('dNBR');

     var maskedNBR = masked.select('NBR');
     var dnbr_masked = maskedNBR.subtract(maskedPostNBR).rename('dNBR');

    var meanUnmaskedNum = ee.Number(meanUnmasked);
    var dNBR_RANGE = 200;
    var statsMask = dnbr_masked.gte(meanUnmaskedNum.subtract(dNBR_RANGE))
                              .and(dnbr_masked.lte(meanUnmaskedNum.add(dNBR_RANGE)));

    var combinedMask = masked.select('excludedMask').unmask(0)
                            .or(statsMask.not().unmask(0))
                            .or(nlcdMask.not().unmask(0))
                            .rename('excludedMaskVis');

      var stats = dnbr_masked.updateMask(statsMask).updateMask(nlcdMask.selfMask()).reduceRegion({
      reducer: ee.Reducer.mean()
                .combine(ee.Reducer.stdDev(), '', true)
                .combine(ee.Reducer.count(), '', true),
      geometry: geom,
      scale: scale,
      bestEffort: true,
      maxPixels: 1e9
    });
    
    return unmasked.addBands([unmasked_dNBR, combinedMask.rename('excludedMask')])
                  .set({
                    'meanDNBR_refined': stats.get('dNBR_mean'),
                    'stdDNBR_refined': stats.get('dNBR_stdDev'),
                    'countDNBR_refined': stats.get('dNBR_count'),
                    'system:time_start': img.get('system:time_start'),
                    'system:index': img.get('system:index')
                  });
  });

  // --- Filter images based on refined stats ---
 var histWithValidDNBR = histWithDNBR
  .filter(ee.Filter.notNull([
    'meanDNBR_refined',
    'stdDNBR_refined',
    'countDNBR_refined'
  ]))
  .filter(ee.Filter.lte('stdDNBR_refined', 75))
  .filter(ee.Filter.gte('countDNBR_refined', 300))
  .map(function(img) {
    return img.set('absMeanDNBR',
      ee.Number(img.get('meanDNBR_refined')).abs()
    );
  });

  print('histWithValidDNBR size:', histWithValidDNBR.size());

  // Decide sort key from UI
    var sortMap = {
    '|mean| (closest to 0)': 'absMeanDNBR',
    'standard deviation (lowest)': 'stdDNBR_refined'
  };

  var sortProperty = sortMap[SortSelect.getValue()];

  var topHistCol = histWithValidDNBR
  .sort(sortProperty)   
  .limit(limitCandidates);

  preBurnCollection = topHistCol;

  var results = topHistCol.map(function(img) {
    return ee.Feature(null, {
      time:  img.get('system:time_start'),
      id:    img.get('system:index'),
      mean:  img.get('meanDNBR_refined'),
      std:  img.get('stdDNBR_refined'), //NEW BASED ON FEEDBACK
      image: img                    
    });
  });

results.aggregate_array('.all').evaluate(function(list) {

  if (!list || list.length === 0) {
    callback([]);
    return;
  }

  var imagesList = topHistCol.toList(topHistCol.size());

  var combined = list.map(function(f, i) {
    var t = f.properties.time;
    var mean = f.properties.mean;
    var std = f.properties.std;
    var dateStr = (new Date(Number(t))).toISOString().slice(0,10);

    // Grab the ee.Image directly by index
    var imgRef = ee.Image(imagesList.get(i));

    return {
      img: imgRef,
      date: dateStr,
      meanDNBR: mean,
      stdDNBR:std
    };
  });

  callback(combined);
});


}

// Add NBR and NDVI band .
function addIndices(img) {
  var nbr = img.normalizedDifference(['nir', 'swir2'])
               .multiply(1000)               
               .round()                     
               .int16()                      
               .rename('NBR');

  var ndvi = img.normalizedDifference(['nir', 'red'])
                .multiply(1000)
                .round()
                .int16()
                .rename('NDVI');

  return img.addBands([nbr, ndvi]);
}

//Add date property.
  function addDate(img) {
    var date = img.date().format('YYYY-MM-dd');
    return img.set('date', date);
  }

// Clears image cards from the image card panel. 
 function clearImgs() {
  postImageContainer.clear();
  preImageContainer.clear();

  dnbrLayers = [];  // reset dNBR layers

  // Remove all preburn mask layers
  preburnMaskLayers.forEach(function(l) {
    map.layers().remove(l);
  });
  preburnMaskLayers = [];
}

//Displays image cards to the card panel.
function displayBrowseImg(col, aoiBox, aoiCircle, point) {
  clearImgs();
  waitMsgImgPanel.style().set('shown', true);
  postImageContainer.add(waitMsgImgPanel);

  var visParams = sensorInfo[sensorSelect.getValue()]['rgb'][rgbSelect.getValue()];

  if (!(col instanceof ee.ImageCollection)) {
    col = ee.ImageCollection([col]);
  }

  var sortedCol = col.sort('system:time_start');

  sortedCol.aggregate_array('date').evaluate(function(datesList) {
    waitMsgImgPanel.style().set('shown', false);

    if (!datesList || datesList.length === 0) {
      postImageContainer.add(ui.Label('⚠️ No scenes found.'));
      return;
    }

    datesList.sort();

    datesList.forEach(function(date) {
      var img = sortedCol.filter(ee.Filter.eq('date', date)).first();

      var aoiImg = ee.Image().byte()
        .paint(ee.FeatureCollection([ee.Feature(aoiCircle)]), 1, 2)
        .visualize({palette: AOI_COLOR});

      var thumbnail = ui.Thumbnail({
        image: img.visualize(visParams).blend(aoiImg),
        params: {region: aoiBox, dimensions: '200', crs: 'EPSG:3857', format: 'PNG'},
        style: {margin: '4px'}
      });

      // Post-burn visible checkbox
      var visChk = ui.Checkbox({
        label: 'Visible',
        value: false,
        onChange: function(checked) {
          var layers = map.layers();
          if (checked) {
            map.addLayer(img.visualize(visParams), {}, 'Image: ' + date);
          } else {
            for (var i = layers.length() - 1; i >= 0; i--) {
              var layer = layers.get(i);
              if (layer.getName && layer.getName() === 'Image: ' + date) {
                layers.remove(layer);
              }
            }
          }
          bringGeometryLayersToFront();
        }
      });

      // Preburn candidates checkbox
      var preburnChk = ui.Checkbox({
        label: 'Find Pre-burn Image Pairs',
        value: false,
        onChange: function(checked) {
          var layers = map.layers();
          var toRemove = [];
          for (var i = 0; i < layers.length(); i++) {
            var L = layers.get(i);
            var name = L.getName ? L.getName() : '';
            if (name && (name.indexOf('Pre-burn:') === 0 || name.indexOf('dNBR:') === 0 || name.indexOf('excludedMask:') === 0)) {
              toRemove.push(L);
            }
          }
          toRemove.forEach(function(L) { layers.remove(L); });
          dnbrLayers = [];

          preImageContainer.clear();
          if (!checked) return;

          if (!donutGeometry) {
            console.log('Please create the EA boundary first.');
            preburnChk.setValue(false, false);
            return;
          }

          preImageContainer.add(ui.Label('Calculating...', {margin: '4px'}));

          findTopPreBurnImages(img, donutGeometry, point, function(results) {
            preImageContainer.clear();

            if (!results || results.length === 0) {
              preImageContainer.add(ui.Label('No matching historical scenes found.'));
              return;
            }

            results.forEach(function(obj) {
              var histImg = obj.img;
              var histDate = obj.date;
              var meanDNBR = obj.meanDNBR;
              var stdDNBR = obj.stdDNBR;


              var aoiOverlay = ee.Image().byte()
                .paint(AOI_LAYER.getEeObject(), 1, 2)
                .visualize({palette: AOI_COLOR});

              var thumb = ui.Thumbnail({
                image: histImg.visualize(visParams).blend(aoiOverlay),
                params: {region: aoiBox, dimensions: '200', crs: 'EPSG:3857', format: 'PNG'},
                style: {margin: '4px'}
              });

              var preRow = ui.Panel({
                layout: ui.Panel.Layout.flow('vertical'),
                style: {margin: '6px 0'}
              });
              var meanDNBR4 = (meanDNBR).toFixed(4);
              var stdDNBR4 = (stdDNBR).toFixed(4);

              var dateLabel = ui.Label('Date: ' + histDate, {
                fontWeight: 'bold',
                margin: '0px 0px 4px 0px',
                fontSize: '12px'
              });
              var statsLabel = ui.Label('mean dNBR: ' + meanDNBR4 + ' | std dNBR:'+ stdDNBR4, {
                fontWeight: 'bold',
                margin: '0px 0px 4px 0px',
                fontSize: '12px'
              });

              // Preburn visible checkbox
              var preVisChk = ui.Checkbox({
                label: 'Visible',
                value: false,
                onChange: function(checked) {
                  var layers = map.layers();
                  if (checked) {
                    map.addLayer(histImg.visualize(visParams), {}, 'Pre-burn: ' + histDate);
                  } else {
                    for (var i = layers.length() - 1; i >= 0; i--) {
                      var layer = layers.get(i);
                      if (layer.getName && layer.getName() === 'Pre-burn: ' + histDate) {
                        layers.remove(layer);
                      }
                    }
                  }
                  bringGeometryLayersToFront();
                }
              });

              // Slider placeholder
              var dnbrSliderPanel = ui.Panel();

              // dNBR toggle
              var dnbrChk = ui.Checkbox({
                label: 'Show dNBR',
                value: false,
                onChange: function(checked) {
                  var layers = map.layers();
                  for (var i = layers.length() - 1; i >= 0; i--) {
                    var layer = layers.get(i);
                    if (layer.getName && layer.getName() === 'dNBR: ' + histDate) {
                      layers.remove(layer);
                      dnbrLayers = dnbrLayers.filter(function(l) {
                        return l.getName() !== 'dNBR: ' + histDate;
                      });
                    }
                  }
                  dnbrSliderPanel.clear();

                  if (checked) {
                    var dnbrVis = {min: -1000, max: 1000};
                    var layer = ui.Map.Layer(histImg.select('dNBR'), dnbrVis, 'dNBR: ' + histDate);
                    layer.setOpacity(1);
                    map.layers().add(layer);
                    dnbrLayers.push(layer);

                    var sliderLabel = ui.Label('dNBR Opacity: 100%');
                    var slider = ui.Slider({
                      min: 0,
                      max: 1,
                      value: 1,
                      step: 0.01,
                      style: {stretch: 'horizontal'},
                      onChange: function(value) {
                        layer.setOpacity(value);
                        sliderLabel.setValue('dNBR Opacity: ' + Math.round(value * 100) + '%');
                      }
                    });
                    dnbrSliderPanel.add(ui.Panel([sliderLabel, slider]));
                  }
                  bringGeometryLayersToFront();

                }
              });

              var maskSliderPanel = ui.Panel(); // placeholder for slider
              var maskGeomChk = ui.Checkbox({
                label: 'Show Masked Areas',
                value: false,
                onChange: function(checked) {
                  var layers = map.layers();
              
                  // Remove existing mask layers
                  for (var i = layers.length() - 1; i >= 0; i--) {
                    var layer = layers.get(i);
                    if (layer.getName && layer.getName() === 'excludedMask: ' + histDate) {
                      layers.remove(layer);
                      dnbrLayers = dnbrLayers.filter(function(l) {
                        return l.getName() !== 'excludedMask: ' + histDate;
                      });
                    }
                  }
              
                  maskSliderPanel.clear();
              
                  if (checked) {
                    var bufferedGeom = importedGeometry.buffer(310);
                    var maskedPixels = histImg.select('excludedMask').selfMask().clip(bufferedGeom);
              
                    var maskLayer = ui.Map.Layer(
                      maskedPixels,
                      {palette: ['800080']}, // purple
                      'excludedMask: ' + histDate,
                      true,
                      0.5
                    );
              
                    map.layers().add(maskLayer);
                    preburnMaskLayers.push(maskLayer);
              
                    // Slider for opacity
                    var sliderLabel = ui.Label('Mask Opacity: 50%');
                    var slider = ui.Slider({
                      min: 0,
                      max: 1,
                      value: 0.5,
                      step: 0.01,
                      style: {stretch: 'horizontal'},
                      onChange: function(value) {
                        maskLayer.setOpacity(value);
                        sliderLabel.setValue('Mask Opacity: ' + Math.round(value * 100) + '%');
                      }
                    });
                    maskSliderPanel.add(ui.Panel([sliderLabel, slider]));
                  }
                }
              });
              
              // Assemble row in correct order
              preRow.add(dateLabel);
              preRow.add(statsLabel);
              preRow.add(thumb);
              preRow.add(preVisChk);
              preRow.add(dnbrChk);
              //preRow.add(ui.Label('Mean dNBR: ' + ((typeof meanDNBR === 'number' && !isNaN(meanDNBR)) ? meanDNBR.toFixed(4) : 'N/A')));
              preRow.add(dnbrSliderPanel);
              preRow.add(maskGeomChk);
              preRow.add(maskSliderPanel); 
              preImageContainer.add(preRow);
            });
          });
        }
      });

      var dateLabel = ui.Label('Date: ' + date, {
        fontWeight: 'bold',
        margin: '0px 0px 4px 0px',
        fontSize: '12px'
      });

      var row = ui.Panel([dateLabel, thumbnail, visChk, preburnChk], ui.Panel.Layout.flow('vertical'));
      postImageContainer.add(row);
    });
  });
}

//Generates chart and adds image cards to the image panel.
function renderGraphics(coords) {
  var sensor = sensorSelect.getValue();

  // Remove old image layers and dNBR layers
  clearPreviousPointsAndScenes();

  // Point and AOI
  var point = ee.Geometry.Point(coords);
  var aoiCircle = point.buffer(sensorInfo[sensor]['aoiRadius']);
  var aoiBox = point.buffer(regionWidthSlider.getValue() * 1000 / 2);

  // Update AOI_LAYER geometry (persistent, always on top)
  AOI_LAYER.setEeObject(ee.FeatureCollection([ee.Feature(aoiCircle)]));

  // Build image collection using new library function
  var cloudThresh = cloudSlider.getValue();
  var datasetObj = sensorInfo[sensor];
  var startDate = ee.Date(startDayBox.getValue());
  var endDate   = ee.Date(endDayBox.getValue());


  var col = getCollectionFromSensorLib(point, startDate, endDate, cloudThresh, datasetObj);
  col = ee.ImageCollection(col.distinct('system:time_start')).sort('system:time_start');
  col = col.map(function(img) {
  var dateStr = ee.Date(img.get('system:time_start')).format('YYYY-MM-dd');
  return img.set('date', dateStr);
  });
  //Gets the sensor and if a post burn image limit is given, it sorts based on cloud probability and takes the top n images
  var cloudProp;
  if (sensor.indexOf('Sentinel-2') > -1) {
  cloudProp = 'CLOUDY_PIXEL_PERCENTAGE';
} else if (sensor.indexOf('Landsat') > -1) {
  cloudProp = 'CLOUD_COVER';
} else {
  cloudProp = 'CLOUDY_PIXEL_PERCENTAGE';
}

  var maxImages = parseInt(postburnmaxImagesInput.getValue());
  if (!isNaN(maxImages) && maxImages > 0) {
    col = col.sort(cloudProp).limit(maxImages);
  }
  // Sort by time for consistent display
  col = col.sort('system:time_start');

  // Display image thumbnails
  displayBrowseImg(col, aoiBox, aoiCircle, point);

  // Update chart
  OPTIONAL_PARAMS.chartParams.vAxis.title = indexSelect.getValue();
  OPTIONAL_PARAMS.scale = sensorInfo[sensor]['scale'];
  rgbTs.rgbTimeSeriesChart(
    col,
    aoiCircle,
    sensorInfo[sensor].index[indexSelect.getValue()],
    sensorInfo[sensor]['rgb'][rgbSelect.getValue()],
    chartPanel,
    OPTIONAL_PARAMS
  );

}

//Handles map clicks.
function handleMapClick(coords) {
    CLICKED = true;
    COORDS = [coords.lon, coords.lat];
    ui.url.set('run', 'true');
    ui.url.set('lon', COORDS[0]);
    ui.url.set('lat', COORDS[1]);
    renderGraphics(COORDS);
  }

// Handles submit button click.
  function handleSubmitClick() {
    renderGraphics(COORDS);
    submitButton.style().set('shown', false);
  }

// Sets URL params.
  function setParams() {
    ui.url.set('sensor', sensorSelect.getValue());
    ui.url.set('index', indexSelect.getValue());
    ui.url.set('rgb', rgbSelect.getValue());
    ui.url.set('from', startDayBox.getValue());
    ui.url.set('to', endDayBox.getValue());
    ui.url.set('cloud', cloudSlider.getValue());
    ui.url.set('chipwidth', regionWidthSlider.getValue());
    
  }   

// Show/hide the submit button.
  function showSubmitButton() {
    if(CLICKED) {
      submitButton.style().set('shown', true);
    }
  }

// Handles options changes.
  function optionChange() {
    showSubmitButton();
    setParams();
  }

// Show/hide the control panel.
  var controlShow = false;
function controlButtonHandler() {
  if(controlShow) {
    controlShow = false;
    controlElements.style().set('shown', false);
    controlButton.setLabel('Options ❯');
  } else {
    controlShow = true;
    controlElements.style().set('shown', true);
    controlButton.setLabel('Options ❮');
  }
  
  if(infoShow | controlShow) {
    controlPanel.style().set('width', CONTROL_PANEL_WIDTH);
  } else {
    controlPanel.style().set('width', CONTROL_PANEL_WIDTH_HIDE);
  }
}

//Show/hide the control panel.
var infoShow = false;
function infoButtonHandler() {
  if(infoShow) {
    infoShow = false;
    infoElements.style().set('shown', false);
    infoButton.setLabel('About ❯');
  } else {
    infoShow = true;
    infoElements.style().set('shown', true);
    infoButton.setLabel('About ❮');
  }
  
  if(infoShow | controlShow) {
    controlPanel.style().set('width', CONTROL_PANEL_WIDTH);
  } else {
    controlPanel.style().set('width', CONTROL_PANEL_WIDTH_HIDE);
  }
}

// #############################################################################
// ### SETUP UI ELEMENTS ###
// #############################################################################

infoElements.add(infoLabel);
infoElements.add(aboutLabel);
infoElements.add(EO_appCodeLink);

controlElements.add(optionsLabel);
controlElements.add(sensorPanel);
controlElements.add(indexPanel);
controlElements.add(rgbPanel);
controlElements.add(datePanel);
controlElements.add(cloudPanel);
controlElements.add(regionWidthPanel);

controlElements.add(ImageoptionsLabel);

controlElements.add(postburnlimitPanel);

controlElements.add(preburnsearchwindowPanel);

controlElements.add(preburnlimitPanel);
controlElements.add(SortPanel);


importPanel.style().set('margin', '16px 8px 8px 8px');  
controlElements.add(importPanel);
controlElements.add(submitButton);

controlPanel.add(instr);
controlPanel.add(buttonPanel);
controlPanel.add(infoElements);
controlPanel.add(controlElements);

map.add(controlPanel);

infoButton.onClick(infoButtonHandler);
controlButton.onClick(controlButtonHandler);
sensorSelect.onChange(optionChange);
rgbSelect.onChange(optionChange);
indexSelect.onChange(optionChange);
startDayBox.onChange(optionChange);
endDayBox.onChange(optionChange);
cloudSlider.onChange(optionChange);
regionWidthSlider.onChange(optionChange);
postburnmaxImagesInput.onChange(optionChange);
preburnmaxImagesInput.onChange(optionChange);

submitButton.onClick(handleSubmitClick);
map.onClick(handleMapClick);

map.style().set('cursor', 'crosshair');
map.setOptions('SATELLITE');
map.setControlVisibility(
  {layerList: false, fullscreenControl: false, zoomControl: false});

ui.root.clear();
ui.root.add(splitPanel);





