function buildSqlQuery(query, dateRange, dimensionFilters)
{
    if (query.unionQueries.length == 1)
    {
        return buildSqlQueryForQuery(query, dateRange, dimensionFilters, '', query.unionQueries[0]);
    }
    else
    {
        var queries = [];

        query.unionQueries.forEach(function(unionQuery) {
            queries.push(
                buildSqlQueryForQuery(query, dateRange, dimensionFilters, '\t', unionQuery)
            );
        });

        return '\n' + queries.join('\n\n\tUNION ALL\n\n') + '\n';
    }
}

function buildSqlQueryForQuery(query, dateRange, dimensionFilters, prefixTabs, unionQuery)
{
    var select = buildSqlSelect(query, unionQuery);
    var whereConditions = [];

    // add filters from union query
    unionQuery.where.forEach(function(where)
    {
        whereConditions.push(where.sqlConditionExpression);
    });

    // add filters from query date range
    if (unionQuery.dateDimension)
    {
        var dateRange = buildDateRangeWhere(dateRange, unionQuery);
        if (dateRange.length > 0)
            whereConditions = whereConditions.concat(dateRange);
    }

    // add where conditions from query dimension filters
    whereConditions = whereConditions.concat(buildDimensionFilterWhere(dimensionFilters, unionQuery));

    var sqlQuery = prefixTabs+'SELECT\n\t'+prefixTabs+select.selectSection.join(',\n\t'+prefixTabs);

    // self-protection check
    if (unionQuery.sqlTable === undefined) throw 'Build query self-protection check: SQL table not set. Union Query: '+JSON.stringify(unionQuery);

    sqlQuery += '\n'+prefixTabs+'FROM `'+unionQuery.sqlTable+'` AS '+unionQuery.sqlAlias;

    if (unionQuery.joins.length > 0)
    {
        // self-protection check
        unionQuery.joins.forEach(function(j) {
            if (j.table === undefined) throw 'Build query self-protection check: SQL table for join not set. Join: '+JSON.stringify(j);
        });

        unionQuery.joins.forEach(function(j) {
            sqlQuery += '\n'+prefixTabs+j.type.toUpperCase()+' JOIN '+j.table+' AS '+j.alias+' ON '+j.onClause;
        });
    }

    if (whereConditions.length > 0)
        sqlQuery += '\n'+prefixTabs+'WHERE\n\t'+prefixTabs+'('+whereConditions.join(') AND\n\t'+prefixTabs+'(')+')'
    
    if (select.groupBySection.length > 0)
        sqlQuery += '\n'+prefixTabs+'GROUP BY\n\t'+prefixTabs+select.groupBySection.join(',\n\t'+prefixTabs);

    return sqlQuery;
}

function formatSqlAlias(field)
{
    var alias;
    if (field.functionName)
        alias = field.name + '__' + field.functionName;
    else
        alias = field.name;

    return alias.replace(/[\W_]/g,'_');
}

function buildSqlSelect(query, unionQuery)
{
    var sqlSelectFields = [];
    var sqlGroupFields = [];

    query.requestedFields.forEach(function(field) {
        if (!query.fieldMapToDataset[field.name].includes(unionQuery.name))
        {
            sqlSelectFields.push('NULL AS '+formatSqlAlias(field));
            return;
        }

        if (field.type == 'Dimension')
        {
            var queryDimension = unionQuery.usedDimensions.find(function(d){
                if (field.functionName == null) {return d.name == field.name}
                else {return d.name == field.name + '__' + field.functionName}
            });
            if (!queryDimension)
                throw 'Could not find used dimension '+field.name+' in dataset '+unionQuery.name;

            var sqlSelectSection = null;
            var sqlGroupSection = null;

            sqlGroupSection = queryDimension.sqlColumnExpression;
            if (queryDimension.sqlColumnExpression.endsWith('.'+field.name))
                sqlSelectSection = queryDimension.sqlColumnExpression;
            else
                sqlSelectSection = queryDimension.sqlColumnExpression+' AS '+formatSqlAlias(field);

            sqlSelectFields.push(sqlSelectSection);
            sqlGroupFields.push(sqlGroupSection);
        }
        else if (field.type == 'Metric')
        {
            var queryMeasure = unionQuery.usedMeasures.find(function (um){return um.name == field.name});
            if (!queryMeasure)
                throw 'Could not find used measure '+field.name+' in dataset '+unionQuery.name;

            switch (queryMeasure.aggregation)
            {
                case 'Avg':
                    sqlSelectFields.push('AVG('+queryMeasure.sqlColumnExpression+') AS '+formatSqlAlias(field));
                    break;
                case 'Count':
                    sqlSelectFields.push('COUNT('+queryMeasure.sqlColumnExpression+') AS '+formatSqlAlias(field));
                    break;
                case 'CountDistinct':
                    sqlSelectFields.push('COUNT(DISTINCT '+queryMeasure.sqlColumnExpression+') AS '+formatSqlAlias(field));
                    break;
                case 'FistValue':
                    var returnNull = false;
                    if(!unionQuery.dateDimension)
                    {
                        console.info('WARNING: FirstValue aggregation for field '+field.name+' can not be used because the dataset.dateDimension property is not set!');
                        returnNull = true;
                    }
                    else
                    {
                        var dateDimension = unionQuery.usedDimensions.find(function(d) {return d.name == unionQuery.dateDimension});
                        if (dateDimension)
                            sqlSelectFields.push('FIRST_VALUE('+queryMeasure.sqlColumnExpression+') OVER (ORDER BY '+dateDimension.sqlColumnExpression+' ASC) AS '+formatSqlAlias(field));
                        else
                        {
                            console.info('WARNING: FirstValue aggregation for field '+field.name+' can not be used because the dataset.dateDimension property is set to an dimension not added to usedDimensions!');
                            returnNull = true;
                        }
                    }

                    if (returnNull)
                        // optimistic behavior: return 'NULL'
                        sqlSelectFields.push('NULL AS '+formatSqlAlias(field));
                    break;
                case 'Max':
                    sqlSelectFields.push('MAX('+queryMeasure.sqlColumnExpression+') AS '+formatSqlAlias(field));
                    break;
                case 'Min':
                    sqlSelectFields.push('MIN('+queryMeasure.sqlColumnExpression+') AS '+formatSqlAlias(field));
                    break;
                case 'Sum':
                default:
                    sqlSelectFields.push('SUM('+queryMeasure.sqlColumnExpression+') AS '+formatSqlAlias(field));
                    break;
            }
        }
        else
            throw 'Internal exception: unknown field type ' + field.type + ' for field ' + field.name;
    });

    return {
        selectSection: sqlSelectFields,
        groupBySection: sqlGroupFields
    }
}

function buildDateRangeWhere(dateRange, unionQuery)
{
    var whereConditions = [];

    if (dateRange) {
        var startDate = new Date(dateRange.startDate);
        var endDate = new Date(dateRange.endDate);

        var dateDimension = unionQuery.usedDimensions.find(function(d) {return d.name == unionQuery.dateDimension});

        if (dateDimension)
        {
            whereConditions.push(dateDimension.sqlColumnExpression + ' >= ' + parseValueToSqlString(startDate));
            whereConditions.push(dateDimension.sqlColumnExpression + ' <= ' + parseValueToSqlString(endDate));
        }
    }

    return whereConditions;
}

function parseUnknownToSchemaFieldValue(value, schemaField)
{
    switch (schemaField.dataType)
    {
        case 'NUMBER':
            return Number(value);
        case 'STRING':
            if (value == null)
                return '';
            else
                return value.toString();
        case 'BOOLEAN':
            return Boolean(value);
        default:
            return null; // TODO throw in this case an log message
    }
}

function parseValueToSqlString(value)
{
    if (typeof value === 'string' || value instanceof String)
        return "'" + value + "'";
    
    if (typeof value === 'number' && isFinite(value))
        return "'" + value.toString().replace("'", "''") + "'";

    if (typeof value === 'boolean')
    {
        if (value === true)
            return '1';
        else
            return '0';
    }

    if (value instanceof Date)
    {
        return "'" + Utilities.formatDate(new Date(value), "GMT", "yyyy-MM-dd") + "'";
    }

    if (typeof value === null)
        throw "Cast sql value 'null' to string is not possible";

    throw 'Invalid value type, can not be converted to an sql string';
}

function buildDimensionFilterWhere(dimensionFilters, unionQuery)
{
    if (!dimensionFilters)
        return [];

    var outerFilters = [];
    dimensionFilters.forEach(function(outerFilter){
        var innerFilters = [];
        outerFilter.forEach(function(filter){
            var queryField = null;
            for(var i = 0; i < unionQuery.usedDimensions.length; i++) {
                var dimension = unionQuery.usedDimensions[i];
                if (dimension.name == filter.fieldName)
                {
                    queryField = dimension;
                    break;
                }
            }
            if (queryField === null) return;
            var schemaField = queryField;

            var operator = getSqlOperator(filter.operator, filter.type);

            var sqlFieldExpression = null;
            if (queryField.type == 'Join')
                sqlFieldExpression = queryField.sourceDataSetName+'.'+filter.fieldName;
            else
                sqlFieldExpression = unionQuery.sqlAlias+'.'+filter.fieldName;
            
            var whereCondition;
            switch(filter.operator)
            {
                case 'EQUALS':
                case 'NUMERIC_GREATER_THAN':
                case 'NUMERIC_GREATER_THAN_OR_EQUAL':
                case 'NUMERIC_LESS_THAN':
                case 'NUMERIC_LESS_THAN_OR_EQUAL':
                    whereCondition = sqlFieldExpression + ' '+operator+' ' + parseValueToSqlString(parseUnknownToSchemaFieldValue(filter.values[0], schemaField));
                    break;
                case 'CONTAINS':
                    whereCondition = sqlFieldExpression + ' '+operator+' "%' + parseUnknownToSchemaFieldValue(filter.values[0], schemaField).toString()+'%"';
                    break;
                case 'REGEXP_PARTIAL_MATCH':
                case 'REGEXP_EXACT_MATCH':
                    whereCondition = operator + 'REGEXP_CONTAINS('+sqlFieldExpression+', r"'+filter.value[0].toString().replace('"','""')+'")';
                    break;
                case 'IN_LIST':
                    whereCondition = sqlFieldExpression + ' '+operator+' (' + filter.values.map(function(v)
                    {
                        return parseValueToSqlString(parseUnknownToSchemaFieldValue(v, schemaField));
                    }).join(',') +')';
                    break;
                case 'IS_NULL':
                    whereCondition = sqlFieldExpression + ' '+operator;
                    break;
                case 'BETWEEN':
                    whereCondition = sqlFieldExpression + ' '+operator+' '+parseValueToSqlString(parseUnknownToSchemaFieldValue(filter.values[0], schemaField))
                        +' AND '+parseValueToSqlString(parseUnknownToSchemaFieldValue(filter.values[1], schemaField));
                    break;
                default:
                    throw 'Not supported filter operator: '+filter.operator;
            }

            innerFilters.push(whereCondition);
        });

        if (innerFilters.length == 1)
            outerFilters.push(innerFilters[0]);
        else if (innerFilters.length > 1)
            outerFilters.push('('+innerFilters.join(') OR (')+')');
    });

    return outerFilters;
}

function getSqlOperator(operator, type)
{
    switch(operator)
    {
        case 'EQUALS':
            switch (type)
            {
                case 'INCLUDE': return '=';
                case 'EXCLUDE': return '<>';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'CONTAINS':
            switch (type)
            {
                case 'INCLUDE': return 'LIKE';
                case 'EXCLUDE': return 'NOT LIKE';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'REGEXP_PARTIAL_MATCH':
        case 'REGEXP_EXACT_MATCH':
            switch (type)
            {
                case 'INCLUDE': return '';
                case 'EXCLUDE': return 'NOT ';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'IN_LIST':
            switch (type)
            {
                case 'INCLUDE':
                    return 'IN';
                case 'EXCLUDE':
                    return 'NOT IN';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'IS_NULL':
            switch (type)
            {
                case 'INCLUDE': return 'IS NULL';
                case 'EXCLUDE': return 'IS NOT NULL';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'BETWEEN':
            switch (type)
            {
                case 'INCLUDE': return 'BETWEEN';
                case 'EXCLUDE': return 'NOT BETWEEN';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'NUMERIC_GREATER_THAN':
            switch (type)
            {
                case 'INCLUDE': return '>';
                case 'EXCLUDE': return '<=';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'NUMERIC_GREATER_THAN_OR_EQUAL':
            switch (type)
            {
                case 'INCLUDE': return '>=';
                case 'EXCLUDE': return '<';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'NUMERIC_LESS_THAN':
            switch (type)
            {
                case 'INCLUDE': return '<';
                case 'EXCLUDE': return '>=';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        case 'NUMERIC_LESS_THAN_OR_EQUAL':
            switch (type)
            {
                case 'INCLUDE': return '<=';
                case 'EXCLUDE': return '>';
                default:
                    throw 'Unexpected value in filter type: ' + type;
            }
        default:
            throw 'Not supported filter operator: ' + operator;
    }
}
