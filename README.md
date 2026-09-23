# river-sand-timeseries
Updated workflow for tracking changes in sand-based riverine habitats.

Add the following imports into the .js code on GEE:
- river: your river shapefile
- S2: ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
- csPlus: ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED")

In addition, add training points based on your naming convention as geometries. 
Make sure that the training points are in the FeatureCollection format, with the property named 'class'.
The name of this property must be consistent across all the training points.
Number the 'class' value correctly for each respective class across the month-years of sample collection

The output from the code is a CSV file with the areas of the landcover classes for each month-year classified. 
