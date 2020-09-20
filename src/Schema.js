/**
 * Returns the schema definition from the URL defined in the config.
 * @returns {object}
 */
function getExtendedSchemaDefinition()
{
    var options = {
        'method': 'GET',
        'contentType': 'application/json',
        'headers': {
            // we want to make sure that we always get the current version
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    };

    var response = UrlFetchApp.fetch(config().schemaUrl, options);
    if (response.getResponseCode() != 200)
        throw "Could not retrive schema from url!";

    var schema = JSON.parse(response.getContentText());

    return schema;
}

/**
 * Returns the Google Data Studio semantic type from a type string.
 * 
 * See also: https://developers.google.com/datastudio/connector/reference#semantictype
 * @param {string} typeString
 */
function getSemanticTypeFromString(typeString)
{
    var types = cc.FieldType;
    var type;
    switch(typeString)
    {
        case "YEAR": type = types.YEAR; break;
        case "YEAR_QUARTER": type = types.YEAR_QUARTER; break;
        case "YEAR_MONTH": type = types.YEAR_MONTH; break;
        case "YEAR_WEEK": type = types.YEAR_WEEK; break;
        case "YEAR_MONTH_DAY": type = types.YEAR_MONTH_DAY; break;
        case "YEAR_MONTH_DAY_H": type = types.YEAR_MONTH_DAY_H; break;
        case "YEAR_MONTH_DAY_S": type = types.YEAR_MONTH_DAY_S; break;
        case "QUARTER": type = types.QUARTER; break;
        case "MONTH": type = types.MONTH; break;
        case "WEEK": type = types.WEEK; break;
        case "MONTH_DAY": type = types.MONTH_DAY; break;
        case "DAY_OF_WEEK": type = types.DAY_OF_WEEK; break;
        case "DAY": type = types.DAY; break;
        case "HOUR": type = types.HOUR; break;
        case "MINUTE": type = types.MINUTE; break;
        case "DURATION": type = types.DURATION; break;
        case "COUNTRY": type = types.COUNTRY; break;
        case "COUNTRY_CODE": type = types.COUNTRY_CODE; break;
        case "CONTINENT": type = types.CONTINENT; break;
        case "CONTINENT_CODE": type = types.CONTINENT_CODE; break;
        case "SUB_CONTINENT": type = types.SUB_CONTINENT; break;
        case "SUB_CONTINENT_CO": type = types.SUB_CONTINENT_CO; break;
        case "REGION": type = types.REGION; break;
        case "REGION_CODE": type = types.REGION_CODE; break;
        case "CITY": type = types.CITY; break;
        case "CITY_CODE": type = types.CITY_CODE; break;
        case "METRO_CODE": type = types.METRO_CODE; break;
        case "LATITUDE_LONGITU": type = types.LATITUDE_LONGITU; break;
        case "NUMBER": type = types.NUMBER; break;
        case "PERCENT": type = types.PERCENT; break;
        case "TEXT": type = types.TEXT; break;
        case "BOOLEAN": type = types.BOOLEAN; break;
        case "URL": type = types.URL; break;

        // currency types: https://developers.google.com/datastudio/connector/reference#data-studio-service_3
        case "CURRENCY_AED": type = types.CURRENCY_AED; break;
        case "CURRENCY_ALL": type = types.CURRENCY_ALL; break;
        case "CURRENCY_ARS": type = types.CURRENCY_ARS; break;
        case "CURRENCY_AUD": type = types.CURRENCY_AUD; break;
        case "CURRENCY_BDT": type = types.CURRENCY_BDT; break;
        case "CURRENCY_BGN": type = types.CURRENCY_BGN; break;
        case "CURRENCY_BOB": type = types.CURRENCY_BOB; break;
        case "CURRENCY_BRL": type = types.CURRENCY_BRL; break;
        case "CURRENCY_CAD": type = types.CURRENCY_CAD; break;
        case "CURRENCY_CDF": type = types.CURRENCY_CDF; break;
        case "CURRENCY_CHF": type = types.CURRENCY_CHF; break;
        case "CURRENCY_CLP": type = types.CURRENCY_CLP; break;
        case "CURRENCY_CNY": type = types.CURRENCY_CNY; break;
        case "CURRENCY_COP": type = types.CURRENCY_COP; break;
        case "CURRENCY_CRC": type = types.CURRENCY_CRC; break;
        case "CURRENCY_CZK": type = types.CURRENCY_CZK; break;
        case "CURRENCY_DKK": type = types.CURRENCY_DKK; break;
        case "CURRENCY_DOP": type = types.CURRENCY_DOP; break;
        case "CURRENCY_EGP": type = types.CURRENCY_EGP; break;
        case "CURRENCY_ETB": type = types.CURRENCY_ETB; break;
        case "CURRENCY_EUR": type = types.CURRENCY_EUR; break;
        case "CURRENCY_GBP": type = types.CURRENCY_GBP; break;
        case "CURRENCY_HKD": type = types.CURRENCY_HKD; break;
        case "CURRENCY_HRK": type = types.CURRENCY_HRK; break;
        case "CURRENCY_HUF": type = types.CURRENCY_HUF; break;
        case "CURRENCY_IDR": type = types.CURRENCY_IDR; break;
        case "CURRENCY_ILS": type = types.CURRENCY_ILS; break;
        case "CURRENCY_INR": type = types.CURRENCY_INR; break;
        case "CURRENCY_IRR": type = types.CURRENCY_IRR; break;
        case "CURRENCY_ISK": type = types.CURRENCY_ISK; break;
        case "CURRENCY_JMD": type = types.CURRENCY_JMD; break;
        case "CURRENCY_JPY": type = types.CURRENCY_JPY; break;
        case "CURRENCY_KRW": type = types.CURRENCY_KRW; break;
        case "CURRENCY_LKR": type = types.CURRENCY_LKR; break;
        case "CURRENCY_LTL": type = types.CURRENCY_LTL; break;
        case "CURRENCY_MNT": type = types.CURRENCY_MNT; break;
        case "CURRENCY_MVR": type = types.CURRENCY_MVR; break;
        case "CURRENCY_MXN": type = types.CURRENCY_MXN; break;
        case "CURRENCY_MYR": type = types.CURRENCY_MYR; break;
        case "CURRENCY_NOK": type = types.CURRENCY_NOK; break;
        case "CURRENCY_NZD": type = types.CURRENCY_NZD; break;
        case "CURRENCY_PAB": type = types.CURRENCY_PAB; break;
        case "CURRENCY_PEN": type = types.CURRENCY_PEN; break;
        case "CURRENCY_PHP": type = types.CURRENCY_PHP; break;
        case "CURRENCY_PKR": type = types.CURRENCY_PKR; break;
        case "CURRENCY_PLN": type = types.CURRENCY_PLN; break;
        case "CURRENCY_RON": type = types.CURRENCY_RON; break;
        case "CURRENCY_RSD": type = types.CURRENCY_RSD; break;
        case "CURRENCY_RUB": type = types.CURRENCY_RUB; break;
        case "CURRENCY_SAR": type = types.CURRENCY_SAR; break;
        case "CURRENCY_SEK": type = types.CURRENCY_SEK; break;
        case "CURRENCY_SGD": type = types.CURRENCY_SGD; break;
        case "CURRENCY_THB": type = types.CURRENCY_THB; break;
        case "CURRENCY_TRY": type = types.CURRENCY_TRY; break;
        case "CURRENCY_TWD": type = types.CURRENCY_TWD; break;
        case "CURRENCY_TZS": type = types.CURRENCY_TZS; break;
        case "CURRENCY_UAH": type = types.CURRENCY_UAH; break;
        case "CURRENCY_USD": type = types.CURRENCY_USD; break;
        case "CURRENCY_UYU": type = types.CURRENCY_UYU; break;
        case "CURRENCY_VEF": type = types.CURRENCY_VEF; break;
        case "CURRENCY_VND": type = types.CURRENCY_VND; break;
        case "CURRENCY_YER": type = types.CURRENCY_YER; break;
        case "CURRENCY_ZAR": type = types.CURRENCY_ZAR; break;
        default:
            throw 'Unknown semantic type: '+typeString;
    }
    return type;
}

/**
 * Returns the Google Data Studio aggregation type from a type string.
 * 
 * See also: https://developers.google.com/datastudio/connector/reference#defaultaggregationtype
 * @param {string} aggregationString 
 */
function getAggregationFromString(aggregationString)
{
    var aggregations = cc.AggregationType;
    var aggregationType;
    switch (aggregationString)
    {
        case "Auto": aggregationType = aggregations.AUTO; break;
        case "Avg": aggregationType = aggregations.AVG; break;
        case "Count": aggregationType = aggregations.SUM; break;
        case "CountDistinct": aggregationType = aggregations.SUM; break;
        case "FirstValue": aggregationType = aggregations.NONE; break;
        case "Max": aggregationType = aggregations.MAX; break;
        case "Min": aggregationType = aggregations.MIN; break;
        case "Sum": aggregationType = aggregations.SUM; break;
        //case "COUNT": aggregationType = aggregations.COUNT; break;
        //case "COUNT_DISTINCT": aggregationType = aggregations.COUNT_DISTINCT; break;
        default:
            throw 'Unknown aggregation type: '+aggregationString;
    }
    return aggregationType;
}

/**
 * Create the DataStudio fields from the schema definition.
 * @returns {object}
 */
function getSchemaFields()
{
    var fields = cc.getFields();
    var types = cc.FieldType;
    var aggregations = cc.AggregationType;

    var schemaDefinition = getExtendedSchemaDefinition();

    if (schemaDefinition)
    {
        if (schemaDefinition.dimensions)
        {
            // add all dimensions
            schemaDefinition.dimensions.forEach(function(dim)
            {
                if (dim.hidePrimaryKeyAttribute != true)
                {
                    var type;
                    if (dim.type)
                        type = getSemanticTypeFromString(dim.type);
                    else
                        type = types.TEXT;

                    var newDimension = fields.newDimension()
                        .setId(dim.id)
                        .setName(dim.name);

                    if (dim.description) newDimension = newDimension.setDescription(dim.description);

                    newDimension = newDimension
                        .setType(type)

                    if (dim.visible) newDimension = newDimension.setIsHidden(!dim.visible)
                    if (dim.group) newDimension = newDimension.setGroup(dim.group)
                }

                if (dim.attributes)
                {
                    dim.attributes.forEach(function(dimAttr)
                    {
                        var type;
                        if (dimAttr.type)
                            type = getSemanticTypeFromString(dimAttr.type);
                        else
                            type = types.TEXT;

                        var newDimension = fields.newDimension()
                            .setId(dim.id + '__' + dimAttr.id)
                            .setName(dimAttr.name);

                        if (dimAttr.description) newDimension = newDimension.setDescription(dimAttr.description);

                        newDimension = newDimension
                            .setType(type);

                        if (dimAttr.visible === false || dim.visible === false)
                            newDimension = newDimension.setIsHidden(true);
                        if (dimAttr.group)
                            newDimension = newDimension.setGroup(dimAttr.group);
                        else
                            newDimension = newDimension.setGroup(dim.group);
                    });
                }
            });
        }

        if (schemaDefinition.datasets)
        {
            schemaDefinition.datasets.forEach(function(dataset)
            {
                if (dataset.measures)
                {
                    dataset.measures.forEach(function(measure)
                    {
                        var type;
                        if (measure.type)
                            type = getSemanticTypeFromString(measure.type);
                        else
                            type = types.NUMBER;

                        var aggregation;
                        if (measure.aggregation)
                            aggregation = getAggregationFromString(measure.aggregation);
                        else
                            aggregation = aggregations.AUTO;

                        var newMeasure = fields.newMetric()
                            .setId(measure.id)
                            .setName(measure.name)

                        if (measure.description) newMeasure = newMeasure.setDescription(measure.description);

                        newMeasure = newMeasure.setType(type)
                        if (typeof aggregation !== 'undefined')
                            newMeasure = newMeasure.setAggregation(aggregation);

                        if (measure.visible === false) newMeasure = newMeasure.setIsHidden(true);
                        if (measure.group) newMeasure = newMeasure.setGroup(measure.group);
                    });
                }
            });
        }

        if (schemaDefinition.metrics)
        {
            schemaDefinition.metrics.forEach(function(metric)
            {
                var type;
                if (metric.type)
                    type = getSemanticTypeFromString(metric.type);
                else
                    type = types.NUMBER;

                var newMetric = fields.newMetric()
                    .setId(metric.id)
                    .setName(metric.name);

                if (metric.description) newMetric = newMetric.setDescription(metric.description);

                newMetric = newMetric
                    .setFormula(metric.formula)
                    .setType(type);

                if (typeof metric.aggregation !== 'undefined' && metric.aggregation != "None")
                {
                    aggregation = getAggregationFromString(metric.aggregation);
                    if (typeof aggregation !== 'undefined')
                        newMetric = newMetric.setAggregation(aggregation);
                }
                if (metric.visible === false) newMetric = newMetric.setIsHidden(true);
                if (metric.group) newMetric = newMetric.setGroup(metric.group);
            });
        }
    }

    if (schemaDefinition.defaultMetric)
        fields.setDefaultMetric(schemaDefinition.defaultMetric)
    if (schemaDefinition.defaultDimension)
        fields.setDefaultDimension(schemaDefinition.defaultDimension);

    return fields;
}