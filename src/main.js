var cc = DataStudioApp.createCommunityConnector();

// https://developers.google.com/datastudio/connector/reference#getconfig
function getConfig() {
    var config = cc.getConfig();

    config.setDateRangeRequired(true);

    return config.build();
}

// https://developers.google.com/datastudio/connector/reference#getschema
function getSchema() {
    return { 'schema': getSchemaFields().build() };
}

// https://developers.google.com/datastudio/connector/reference#isadminuser
function isAdminUser() {
    return config().debugMode;
}

// https://developers.google.com/datastudio/connector/reference#getdata
function getData(request) {
    if (config().debugMode)
    {
        console.info('getData:\n'+JSON.stringify(request))
    }

    var dataSchema = prepareDataSchemaFromRequest(request);
    var query = parseDataSchema(dataSchema);

    var sqlQuery = buildSqlQuery(query, request.dateRange, request.dimensionsFilters);

    if (config().debugMode)
    {
        console.info('SQL Query:\n'+sqlQuery);
    }

    var authToken = ScriptApp.getOAuthToken();

    //var bqTypes = DataStudioApp.createCommunityConnector().BigQueryParameterType;
    var configuration = DataStudioApp.createCommunityConnector().newBigQueryConfig()
        // BigQuery billing project's Id.
        .setBillingProjectId(config().bigQueryProjectId)
        // The query that will be executed.
        .setQuery(sqlQuery)
        // Set to `true` to use StandardSQL.
        .setUseStandardSql(true)
        // The accessToken used for service execution.
        .setAccessToken(authToken)
        // Adding a `STRING` query parameter. Other supported types are `BOOL`,
        // `FLOAT64`, and `INT64`.
        //.addQueryParameter('myUrlParameterName', bqTypes.STRING, 'myUrlParameterValue')
        .build();
    return configuration;
}
