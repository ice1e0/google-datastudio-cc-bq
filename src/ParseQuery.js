/**
 * create an array with the field schema definition for the request. The index of the request
 * field matches the index in the result array
 * 
 * @param {object} request The DataStudio request given from the getData(request) function
 */
function prepareDataSchemaFromRequest(request)
{
    // Prepare the schema for the fields requested.
    var dataSchema = [];
    var fixedSchema = getSchema().schema;

    request.fields.forEach(function(field) {
      for (var i = 0; i < fixedSchema.length; i++) {
        if (fixedSchema[i].name == field.name) {
          dataSchema.push(fixedSchema[i]);
          break;
        }
      }
    });

    return dataSchema;
}

function newUnionQuery(dataset)
{
    var sqlAlias = dataset.name;
    var where = [];
    if (dataset.where)
    {
        dataset.where.forEach(function(where){
            var sqlConditionExpression = where.sqlColumnExpression
                .replace(/\$THIS/g, sqlAlias);
            where.push(newUnionQueryWhereCondition(sqlConditionExpression, null))
        });
    }

    if (config().debugMode)
    {
        return {
            name: dataset.name,
            sqlAlias: sqlAlias,
            sqlTable: dataset.sqlTable,
            joins: [],
            dateDimension: dataset.dateDimension,
            usedMeasures: [],
            usedDimensions: [],
            where: where,
            clonedUnionQueries: [],
            internalSchemaDefinition: dataset
        };
    }
    else
    {
        return {
            name: dataset.name,
            sqlAlias: sqlAlias,
            sqlTable: dataset.sqlTable,
            joins: [],
            dateDimension: dataset.dateDimension,
            usedMeasures: [],
            usedDimensions: [],

            // where conditions which apply to this union query
            where: where,

            // a 'cloned union query' is an additional union query with all the dimensions and joins of the main union query;
            // they are required to support measures with a 'where' filter
            clonedUnionQueries: []
        };
    }
}
function newClonedUnionQuery(dataset, measure)
{
    return {
        name: dataset.name+'_'+measure.id,
        sqlAlias: dataset.name,
        joins: [],
        usedMeasures: [],
        usedDimensions: [],
        where: []
    };
}
function newUnionQueryWhereCondition(sqlConditionExpression, dimensionId)
{
    return {
        sqlConditionExpression: sqlConditionExpression,
        dimension: dimensionId
    };
}
function newUnionQueryUsedDimension(dimension, attribute, sqlColumnExpression)
{
    var name = dimension.dimension;
    if (attribute)
        name += '__' + attribute.id;

    if (config().debugMode)
    {
        return {
            name: name,
            sqlColumnExpression: sqlColumnExpression,
            internalSchemaDefinition: dimension
        };
    }
    else
    {
        return {
            name: name,
            sqlColumnExpression: sqlColumnExpression
        };
    }
}
function newUnionQueryUsedMeasure(measure, sqlColumnExpression)
{
    if (config().debugMode)
    {
        return {
            name: measure.id,
            sqlColumnExpression: sqlColumnExpression,
            aggregation: measure.aggregation,
            where: measure.where,
            internalSchemaDefinition: measure
        }
    }
    else
    {
        return {
            name: measure.id,
            sqlColumnExpression: sqlColumnExpression,
            aggregation: measure.aggregation,
            where: measure.where
        }
    }
}

function parseDataSchemaMetric(m, dataset, unionQuery, sourceSchema, fieldMapToDataset)
{
    sqlColumn = m.sqlColumn;
    if (!sqlColumn)
        sqlColumn = m.id;

    var sqlColumnExpression = null;
    if (m.sqlColumnExpression)
    {
        sqlColumnExpression = m.sqlColumnExpression
            .replace(/\$COLUMN/g, '$THIS.'+sqlColumn)
            .replace(/\$THIS/g, unionQuery.sqlAlias);
    }
    else
    {
        sqlColumnExpression = unionQuery.sqlAlias+'.'+sqlColumn;
    }

    var usedMeasure = newUnionQueryUsedMeasure(m, sqlColumnExpression)

    if (m.where && m.where.length > 0)
    {
        var clonedUnionQuery = newClonedUnionQuery(dataset, m);
        clonedUnionQuery.usedMeasures.push(usedMeasure);

        m.where.forEach(function(where){
            var sqlConditionExpression = where.sqlConditionExpression
                .replace(/\$THIS/g, unionQuery.sqlAlias);

            if (where.dimension)
            {
                var tmpArray = where.dimension.toString().split('__');
                var dimensionName = tmpArray[0];
                var attributeName = null;
                if (tmpArray.length > 1)
                    attributeName = tmpArray[1];

                var ud = unionQuery.usedDimensions.find(function(ud){return ud.name == dimensionName});
                if (!ud)
                {
                    d = dataset.dimensions.find(function(d){return d.dimension == dimensionName})
                    if (!d) throw 'SCHEMA ERROR: The measure '+m.id+' references on dimension '+dimensionName+' in the where clause, which is not referenced in the dataset '+dataset.name+'!'

                    parseDataSchemaDimension(d, dataset, clonedUnionQuery, sourceSchema, null, attributeName, unionQuery)
                    ud = clonedUnionQuery.usedDimensions.find(function(ud){return ud.name == dimensionName});
                    if (!ud) throw 'SELV_PROTECTION_CHECK: Error while parsing measure '+m.id+' referenced dimension '+dimensionName+' in dataset '+dataset.name+'!'
                }

                sqlConditionExpression = sqlConditionExpression
                    .replace(/\$DIMENSION/g, ud.sqlColumnExpression);
            }

            clonedUnionQuery.where.push(newUnionQueryWhereCondition(sqlConditionExpression, null))
        });

        if (fieldMapToDataset[m.id])
            fieldMapToDataset[m.id].push(clonedUnionQuery.name);
        else
            fieldMapToDataset[m.id] = [clonedUnionQuery.name];

        unionQuery.clonedUnionQueries.push(clonedUnionQuery);
    }
    else
    {
        if (fieldMapToDataset[m.id])
            fieldMapToDataset[m.id].push(unionQuery.name);
        else
            fieldMapToDataset[m.id] = [unionQuery.name];

        unionQuery.usedMeasures.push(usedMeasure);
    }
}

function parseDataSchemaAddJoin(unionQuery, joinType, sqlTable, alias, onClause, mainUnionQuery)
{
    if (unionQuery === undefined) throw 'Parameter unionQuery must be given, function: parseDataSchemaAddJoin';
    if (joinType === undefined) throw 'Parameter joinType must be given, function: parseDataSchemaAddJoin';
    if (sqlTable === undefined) throw 'Parameter sqlTable must be given, function: parseDataSchemaAddJoin';
    if (alias === undefined) throw 'Parameter alias must be given, function: parseDataSchemaAddJoin';
    if (onClause === undefined) throw 'Parameter onClause must be given, function: parseDataSchemaAddJoin';

    var join = null;
    if (mainUnionQuery)
        join = mainUnionQuery.joins.find(function(j){return j.alias == alias});
    if (!join)
        join = unionQuery.joins.find(function(j){return j.alias == alias});

    if (join)
    {
        if (join.table != sqlTable)
            throw 'Two joins with alias name "'+alias+'" referencing to different tables! (SQL table 1: "'+join.table+'" SQL table 2: "'+sqlTable+'")'

        if (join.onClause != onClause)
            throw 'Two joins with alias name "'+alias+'" referencing to the same sql tabe with different ON clause conditions! (ON clause 1: "'+join.onClause+'" SQL clause 2: "'+onClause+'")'
    }
    else
    {
        unionQuery.joins.push({
            type: joinType,
            table: sqlTable,
            alias: alias,
            onClause: onClause
        });
    }
}

function parseDataSchema_GetReferenceFromJoinDimension(joinDimension, dataset)
{
    if (joinDimension.type != 'Join' && joinDimension.type != 'DataSetJoin')
        throw 'parseDataSchema_GetReferenceFromJoinDimension: Wrong parameter usage "joinDimension": dimension must be of the type "Join" or "DataSetJoin"';

    var reference = null;

    if (joinDimension.sourceDataSetName)
    {
        reference = dataset.references.find(function(r) {return r.type == 'DataSetJoin' && r.dataSetName == joinDimension.sourceDataSetName;});
    }
    else if (joinDimension.reference)
    {
        reference = dataset.references.find(function(r) {
            return r.type == 'Join' && r.alias == joinDimension.reference ||
                r.type == 'DataSetJoin' && r.dataSetName == joinDimension.reference
        });
    }
    else
        throw 'Dimension '+joinDimension.name+' from type Join requires the field sourceDataSetName or reference to be given.'

    if (!reference)
        throw 'Could not find reference from dimension "'+joinDimension.name+'" in dataset "'+dataset.name+'"';

    return reference;
}
function parseDataSchema_GetReferenceFromReference(ref, dataset)
{
    if (ref === undefined) throw 'Parameter ref must be given, function: parseDataSchema_GetReferenceFromReference'
    if (dataset === undefined) throw 'Parameter dataset must be given, function: parseDataSchema_GetReferenceFromReference'

    if (ref.type != 'Join') throw 'parseDataSchema_GetReferenceFromReference: Wrong parameter usage "ref": reference must be of the type "Join"';

    var reference = null;

    if (ref.reference)
    {
        reference = dataset.references.find(function(r) {
            return r.type == 'Join' && r.alias == ref.reference ||
                   r.type == 'DataSetJoin' && r.dataSetName == ref.reference
        });
    }
    else
        throw 'Reference '+ref.name+' from type Join requires the field Reference to be given.'

    if (!reference)
        throw 'Could not find reference from reference "'+ref.name+'" in dataset "'+dataset.name+'"';

    return reference;
}

function parseDataSchema_GetAliasFromReference(reference)
{
    if (reference.type == 'Join')
        return reference.alias;
    else if (reference.type == 'DataSetJoin')
        return reference.dataSetName;
}

function parseDataSchema_AddJoins(unionQuery, dataset, reference, sqlExpressionFields, mainUnionQuery)
{
    if (unionQuery === undefined) throw 'Parameter unionQuery must be given, function: parseDataSchema_AddJoins'
    if (dataset === undefined) throw 'Parameter dataset must be given, function: parseDataSchema_AddJoins'
    if (reference === undefined) throw 'Parameter reference must be given, function: parseDataSchema_AddJoins'
    if (sqlExpressionFields === undefined) throw 'Parameter sqlExpressionFields must be given, function: parseDataSchema_AddJoins'

    var referenceJoinList = [];

    referenceJoinList.push({
        reference: reference,
        alias: sqlExpressionFields.alias
    });

    while(reference.reference)
    {
        reference = parseDataSchema_GetReferenceFromReference(reference, dataset);
        sqlExpressionFields.alias = parseDataSchema_GetAliasFromReference(reference);
        referenceJoinList.push({
            reference: reference,
            alias: reference.alias
        });
    }

    referenceJoinList.reverse();

    referenceJoinList.forEach(function(j){
        sqlExpressionFields.alias = j.alias;

        parseDataSchemaAddJoin(
            unionQuery,
            j.reference.joinType,
            j.reference.sqlTable,
            j.alias,
            j.reference.joinClause
                .toString()
                .replace(/\$THIS/g, sqlExpressionFields.thisAlias)
                .replace(/\$JOIN/g, sqlExpressionFields.alias),
            mainUnionQuery
        );
        sqlExpressionFields.thisAlias = sqlExpressionFields.alias;
    });

    return referenceJoinList[referenceJoinList.length-1]; // returns the last reference
}

function parseDataSchemaDimension(d, dataset, unionQuery, sourceSchema, fieldMapToDataset, attributeName, mainUnionQuery)
{
    if (fieldMapToDataset)
    {
        if (fieldMapToDataset[d.dimension])
            fieldMapToDataset[d.dimension].push(unionQuery.name);
        else
            fieldMapToDataset[d.dimension] = [unionQuery.name];
    }

    var sqlColumnExpression = null;
    var dimAttr = null;

    if (d.type == 'Join' || d.type == 'DataSetJoin')
    {
        var sqlExpressionFields = {
            thisAlias: null,
            alias: null
        };
        sqlExpressionFields.thisAlias = unionQuery.sqlAlias;
        var reference = parseDataSchema_GetReferenceFromJoinDimension(d, dataset);
        sqlExpressionFields.alias = parseDataSchema_GetAliasFromReference(reference);

        var sqlColumn = d.sqlColumn;
        var _sqlColumnExpression = null;

        if (reference.type == 'Join')
        {
            reference = parseDataSchema_AddJoins(unionQuery, dataset, reference, sqlExpressionFields, mainUnionQuery);

            if (!sqlColumn)
                sqlColumn = reference.sqlColumn;
            _sqlColumnExpression = reference.sqlColumnExpression;
        }
        else if (reference.type == 'DataSetJoin')
        {
            var referencedDataset = sourceSchema.datasets.find(function(c){return c.name == reference.dataSetName});
            if (!referencedDataset)
                throw 'Reference is done to a meansure group "'+reference.dataSetName+'" which could not be found'

            var referencedDimension = referencedDataset.dimensions.find(function(rcd){return rcd.dimension == d.dimension});
            if (!referencedDimension)
                throw 'Reference is done to dimension "'+d.dimension+'" to dataset "'+reference.dataSetName+'" which could not be found'

            parseDataSchemaAddJoin(
                unionQuery,
                reference.joinType,
                referencedDataset.sqlTable,
                sqlExpressionFields.alias,
                reference.joinClause
                    .toString()
                    .replace(/\$THIS/g, sqlExpressionFields.thisAlias)
                    .replace(/\$JOIN/g, sqlExpressionFields.alias),
                mainUnionQuery
            );

            if (referencedDimension.type == 'Join')
            {
                sqlExpressionFields.thisAlias = sqlExpressionFields.alias;

                reference = parseDataSchema_GetReferenceFromJoinDimension(referencedDimension, referencedDataset);
                sqlExpressionFields.alias = reference.alias;
                reference = parseDataSchema_AddJoins(unionQuery, referencedDataset, reference, sqlExpressionFields, mainUnionQuery);
            }

            if (!sqlColumn)
                sqlColumn = referencedDimension.sqlColumn;
            _sqlColumnExpression = referencedDimension.sqlColumnExpression;
        }
        else
            throw 'Unexpected or not defined reference type: '+reference.type;

        if (!sqlColumn)
            sqlColumn = d.dimension;

        if (d.sqlColumnExpression)
        {
            sqlColumnExpression = d.sqlColumnExpression
                .replace(/\$COLUMN/g, '$THIS.'+sqlColumn)
                .replace(/\$THIS/g, sqlExpressionFields.thisAlias)
                .replace(/\$JOIN/g, sqlExpressionFields.alias);
        }
        else if (_sqlColumnExpression) // sql column expression from the referenced object
        {
            sqlColumnExpression = _sqlColumnExpression
                .replace(/\$COLUMN/g, '$THIS.'+sqlColumn)
                .replace(/\$THIS/g, sqlExpressionFields.thisAlias)
                .replace(/\$JOIN/g, sqlExpressionFields.alias);
        }
        else
        {
            sqlColumnExpression = sqlExpressionFields.alias+'.'+sqlColumn;
        }
    }
    else
    {
        sqlColumn = d.sqlColumn;
        if (!sqlColumn)
            sqlColumn = d.dimension;

        if (d.sqlColumnExpression)
            sqlColumnExpression = d.sqlColumnExpression
                .replace(/\$COLUMN/g, '$THIS.'+sqlColumn)
                .replace(/\$THIS/g, unionQuery.sqlAlias);
        else
            sqlColumnExpression = unionQuery.sqlAlias+'.'+sqlColumn;
    }

    // extend column expression from dimension
    if (attributeName)
    {
        var dim = sourceSchema.dimensions.find(function(dim){return dim.id == d.dimension});
        if (dim && dim.attributes)
        {
            dimAttr = dim.attributes.find(function(a){return a.id == attributeName});
            if (dimAttr && dimAttr.sqlColumnExpression)
            {
                sqlColumnExpression = 
                    dimAttr.sqlColumnExpression
                        .replace(/\$COLUMN/g, sqlColumnExpression);
            }
        }
    }

    /* self-protection check */
    if (!sqlColumnExpression)
        throw 'Could not determine sqlColumnExpression for dimension name "'+d.dimension+'"'

    unionQuery.usedDimensions.push(newUnionQueryUsedDimension(d, dimAttr, sqlColumnExpression));
}

function findOrCreateUnionQuery(unionQueries, dataset)
{
    var unionQuery = unionQueries.find(function(i) {return i.name == dataset.name});

    if (!unionQuery)
    {
        unionQuery = newUnionQuery(dataset);
        unionQueries.push(unionQuery);
    }

    return unionQuery;
}

/**
 * creates an logic structure out of the dataSchema with help from the schema definition.
 * 
 * @param {} dataSchema
 * @returns Returns a object structure which can be parsed to SQL code
 */
function parseDataSchema(dataSchema)
{
    var sourceSchema = getExtendedSchemaDefinition();

    var metricFieldMapToDataset = {};
    var dimensionFieldMapToDataset = {};
    var requestedFields = [];
    var usedDimensions = [];
    var unionQueries = [];

    dataSchema.forEach(function(field) {
        var tmpArray = field.name.toString().split('__');
        var fieldName = tmpArray[0];
        var functionName = null;
        if (tmpArray.length > 1)
            functionName = tmpArray[1];

        if (field.semantics.conceptType == 'METRIC')
        {
            sourceSchema.datasets.forEach(function(dataset){
                var m = dataset.measures.find(function(measure){return measure.id == fieldName});
                if (!m) return;

                var unionQuery = findOrCreateUnionQuery(unionQueries, dataset);

                parseDataSchemaMetric(m, dataset, unionQuery, sourceSchema, metricFieldMapToDataset);

                requestedFields.push({
                    type: 'Metric',
                    name: fieldName,
                    functionName: functionName
                });
            });
        }
        else if (field.semantics.conceptType == 'DIMENSION')
        {
            sourceSchema.datasets.forEach(function(dataset){
                var d = dataset.dimensions.find(function(dim){return dim.dimension == fieldName});
                if (!d) return;

                var unionQuery = findOrCreateUnionQuery(unionQueries, dataset);

                parseDataSchemaDimension(d, dataset, unionQuery, sourceSchema, dimensionFieldMapToDataset, functionName, null);
            });

            requestedFields.push({
                type: 'Dimension',
                name: fieldName,
                functionName: functionName
            });

            usedDimensions.push({
                name: fieldName,
                functionName: functionName
            });
        }
        else
            throw 'Unexpected semantic concept type for field '+field.name+': ' + field.semantics.conceptType;
    });

    // add default date dimension if not already added
    unionQueries.forEach(function(unionQuery){
        if (!unionQuery.dateDimension)
            return;

        var dataset = sourceSchema.datasets.find(function(c){return c.name == unionQuery.name})
        var dim = dataset.dimensions.find(function(d){return d.dimension == unionQuery.dateDimension})
        // TODO: in this step we expect that the date dimension is a 'Regular' dimension type! (so, joins are not supported for the date dimension)
        if (dim && !unionQuery.usedDimensions.find(function(d){return d.name == dim.dimension}))
        {
            var sqlColumnExpression = null;

            var sqlColumn = dim.sqlColumn;
            if (!sqlColumn)
                sqlColumn = dim.dimension;

            if (dim.sqlColumnExpression)
                sqlColumnExpression = dim.sqlColumnExpression
                    .replace(/\$THIS/g, unionQuery.sqlAlias);
            else
                sqlColumnExpression = unionQuery.sqlAlias+'.'+sqlColumn;

            unionQuery.usedDimensions.push(newUnionQueryUsedDimension(dim, null, sqlColumnExpression));

            if (!usedDimensions.find(function (d){return d.name == dim.dimension}))
                usedDimensions.push({
                    name: dim.dimension,
                    functionName: null
                });
        }
    });

    // clone union queries
    var newUnionQueries = [];
    unionQueries.forEach(function(uq) {
        if (uq.clonedUnionQueries.length == 0) return;

        uq.clonedUnionQueries.forEach(function(cuq){
            // create union query clone
            var unionQueryClone = JSON.parse(JSON.stringify(uq));
            unionQueryClone.name = cuq.name
            unionQueryClone.joins = unionQueryClone.joins.concat(cuq.joins)
            unionQueryClone.usedMeasures = cuq.usedMeasures;
            unionQueryClone.usedDimensions = unionQueryClone.usedDimensions.concat(cuq.usedDimensions)
            unionQueryClone.where = unionQueryClone.where.concat(cuq.where)

            // (self-protection) remove unnecessary data
            unionQueryClone.usedMeasures.forEach(function(measure){
                measure.where = []
            });

            // duplicate field map to dataset
            for (var key in dimensionFieldMapToDataset)
            {
                if (dimensionFieldMapToDataset[key].includes(uq.name))
                    dimensionFieldMapToDataset[key].push(cuq.name);
            }

            newUnionQueries.push(unionQueryClone);
        });

        // (self-protection) remove information about cloned union queries
        uq.clonedUnionQueries = null;
    });
    unionQueries = unionQueries.concat(newUnionQueries);

    /* return parsed, logic query */
    return {
        requestedFields: requestedFields,
        unionQueries: unionQueries.filter(function(uq) {return uq.usedMeasures.length > 0}),
        usedDimensions: usedDimensions,
        fieldMapToDataset: Object.assign({}, metricFieldMapToDataset, dimensionFieldMapToDataset)
    };
}
