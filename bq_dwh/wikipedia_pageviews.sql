CREATE OR REPLACE VIEW wikipedia_pageviews AS
SELECT datehour, wiki, views
FROM `bigquery-public-data.wikipedia.pageviews_*`