//Imports: your river shapefile, S2 image collection, csPlus (Google cloud score plus)
//Add training points

//Parameters
{
  var bands = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12'];
  var viz = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3};  
  var QA_BAND = 'cs_cdf';
  var CLEAR_THRESHOLD = 0.65;
  // var predictorBands = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12','NDVI',
  // 'NDWI', 'BCI', 'NDBI', 'HAND', 'SNDVI', 'homogeneity', 'entropy', 'SAVI',
  // 'NDTI', 'correlation', 'variance', 'asm'
  // ];
  var predictorBands = ['B12', 'SAVI', 'NDTI', 'B2', 'B8', 'B3', 'NDVI', 'B11', 'B4', 'NDWI'];
  var landcoverPalette6 = [ "ffc800", //freshalluv(1)
  '#371D10', //sandmining (2) 
  '576d80', //wetsand (3)
  "ff4d00", //fallow (4)
  "99ca3c", //vegsand (5)
  "c4c4c4", //bedrock (6) 
  ]; 
  
  var landcoverPalette4 = [ "ffc800", //freshalluv(1)
  '#371D10', //sandmining (2) 
  '576d80', //wetsand (3)
  "c4c4c4", //bedrock (6) 
  ]; 
  
  var sandViz = {min: 1, max: 4, palette: landcoverPalette4}
  var hand = ee.ImageCollection("users/gena/global-hand/hand-100")
            .mosaic()
            .rename('HAND')
            .clip(river);
  
  var ndtiVis = {
  min: -0.1, 
  max: 0.2,
  palette: ['8B4513', 'CD853F', 'F4A460', 'FFF8DC', '9ACD32', '228B22']
};

}
 
//Function to fetch images
function S2_Collection(year, month, applySandMask){
  month = ee.Number(month);                 

  var start = ee.Date.fromYMD(year, month, 1);
  var end   = start.advance(1, 'month');    

  var raw = S2.filterBounds(river)
              .filterDate(start, end)
              .linkCollection(csPlus, [QA_BAND])
              .map(function(img) {
              return img.updateMask(img.select(QA_BAND).gte(CLEAR_THRESHOLD));
              })
              .select(bands)
              .median()
              .clip(river);

  var col = raw.divide(10000);

  var ndvi  = col.normalizedDifference(['B8',  'B4']).rename('NDVI');
  var sndvi  = col.normalizedDifference(['B11',  'B4']).rename('SNDVI');
  var ndwi  = col.normalizedDifference(['B3',  'B8']).rename('NDWI');
  var ndbi  = col.normalizedDifference(['B11', 'B8']).rename('NDBI');
  var ndti = col.normalizedDifference(['B11', 'B12']).rename('NDTI')
  // var ndmi = col.normalizedDifference(['B8', 'B11']).rename('NDMI');
  var mndwi = col.normalizedDifference(['B3',  'B12']).rename('MNDWI');
  var bci = col.expression(
    '((swir + red) - (nir + blue))/ ((swir + red) + (nir + blue))',{
      swir: col.select('B11'),
      red: col.select('B4'),
      nir: col.select('B8'),
      blue: col.select('B2')
    }).rename('BCI');
  var gray = col.select('B8')
              .multiply(10000)
              .divide(500)
              .toInt32();
  var glcm = gray.glcmTexture({size: 3});
  var homogeneity = glcm.select('B8_idm').rename('homogeneity');
  var entropy = glcm.select('B8_ent').rename('entropy');
  var savi = col.expression(
    '((NIR - Red) / (NIR + Red + 0.5)) * 1.5', {
      'NIR': col.select('B8'),
      'Red': col.select('B4')
    }).rename('SAVI');
  var contrast    = glcm.select('B8_contrast').rename('contrast');
  var dissimilarity = glcm.select('B8_diss').rename('dissimilarity');
  var correlation = glcm.select('B8_corr').rename('correlation');
  var variance    = glcm.select('B8_var').rename('variance');
  var asm         = glcm.select('B8_asm').rename('asm');  

  var image =  col
      .addBands([ndvi, ndwi, bci, mndwi, ndbi, hand, sndvi, homogeneity, entropy, savi, ndti,
      contrast, dissimilarity, correlation, variance, asm])
      // .addBands([ndvi, ndwi, savi, ndti])
    // .addBands([ndvi, ndbi, mndwi, ndsi, bci, ndmi, ndwi, sndvi,
    //           entropy, homogeneity, contrast, dissimilarity,
    //           correlation, variance, asm, hand])
      
    .set({
      'year':  year,
      'month': month,
      'start': start.format('YYYY-MM-dd'),
      'end':   end.format('YYYY-MM-dd')
    });
    
  var sandMask = image.select('NDWI').lt(-0.09)
                .and(image.select('NDVI').lt(0.24843));
  
  return ee.Image(
    ee.Algorithms.If(
      applySandMask,
      image.updateMask(sandMask),
      image)
      );
}

// Acquiring images
{ var Jan21 = S2_Collection(2021, 1, true);
  var Feb21 = S2_Collection(2021, 2, true);
  var Mar21 = S2_Collection(2021, 3, true);
  var Apr21 = S2_Collection(2021, 4, true);
  var May21 = S2_Collection(2021, 5, true);
  var Jun21 = S2_Collection(2021, 6, true);
  var cJun21 = S2_Collection(2021, 6, false);
  
  var Jan22 = S2_Collection(2022, 1, true);
  var Feb22 = S2_Collection(2022, 2, true);
  var Mar22 = S2_Collection(2022, 3, false);
  var Apr22 = S2_Collection(2022, 4, true);
  var May22 = S2_Collection(2022, 5, true);
  var Jun22 = S2_Collection(2022, 6, true);
  
  var Jan23 = S2_Collection(2023, 1, true)
  var Feb23 = S2_Collection(2023, 2, true);
  var Mar23 = S2_Collection(2023, 3, true);
  var Apr23 = S2_Collection(2023, 4, true);
  var May23 = S2_Collection(2023, 5, true);
  var Jun23 = S2_Collection(2023, 6, true);
  
  var Jan24 = S2_Collection(2024, 1, true); //This one has very little coverage.
  var Feb24 = S2_Collection(2024, 2, true);
  var Mar24 = S2_Collection(2024, 3, true);
  var Apr24 = S2_Collection(2024, 4, true);
  var May24 = S2_Collection(2024, 5, true);
  var Jun24 = S2_Collection(2024, 6, true);
  
  var Jan25 = S2_Collection(2025, 1, true);
  var Feb25 = S2_Collection(2025, 2, true);
  var Mar25 = S2_Collection(2025, 3, true);
  var Apr25 = S2_Collection(2025, 4, true);
  var May25 = S2_Collection(2025, 5, true);
  var Jun25 = S2_Collection(2025, 6, true);

  var Jan26 = S2_Collection(2026, 1, true);
  var Feb26 = S2_Collection(2026, 2, true);
  var Mar26 = S2_Collection(2026, 3, true);
  var Apr26 = S2_Collection(2026, 4, true);
  var May26 = S2_Collection(2026, 5, true);
  var Jun26 = S2_Collection(2026, 6, true);
  var Jul26 = S2_Collection(2026, 7, true); }

//Add map layers
{
  // Map.addLayer(Jan21, viz, "Jan 2021")
  // Map.addLayer(Feb21, viz, "Feb 2021");
  // Map.addLayer(Mar21, viz, "March 2021");
  // Map.addLayer(Apr21, viz, "April 2021");
  // Map.addLayer(May21, viz, "May 2021");
  // Map.addLayer(Jun21, viz, "June 2021");
  // Map.addLayer(cJun21, viz, "June 2021");
  
  // Map.addLayer(Jan22, viz, "Jan 2022")
  // Map.addLayer(Feb22, viz, "Feb 2022");
  //Map.addLayer(Mar22, viz, "March 2022");
  // Map.addLayer(Apr22, viz, "April 2022");
  // Map.addLayer(May22, viz, "May 2022");
  // Map.addLayer(Jun22, viz, "June 2022");
  
  // Map.addLayer(Jan23, viz, "Jan 2023");
  // Map.addLayer(Feb23, viz, "Feb 2023");
  // Map.addLayer(Mar23, viz, "March 2023");
  // Map.addLayer(Apr23, viz, "April 2023");
  // Map.addLayer(May23, viz, "May 2023");
  // Map.addLayer(Jun23, viz, "June 2023");
  
  // Map.addLayer(Jan24, viz, "Jan 2024")
  // Map.addLayer(Feb24, viz, "Feb 2024");
  // Map.addLayer(Mar24, viz, "March 2024");
  // Map.addLayer(Apr24, viz, "April 2024");
  // Map.addLayer(May24, viz, "May 2024");
  // Map.addLayer(Jun24, viz, "June 2024");
  
  // Map.addLayer(Jan25, viz, "Jan 2025")
  // Map.addLayer(Feb25, viz, "Feb 2025");
  // Map.addLayer(Mar25, viz, "March 2025");
  // Map.addLayer(Apr25, viz, "April 2025");
  // Map.addLayer(May25, viz, "May 2025");
  // Map.addLayer(Jun25, viz, "June 2025");

  
  // Map.addLayer(Jan26, viz, "Jan 2026")
  // Map.addLayer(Feb26, viz, "Feb 2026");
  // Map.addLayer(Mar26, viz, "March 2026");
  // Map.addLayer(Apr26, viz, "April 2026");
  // Map.addLayer(May26, viz, "May 2026");
  // Map.addLayer(Jun26, viz, "June 2026");
}

//Classification and training
//Function to label the samples

function labelSamples(fc, classId, className, year, month, confidence, sampleType, notes) {
  return fc.map(function(f) {
    return f.set({
      'class_id': classId,
      'class_name': className,
      'year': year,
      'month': month,
      'confidence': confidence,
      'sample_type': sampleType,
      'notes': notes
    });
  });
}

//Function to extract training samples
function extractTrainingPixels(image, sampleFc) {
  return image
    .select(predictorBands)
    .sampleRegions({
      collection: sampleFc,
      properties: [
        'class_id',
        'class_name',
        'year',
        'month',
        'confidence',
        'sample_type',
        'notes'
      ],
      scale: 10,
      geometries: true,
      tileScale: 4
    });
}

//Taking one image at a time and add training points
{
// Map.addLayer(
// Jun21,
//   {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3},
//   'Jun21 RGB Sand Mask'
// );

// Map.addLayer(
// Jun21,
//   {bands: ['B12', 'B11', 'B4'], min: 0, max: 0.4},
//   'Jun21 SWIR Sand Mask'
// );

// Map.addLayer(
// Jun21,
//   {bands: ['B8', 'B4', 'B3'], min: 0, max: 0.4},
//   'Jun21 NIR Sand Mask'
// );
}
//Labelling samples using function

//Take training samples for multiple months, years, seasons
//Label according to your classes

//May22
{ var c1_may22 = labelSamples(c1_2022_05, 1, 'fresh sand', 2022, 5, 3, 'training', 'single pixel samples');
  var c2_may22 = labelSamples(c2_2022_05, 2, 'sand mine', 2022, 5, 2, 'training', 'single pixel samples');
  var c3_may22 = labelSamples(c3_2022_05, 3, 'wet sand', 2022, 5, 2, 'training', 'single pixel samples');
  var c4_may22 = labelSamples(c4_2022_05, 4, 'fallow', 2022, 5, 2, 'training', 'single pixel samples');
  var c5_may22 = labelSamples(c5_2022_05, 5, 'veg sand', 2022, 5, 3, 'training', 'single pixel samples');
  var c6_may22 = labelSamples(c6_2022_05, 6, 'bedrock', 2022, 5, 3, 'training', 'single pixel samples');

  var samples_may22 = c1_may22
    .merge(c2_may22)
    .merge(c3_may22)
    // .merge(c4_may22)
    // .merge(c5_may22)
    .merge(c6_may22);

  var training_may22 = extractTrainingPixels(May22, samples_may22);

  //print('Training pixels May 2022', training_may22);
}

//Jan22
{
  var c1_jan22 = labelSamples(c1_2022_01, 1, 'fresh sand', 2022, 1, 3, 'training', 'single pixel sample');
  var c2_jan22 = labelSamples(c2_2022_01, 2, 'sand mine', 2022, 1, 2, 'training', 'single pixel sample');
  var c3_jan22 = labelSamples(c3_2022_01, 3, 'wet sand', 2022, 1, 3, 'training', 'single pixel sample');
  var c4_jan22 = labelSamples(c4_2022_01, 4, 'fallow', 2022, 1, 3, 'training', 'single pixel sample');
  var c5_jan22 = labelSamples(c5_2022_01, 5, 'veg sand', 2022, 1, 3, 'training', 'single pixel sample');
  var c6_jan22 = labelSamples(c6_2022_01, 6, 'bedrock', 2022, 1, 3, 'training', 'single pixel sample');
  
  var samples_jan22 = c1_jan22
    .merge(c2_jan22)
    .merge(c3_jan22)
    //.merge(c4_jan22)
    // .merge(c5_jan22)
    .merge(c6_jan22);
    
  var training_jan22 = extractTrainingPixels(Jan22, samples_jan22);
  
  //print('Training pixels Jan 2022', training_jan22);
}

//Mar22
{
  var c1_mar22 = labelSamples(c1_2022_03, 1, 'fresh sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c2_mar22 = labelSamples(c2_2022_03, 2, 'sand mine', 2022, 3, 3, 'training', 'single pixel sample');
  var c3_mar22 = labelSamples(c3_2022_03, 3, 'wet sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c4_mar22 = labelSamples(c4_2022_03, 4, 'fallow', 2022, 3, 3, 'training', 'single pixel sample');
  var c5_mar22 = labelSamples(c5_2022_03, 5, 'veg sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c6_mar22 = labelSamples(c6_2022_03, 6, 'bedrock', 2022, 3, 3, 'training', 'single pixel sample');
  
  var samples_mar22 = c1_mar22
    .merge(c2_mar22)
    .merge(c3_mar22)
    // .merge(c4_mar22)
    // .merge(c5_mar22)
    .merge(c6_mar22);

  var training_mar22 = extractTrainingPixels(Mar22, samples_mar22);

  //print('Training pixels Mar 2022', training_mar22);
}

//Apr25
{
  var c1_apr25 = labelSamples(c1_2025_04, 1, 'fresh sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c2_apr25 = labelSamples(c2_2025_04, 2, 'sand mine', 2022, 3, 3, 'training', 'single pixel sample');
  var c3_apr25 = labelSamples(c3_2025_04, 3, 'wet sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c4_apr25 = labelSamples(c4_2025_04, 4, 'fallow', 2022, 3, 3, 'training', 'single pixel sample');
  var c5_apr25 = labelSamples(c5_2025_04, 5, 'veg sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c6_apr25 = labelSamples(c6_2025_04, 6, 'bedrock', 2022, 3, 3, 'training', 'single pixel sample');
  
  var samples_apr25 = c1_apr25
    .merge(c2_apr25)
    .merge(c3_apr25)
    //.merge(c4_apr25)
    // .merge(c5_apr25)
    .merge(c6_apr25);

  var training_apr25 = extractTrainingPixels(Apr25, samples_apr25);

  //print('Training pixels Apr 2025', training_apr25);
}

//Jun25
{
  var c1_jun25 = labelSamples(c1_2025_06, 1, 'fresh sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c2_jun25 = labelSamples(c2_2025_06, 2, 'sand mine', 2022, 3, 3, 'training', 'single pixel sample');
  var c3_jun25 = labelSamples(c3_2025_06, 3, 'wet sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c4_jun25 = labelSamples(c4_2025_06, 4, 'fallow', 2022, 3, 3, 'training', 'single pixel sample');
  var c5_jun25 = labelSamples(c5_2025_06, 5, 'veg sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c6_jun25 = labelSamples(c6_2025_06, 6, 'bedrock', 2022, 3, 3, 'training', 'single pixel sample');
  
  var samples_jun25 = c1_jun25
    .merge(c2_jun25)
    .merge(c3_jun25)
    // .merge(c4_jun25)
    // .merge(c5_jun25)
    .merge(c6_jun25);

  var training_jun25 = extractTrainingPixels(Jun25, samples_jun25);

  //print('Training pixels Jun 2025', training_jun25);
}

//Feb25
{ var c1_feb25 = labelSamples(c1_2025_02, 1, 'fresh sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c2_feb25 = labelSamples(c2_2025_02, 2, 'sand mine', 2022, 3, 3, 'training', 'single pixel sample');
  var c3_feb25 = labelSamples(c3_2025_02, 3, 'wet sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c4_feb25 = labelSamples(c4_2025_02, 4, 'fallow', 2022, 3, 3, 'training', 'single pixel sample');
  var c5_feb25 = labelSamples(c5_2025_02, 5, 'veg sand', 2022, 3, 3, 'training', 'single pixel sample');
  var c6_feb25 = labelSamples(c6_2025_02, 6, 'bedrock', 2022, 3, 3, 'training', 'single pixel sample');
  
  var samples_feb25 = c1_feb25
    .merge(c2_feb25)
    .merge(c3_feb25)
    // .merge(c4_feb25)
    // .merge(c5_feb25)
    .merge(c6_feb25);

  var training_feb25 = extractTrainingPixels(Feb25, samples_feb25);

  //print('Training pixels Feb 2025', training_feb25);
  
}

//May26
{ var c1_may26 = labelSamples(c1_2026_05, 1, 'fresh sand', 2026, 5, 3, 'training', 'single pixel samples');
  var c2_may26 = labelSamples(c2_2026_05, 2, 'sand mine', 2026, 5, 2, 'training', 'single pixel samples');
  var c3_may26 = labelSamples(c3_2026_05, 3, 'wet sand', 2026, 5, 2, 'training', 'single pixel samples');
  var c4_may26 = labelSamples(c4_2026_05, 4, 'fallow', 2026, 5, 2, 'training', 'single pixel samples');
  var c5_may26 = labelSamples(c5_2026_05, 5, 'veg sand', 2026, 5, 3, 'training', 'single pixel samples');
  var c6_may26 = labelSamples(c6_2026_05, 6, 'bedrock', 2026, 5, 3, 'training', 'single pixel samples');

  var samples_may26 = c1_may26
    .merge(c2_may26)
    .merge(c3_may26)
    // .merge(c4_may26)
    // .merge(c5_may26)
    .merge(c6_may26);

  var training_may26 = extractTrainingPixels(May26, samples_may26);

  //print('Training pixels May 2026', training_may26);
}

//Jan26
{ var c1_jan26 = labelSamples(c1_2026_01, 1, 'fresh sand', 2026, 1, 3, 'training', 'single pixel samples');
  var c2_jan26 = labelSamples(c2_2026_01, 2, 'sand mine', 2026, 1, 2, 'training', 'single pixel samples');
  var c3_jan26 = labelSamples(c3_2026_01, 3, 'wet sand', 2026, 1, 2, 'training', 'single pixel samples');
  var c4_jan26 = labelSamples(c4_2026_01, 4, 'fallow', 2026, 1, 2, 'training', 'single pixel samples');
  var c5_jan26 = labelSamples(c5_2026_01, 5, 'veg sand', 2026, 1, 3, 'training', 'single pixel samples');
  var c6_jan26 = labelSamples(c6_2026_01, 6, 'bedrock', 2026, 1, 3, 'training', 'single pixel samples');

  var samples_jan26 = c1_jan26
    .merge(c2_jan26)
    .merge(c3_jan26)
    // .merge(c4_jan26)
    // .merge(c5_jan26)
    .merge(c6_jan26);

  var training_jan26 = extractTrainingPixels(Jan26, samples_jan26);

  //print('Training pixels Jan 2026', training_jan26);
}

//Mar26
{ var c1_mar26 = labelSamples(c1_2026_03, 1, 'fresh sand', 2026, 3, 3, 'training', 'single pixel samples');
  var c2_mar26 = labelSamples(c2_2026_03, 2, 'sand mine', 2026, 3, 2, 'training', 'single pixel samples');
  var c3_mar26 = labelSamples(c3_2026_03, 3, 'wet sand', 2026, 3, 2, 'training', 'single pixel samples');
  var c4_mar26 = labelSamples(c4_2026_03, 4, 'fallow', 2026, 3, 2, 'training', 'single pixel samples');
  var c5_mar26 = labelSamples(c5_2026_03, 5, 'veg sand', 2026, 3, 3, 'training', 'single pixel samples');
  var c6_mar26 = labelSamples(c6_2026_03, 6, 'bedrock', 2026, 3, 3, 'training', 'single pixel samples');

  var samples_mar26 = c1_mar26
    .merge(c2_mar26)
    .merge(c3_mar26)
    // .merge(c4_mar26)
    // .merge(c5_mar26)
    .merge(c6_mar26);

  var training_mar26 = extractTrainingPixels(Mar26, samples_mar26);

  //print('Training pixels Mar 2026', training_mar26);
}

//Feb21
{ var c1_feb21 = labelSamples(c1_2021_02, 1, 'fresh sand', 2021, 2, 3, 'training', 'single pixel samples');
  var c2_feb21 = labelSamples(c2_2021_02, 2, 'sand mine', 2021, 2, 2, 'training', 'single pixel samples');
  var c3_feb21 = labelSamples(c3_2021_02, 3, 'wet sand', 2021, 2, 2, 'training', 'single pixel samples');
  var c4_feb21 = labelSamples(c4_2021_02, 4, 'fallow', 2021, 2, 2, 'training', 'single pixel samples');
  var c5_feb21 = labelSamples(c5_2021_02, 5, 'veg sand', 2021, 2, 3, 'training', 'single pixel samples');
  var c6_feb21 = labelSamples(c6_2021_02, 6, 'bedrock', 2021, 2, 3, 'training', 'single pixel samples');

  var samples_feb21 = c1_feb21
    .merge(c2_feb21)
    .merge(c3_feb21)
    // .merge(c4_feb21)
    // .merge(c5_feb21)
    .merge(c6_feb21);

  var training_feb21 = extractTrainingPixels(Feb21, samples_feb21);

  //print('Training pixels Feb 2026', training_feb21);
}

//Apr21
{ var c1_apr21 = labelSamples(c1_2021_04, 1, 'fresh sand', 2021, 4, 3, 'training', 'single pixel samples');
  var c2_apr21 = labelSamples(c2_2021_04, 2, 'sand mine', 2021, 4, 2, 'training', 'single pixel samples');
  var c3_apr21 = labelSamples(c3_2021_04, 3, 'wet sand', 2021, 4, 2, 'training', 'single pixel samples');  
  var c6_apr21 = labelSamples(c6_2021_04, 6, 'bedrock', 2021, 4, 3, 'training', 'single pixel samples');

  var samples_apr21 = c1_apr21
    .merge(c2_apr21)
    .merge(c3_apr21)
    .merge(c6_apr21);

  var training_apr21 = extractTrainingPixels(Apr21, samples_apr21);

  print('Training pixels April 2021', training_apr21);
}

//Jun21
{ var c1_jun21 = labelSamples(c1_2021_06, 1, 'fresh sand', 2021, 6, 3, 'training', 'single pixel samples');
  var c2_jun21 = labelSamples(c2_2021_06, 2, 'sand mine', 2021, 6, 2, 'training', 'single pixel samples');
  var c3_jun21 = labelSamples(c3_2021_06, 3, 'wet sand', 2021, 6, 2, 'training', 'single pixel samples');  
  var c6_jun21 = labelSamples(c6_2021_06, 6, 'bedrock', 2021, 6, 3, 'training', 'single pixel samples');

  var samples_jun21 = c1_jun21
    .merge(c2_jun21)
    .merge(c3_jun21)
    .merge(c6_jun21);

  var training_jun21 = extractTrainingPixels(Jun21, samples_jun21);

  print('Training pixels June 2021', training_jun21);
}

//Mar23
{
  var c1_mar23 = labelSamples(c1_2023_03, 1, 'fresh sand', 2023, 3, 3, 'training', 'single pixel sample');
  var c2_mar23 = labelSamples(c2_2023_03, 2, 'sand mine', 2023, 3, 3, 'training', 'single pixel sample');
  var c3_mar23 = labelSamples(c3_2023_03, 3, 'wet sand', 2023, 3, 3, 'training', 'single pixel sample');
  var c6_mar23 = labelSamples(c6_2023_03, 6, 'bedrock', 2023, 3, 3, 'training', 'single pixel sample');
  
  var samples_mar23 = c1_mar23
    .merge(c2_mar23)
    .merge(c3_mar23)
    .merge(c6_mar23);

  var training_mar23 = extractTrainingPixels(Mar23, samples_mar23);

  //print('Training pixels Mar 2023', training_mar23);
}


//RF training
{

var allTraining = training_may22
      .merge(training_jan22)
      .merge(training_mar22)
      .merge(training_apr25)
      .merge(training_jun25)
      .merge(training_feb25)
      .merge(training_may26)
      .merge(training_jan26)
      .merge(training_mar26)
      .merge(training_feb21)
      // // .merge(training_jun21)
      .merge(training_apr21)
      .merge(training_mar23);

print("All training points", allTraining);

var random = allTraining.randomColumn({
  columnName: 'random',
  seed: 42
});

var trainSet = random.filter(ee.Filter.lt('random', 0.7));
var testSet = random.filter(ee.Filter.gte('random', 0.7));

print("Train set", trainSet);

var rf = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  bagFraction: 0.5,
  seed: 42
}).train({
  features: trainSet,
  classProperty: 'class_id',
  inputProperties: predictorBands
});


// var gb = ee.Classifier.smileGradientTreeBoost({
//   numberOfTrees: 100,
//   seed: 42,
//   shrinkage: 0.08,
//   maxNodes: 6
// }).train({
//   features: trainSet,
//   classProperty: 'class_id',
//   inputProperties: predictorBands
// })

}

//Validation
{ var validated = testSet.classify(rf);
  var errorMatrix = validated.errorMatrix('class_id', 'classification');
  print('Confusion matrix', errorMatrix);
  print('Overall accuracy', errorMatrix.accuracy());
  print('Producer accuracy', errorMatrix.producersAccuracy());
  print('User accuracy', errorMatrix.consumersAccuracy());
}

//Function for classifying the maps

//sieve
function sieve(image, minPatchSize, eightConnected) {
  eightConnected = eightConnected === undefined ? true : eightConnected;

  var originalMask = image.mask();   // remember what was actually classified

  var patchSize = image.connectedPixelCount({
    maxSize: 128,
    eightConnected: eightConnected
  });

  var majorPatches = image.updateMask(patchSize.gte(minPatchSize));

  var filled = majorPatches.focalMode({
    radius: 1,
    kernelType: 'square',
    units: 'pixels',
    iterations: 2
  });

  return majorPatches.unmask(filled)
    .updateMask(originalMask)       
    .rename(image.bandNames());
}

function classify (image){
  var classified = image
    .select(predictorBands)
    .classify(rf)
    .remap([1, 2, 3, 6], [1, 2, 3, 4])
    .rename('sand_class');

  return sieve(classified, 9, true);   // minPatchSize=9 pixels, 8-connected
}

//Classifying all images
{
  var classifiedJan21 = classify(Jan21);
  var classifiedFeb21 = classify(Feb21);
  var classifiedMar21 = classify(Mar21);
  var classifiedApr21 = classify(Apr21);
  var classifiedMay21 = classify(May21);
  var classifiedJun21 = classify(Jun21);
  
  var classifiedJan22 = classify(Jan22);
  var classifiedFeb22 = classify(Feb22);
  var classifiedMar22 = classify(Mar22);
  var classifiedApr22 = classify(Apr22);
  var classifiedMay22 = classify(May22);
  var classifiedJun22 = classify(Jun22);
  
  var classifiedJan23 = classify(Jan23);
  var classifiedFeb23 = classify(Feb23);
  var classifiedMar23 = classify(Mar23);
  var classifiedApr23 = classify(Apr23);
  var classifiedMay23 = classify(May23);
  var classifiedJun23 = classify(Jun23);
  
  var classifiedJan24 = classify(Jan24);
  var classifiedFeb24 = classify(Feb24);
  var classifiedMar24 = classify(Mar24);
  var classifiedApr24 = classify(Apr24);
  var classifiedMay24 = classify(May24);
  var classifiedJun24 = classify(Jun24);
  
  var classifiedJan25 = classify(Jan25);
  var classifiedFeb25 = classify(Feb25);
  var classifiedMar25 = classify(Mar25);
  var classifiedApr25 = classify(Apr25);
  var classifiedMay25 = classify(May25);
  var classifiedJun25 = classify(Jun25);
  var classifiedOct25 = classify(Oct25);
  
  var classifiedJan26 = classify(Jan26);
  var classifiedFeb26 = classify(Feb26);
  var classifiedMar26 = classify(Mar26);
  var classifiedApr26 = classify(Apr26);
  var classifiedMay26 = classify(May26);
  var classifiedJun26 = classify(Jun26);
}

//Adding classified layers to map to inspect
{
  // Map.addLayer(classifiedJan21, sandViz, "Classified Jan 21");
  // Map.addLayer(classifiedFeb21, sandViz, "Classified Feb 21");
  // Map.addLayer(classifiedMar21, sandViz, "Classified Mar 21");
  // Map.addLayer(classifiedApr21, sandViz, "Classified Apr 21");
  // Map.addLayer(classifiedMay21, sandViz, "Classified May 21");
  // Map.addLayer(classifiedJun21, sandViz, "Classified Jun 21");  
  
  // Map.addLayer(classifiedJan22, sandViz, "Classified Jan 22");
  // Map.addLayer(classifiedFeb22, sandViz, "Classified Feb 22");
  // Map.addLayer(classifiedMar22, sandViz, "Classified Mar 22");
  // Map.addLayer(classifiedApr22, sandViz, "Classified Apr 22");
  // Map.addLayer(classifiedMay22, sandViz, "Classified May 22");
  // Map.addLayer(classifiedJun22, sandViz, "Classified Jun 22");
  
  // Map.addLayer(classifiedJan23, sandViz, "Classified Jan 23");
  // Map.addLayer(classifiedFeb23, sandViz, "Classified Feb 23");
  // Map.addLayer(classifiedMar23, sandViz, "Classified Mar 23");
  // Map.addLayer(classifiedApr23, sandViz, "Classified Apr 23");
  // Map.addLayer(classifiedMay23, sandViz, "Classified May 23");
  // Map.addLayer(classifiedJun23, sandViz, "Classified Jun 23");
  
  // Map.addLayer(classifiedJan24, sandViz, "Classified Jan 24");
  // Map.addLayer(classifiedFeb24, sandViz, "Classified Feb 24");
  // Map.addLayer(classifiedMar24, sandViz, "Classified Mar 24");
  // Map.addLayer(classifiedApr24, sandViz, "Classified Apr 24");
  // Map.addLayer(classifiedMay24, sandViz, "Classified May 24");
  // Map.addLayer(classifiedJun24, sandViz, "Classified Jun 24");
  
  // Map.addLayer(classifiedJan25, sandViz, "Classified Jan 25");
  // Map.addLayer(classifiedFeb25, sandViz, "Classified Feb 25");
  // Map.addLayer(classifiedMar25, sandViz, "Classified Mar 25");
  // Map.addLayer(classifiedApr25, sandViz, "Classified Apr 25");
  // Map.addLayer(classifiedMay25, sandViz, "Classified May 25");
  // Map.addLayer(classifiedJun25, sandViz, "Classified Jun 25");
  Map.addLayer(classifiedOct25, sandViz, "Classified Oct25")
  
  // Map.addLayer(classifiedJan26, sandViz, "Classified Jan 26");
  // Map.addLayer(classifiedFeb26, sandViz, "Classified Feb 26");
  //Map.addLayer(classifiedMar26, sandViz, "Classified Mar 26");
  // Map.addLayer(classifiedApr26, sandViz, "Classified Apr 26");
  // Map.addLayer(classifiedMay26, sandViz, "Classified May 26");
  // Map.addLayer(classifiedJun26, sandViz, "Classified Jun 26");
}

//Get all the area stats out into a CSV from each of the classified maps
{
  
var classNameDict = ee.Dictionary({
  '1': 'fresh sand',
  '2': 'sand mine',
  '3': 'wet sand',
  '4': 'bedrock'
});

function classStatsToFeatures(classifiedImage, year, month, region, scale) {
  var areaImage = ee.Image.pixelArea().addBands(classifiedImage.select('sand_class'));

  var combinedReducer = ee.Reducer.sum().combine({
    reducer2: ee.Reducer.count(),
    sharedInputs: true
  }).group({
    groupField: 1,
    groupName: 'class_id'
  });

  var stats = areaImage.reduceRegion({
    reducer: combinedReducer,
    geometry: region,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  });

  var groups = ee.List(stats.get('groups'));

  return ee.FeatureCollection(groups.map(function(g) {
    g = ee.Dictionary(g);
    var classId = ee.Number(g.get('class_id'));
    return ee.Feature(null, {
      'year': year,
      'month': month,
      'class_id': classId,
      'class_name': classNameDict.get(classId.format()),
      'pixel_count': g.get('count'),
      'area_m2': g.get('sum'),
      'area_ha': ee.Number(g.get('sum')).divide(10000)
    });
  }));
}

var classifiedImages = [
  {image: classifiedJan21, year: 2021, month: 1},
  {image: classifiedFeb21, year: 2021, month: 2},
  {image: classifiedMar21, year: 2021, month: 3},
  {image: classifiedApr21, year: 2021, month: 4},
  {image: classifiedMay21, year: 2021, month: 5},
  {image: classifiedJun21, year: 2021, month: 6},

  {image: classifiedJan22, year: 2022, month: 1},
  {image: classifiedFeb22, year: 2022, month: 2},
  {image: classifiedMar22, year: 2022, month: 3},
  {image: classifiedApr22, year: 2022, month: 4},
  {image: classifiedMay22, year: 2022, month: 5},
  {image: classifiedJun22, year: 2022, month: 6},

  {image: classifiedJan23, year: 2023, month: 1},
  {image: classifiedFeb23, year: 2023, month: 2},
  {image: classifiedMar23, year: 2023, month: 3},
  {image: classifiedApr23, year: 2023, month: 4},
  {image: classifiedMay23, year: 2023, month: 5},
  {image: classifiedJun23, year: 2023, month: 6},

  {image: classifiedJan24, year: 2024, month: 1},
  {image: classifiedFeb24, year: 2024, month: 2},
  {image: classifiedMar24, year: 2024, month: 3},
  {image: classifiedApr24, year: 2024, month: 4},
  {image: classifiedMay24, year: 2024, month: 5},
  {image: classifiedJun24, year: 2024, month: 6},

  {image: classifiedJan25, year: 2025, month: 1},
  {image: classifiedFeb25, year: 2025, month: 2},
  {image: classifiedMar25, year: 2025, month: 3},
  {image: classifiedApr25, year: 2025, month: 4},
  {image: classifiedMay25, year: 2025, month: 5},
  {image: classifiedJun25, year: 2025, month: 6},

  {image: classifiedJan26, year: 2026, month: 1},
  {image: classifiedFeb26, year: 2026, month: 2},
  {image: classifiedMar26, year: 2026, month: 3},
  {image: classifiedApr26, year: 2026, month: 4},
  {image: classifiedMay26, year: 2026, month: 5},
  {image: classifiedJun26, year: 2026, month: 6}
];

var allClassStats = ee.FeatureCollection(
  classifiedImages.map(function(entry) {
    return classStatsToFeatures(entry.image, entry.year, entry.month, river, 10);
  })
).flatten();

print('Class stats for all maps', allClassStats);

Export.table.toDrive({
  collection: allClassStats,
  description: 'sand-class-area-stats-2021-2026',
  fileFormat: 'CSV',
  selectors: ['year', 'month', 'class_id', 'class_name', 'pixel_count', 'area_m2', 'area_ha']
});

}
